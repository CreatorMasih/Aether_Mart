import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('Redis');

// ─── Redis Abstraction Layer ──────────────────────────────────────────────────
// REDIS_ENABLED=false → all operations are no-ops (for local development)
// REDIS_ENABLED=true  → uses the real `redis` npm client
//
// This abstraction means: ZERO code changes needed to enable Redis in production.

export interface CacheService {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string | string[]): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  flush(): Promise<void>;
  isHealthy(): Promise<boolean>;
}

// ─── No-Op Cache (local dev / Redis disabled) ─────────────────────────────────

class NoOpCacheService implements CacheService {
  async get<T = unknown>(_key: string): Promise<T | null> {
    return null;
  }

  async set(_key: string, _value: unknown, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  async del(_key: string | string[]): Promise<void> {
    // No-op
  }

  async exists(_key: string): Promise<boolean> {
    return false;
  }

  async expire(_key: string, _ttlSeconds: number): Promise<void> {
    // No-op
  }

  async flush(): Promise<void> {
    // No-op
  }

  async isHealthy(): Promise<boolean> {
    return true; // No-op is always "healthy"
  }
}

// ─── Real Redis Cache Service ─────────────────────────────────────────────────

class RedisCacheService implements CacheService {
  private client: import('redis').RedisClientType | null = null;

  async connect(): Promise<void> {
    const { createClient } = await import('redis');
    this.client = createClient({ url: process.env.REDIS_URL });

    this.client.on('error', (err: Error) => {
      log.error('Redis client error', { error: err.message });
    });

    this.client.on('connect', () => {
      log.info('✅ Redis connected');
    });

    await this.client.connect();
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const raw = await this.client.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    return (await this.client.exists(key)) > 0;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, ttlSeconds);
  }

  async flush(): Promise<void> {
    if (!this.client) return;
    await this.client.flushDb();
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
    }
  }
}

// ─── Cache Key Helpers ────────────────────────────────────────────────────────

export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  store: (storeId: string) => `store:${storeId}`,
  product: (productId: string) => `product:${productId}`,
  categories: () => 'categories:all',
  nearbyStores: (lat: number, lng: number, radius: number) =>
    `stores:nearby:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`,
  trending: () => 'products:trending',
  flashDeals: () => 'products:flash-deals',
  cart: (customerId: string) => `cart:${customerId}`,
  otp: (identifier: string) => `otp:${identifier}`,
} as const;

// ─── Factory & Singleton ──────────────────────────────────────────────────────

let cacheInstance: CacheService;
let redisServiceInstance: RedisCacheService | null = null;

export async function initializeCache(): Promise<CacheService> {
  const isEnabled = process.env.REDIS_ENABLED === 'true';

  if (!isEnabled) {
    log.info('Redis disabled — using no-op cache (REDIS_ENABLED=false)');
    cacheInstance = new NoOpCacheService();
    return cacheInstance;
  }

  const redisService = new RedisCacheService();
  await redisService.connect();
  redisServiceInstance = redisService;
  cacheInstance = redisService;
  return cacheInstance;
}

export function getCache(): CacheService {
  if (!cacheInstance) {
    // Fallback to no-op if not initialized (e.g., in tests)
    cacheInstance = new NoOpCacheService();
  }
  return cacheInstance;
}

export async function disconnectCache(): Promise<void> {
  if (redisServiceInstance) {
    await redisServiceInstance.disconnect();
  }
}

export default getCache;

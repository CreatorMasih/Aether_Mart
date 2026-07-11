import { PrismaClient } from '@prisma/client';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('Database');

// ─── Prisma Singleton ─────────────────────────────────────────────────────────
// Prevents creating multiple PrismaClient instances in development (hot reload)
// See: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    errorFormat: 'pretty',
  });

  return client;
}

export const prisma: PrismaClient =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient()));

// ─── Connection Management ────────────────────────────────────────────────────

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    log.info('✅ Database connection established');
  } catch (error) {
    log.error('❌ Database connection failed', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    log.info('Database disconnected gracefully');
  } catch (error) {
    log.error('Error disconnecting from database', { error });
    throw error;
  }
}

/**
 * Health check — runs a lightweight query to confirm DB connectivity.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export default prisma;

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { getOtpMode } from '../services/otp.service';

// ─── IP & Key Generator Utilities ──────────────────────────────────────────────

/**
 * Normalizes IP addresses (strips IPv6-mapped IPv4 prefix `::ffff:` and maps `::1` to `127.0.0.1`).
 * Leverages Express `req.ip` when `trust proxy` is properly configured.
 */
export const getClientIp = (req: Request): string => {
  let ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  // Strip IPv6-mapped IPv4 prefix
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  } else if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip.trim();
};

/**
 * Generates a privacy-preserving rate-limit key.
 * If identifier is present, hashes it with SHA-256 (truncated to 16 chars).
 * Raw identifiers (phone, email) are NEVER stored or returned in raw form.
 */
export const getMaskedKeyHash = (
  clientIp: string,
  rawIdentifier?: string
): { keyType: string; keyHash: string } => {
  const normalizedId = rawIdentifier ? rawIdentifier.trim().toLowerCase() : '';
  if (normalizedId) {
    const hash = crypto.createHash('sha256').update(normalizedId).digest('hex').substring(0, 16);
    return {
      keyType: 'IP_AND_IDENTIFIER_HASH',
      keyHash: `${clientIp}:${hash}`,
    };
  }
  return {
    keyType: 'IP_ONLY',
    keyHash: clientIp,
  };
};

// ─── Rate Limit Response Handler ──────────────────────────────────────────────

const rateLimitHandler = (req: Request, res: Response): void => {
  const rateLimitInfo = (req as any).rateLimit;
  const resetTime = rateLimitInfo?.resetTime as Date | undefined;
  const retryAfterSeconds = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 60;
  const limit = rateLimitInfo?.limit ?? 100;
  const currentCount = rateLimitInfo?.current ?? limit;

  const ip = getClientIp(req);
  const identifier = req.body?.identifier || req.body?.phone || req.body?.email || '';
  const { keyType, keyHash } = getMaskedKeyHash(ip, identifier);

  const limiterName = (req as any)._limiterName || 'rateLimiter';
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  res.setHeader('Retry-After', String(retryAfterSeconds));
  res.setHeader('X-RateLimit-Limiter', limiterName);
  res.setHeader('X-Request-ID', requestId);

  sendError(
    res,
    'Too many requests. Please try again later.',
    HttpStatus.TOO_MANY_REQUESTS,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    {
      limiter: limiterName,
      limit,
      currentCount,
      resetTime: resetTime ? resetTime.toISOString() : new Date(Date.now() + retryAfterSeconds * 1000).toISOString(),
      retryAfterSeconds,
      keyType,
      keyHash,
      requestId,
    }
  );
};

// ─── Global Rate Limiter (all routes) ────────────────────────────────────────
// 200 requests per 15 minutes per IP

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req: Request, res: Response) => {
    (req as any)._limiterName = 'globalRateLimiter';
    rateLimitHandler(req, res);
  },
  skip: (req) => process.env.NODE_ENV === 'test' || req.path === '/api/health',
});

// ─── Auth Rate Limiter (login / OTP verify) ────────────────────────────────────
// 100 requests in QA/dev mode, 20 in prod per 15 mins

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (getOtpMode() === 'dev' ? 100 : 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const identifier = req.body?.identifier || req.body?.phone || req.body?.email || '';
    return getMaskedKeyHash(ip, identifier).keyHash;
  },
  handler: (req: Request, res: Response) => {
    (req as any)._limiterName = 'authRateLimiter';
    rateLimitHandler(req, res);
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// ─── OTP Rate Limiter (OTP sending specifically) ─────────────────────────────
// 100 OTP requests in QA/dev mode, 20 in prod per 15 mins

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (getOtpMode() === 'dev' ? 100 : 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    const identifier = req.body?.identifier || req.body?.phone || req.body?.email || '';
    return getMaskedKeyHash(ip, identifier).keyHash;
  },
  handler: (req: Request, res: Response) => {
    (req as any)._limiterName = 'otpRateLimiter';
    rateLimitHandler(req, res);
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// ─── API Rate Limiter (authenticated endpoints) ───────────────────────────────
// 200 requests per 15 minutes per IP

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req: Request, res: Response) => {
    (req as any)._limiterName = 'apiRateLimiter';
    rateLimitHandler(req, res);
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// ─── Upload Rate Limiter ──────────────────────────────────────────────────────
// 20 uploads per hour per IP

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (req: Request, res: Response) => {
    (req as any)._limiterName = 'uploadRateLimiter';
    rateLimitHandler(req, res);
  },
  skip: () => process.env.NODE_ENV === 'test',
});


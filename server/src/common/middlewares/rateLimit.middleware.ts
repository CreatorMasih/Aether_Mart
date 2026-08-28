import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { getOtpMode } from '../services/otp.service';

// ─── Rate Limit Response Handler ──────────────────────────────────────────────

const rateLimitHandler = (req: Request, res: Response): void => {
  const resetTime = (req as any).rateLimit?.resetTime as Date | undefined;
  const retryAfterSeconds = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 60;

  res.setHeader('Retry-After', String(retryAfterSeconds));

  sendError(
    res,
    'Too many requests. Please try again.',
    HttpStatus.TOO_MANY_REQUESTS,
    ErrorCodes.RATE_LIMIT_EXCEEDED,
    { retryAfterSeconds }
  );
};

// Helper to extract real client IP behind load balancers / proxies
const getClientIp = (req: Request): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim() !== '') {
    return xForwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

// ─── Global Rate Limiter (all routes) ────────────────────────────────────────
// 200 requests per 15 minutes per IP

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: rateLimitHandler,
  skip: (req) => process.env.NODE_ENV === 'test' || req.path === '/api/health',
});

// ─── Auth Rate Limiter (login / OTP send) ────────────────────────────────────
// 100 requests in QA/dev mode, 20 in prod per 15 mins

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (getOtpMode() === 'dev' ? 100 : 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${getClientIp(req)}:${req.body?.phone || req.body?.email || ''}`,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// ─── OTP Rate Limiter (OTP sending specifically) ─────────────────────────────
// 100 OTP requests in QA/dev mode, 20 in prod per 15 mins

export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => (getOtpMode() === 'dev' ? 100 : 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${getClientIp(req)}:${req.body?.phone || req.body?.email || ''}`,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'OTP request limit reached. Please try again in 15 minutes.',
});

// ─── API Rate Limiter (authenticated endpoints) ───────────────────────────────
// 200 requests per 15 minutes per IP

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
});

// ─── Upload Rate Limiter ──────────────────────────────────────────────────────
// 20 uploads per hour per IP

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
});

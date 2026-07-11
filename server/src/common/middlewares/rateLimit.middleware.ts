import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';

// ─── Rate Limit Response Handler ──────────────────────────────────────────────

const rateLimitHandler = (_req: Request, res: Response): void => {
  sendError(
    res,
    'Too many requests. Please try again later.',
    HttpStatus.TOO_MANY_REQUESTS,
    ErrorCodes.RATE_LIMIT_EXCEEDED
  );
};

// ─── Global Rate Limiter (all routes) ────────────────────────────────────────
// 100 requests per 15 minutes per IP

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => process.env.NODE_ENV === 'test' || req.path === '/api/health',
});

// ─── Auth Rate Limiter (login / OTP send) ────────────────────────────────────
// 5 requests per 15 minutes per IP

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// ─── OTP Rate Limiter (OTP sending specifically) ─────────────────────────────
// 3 OTP requests per hour per IP

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: () => process.env.NODE_ENV === 'test',
  message: 'OTP request limit reached. Please try again in 1 hour.',
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

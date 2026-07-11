import jwt from 'jsonwebtoken';
import { UserRole } from '../modules/auth/auth.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email?: string;
  phone?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number; // seconds
}

// ─── Configuration ────────────────────────────────────────────────────────────

const ACCESS_SECRET = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');
  return secret;
};

const REFRESH_SECRET = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
  return secret;
};

const ACCESS_EXPIRY = (): string => process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = (): string => process.env.JWT_REFRESH_EXPIRY || '7d';

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * Sign a short-lived JWT access token.
 */
export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET(), {
    expiresIn: ACCESS_EXPIRY(),
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

/**
 * Sign a long-lived JWT refresh token.
 * Refresh tokens are stored in the DB and can be revoked.
 */
import { v4 as uuidv4 } from 'uuid';

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const payloadWithJti = {
    ...payload,
    jti: uuidv4(),
  };
  return jwt.sign(payloadWithJti, REFRESH_SECRET(), {
    expiresIn: REFRESH_EXPIRY(),
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

/**
 * Generate a complete access + refresh token pair.
 */
export function generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Parse expiry string to seconds for the frontend
  const expiryStr = ACCESS_EXPIRY();
  const expirySeconds = parseExpiryToSeconds(expiryStr);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresIn: expirySeconds,
  };
}

// ─── Token Verification ───────────────────────────────────────────────────────

/**
 * Verify and decode an access token.
 * Throws `jwt.JsonWebTokenError` or `jwt.TokenExpiredError` on failure.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET()) as JwtPayload;
}

/**
 * Verify and decode a refresh token.
 * Throws on failure.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET()) as JwtPayload;
}

/**
 * Decode a token without verifying signature.
 * Useful for extracting payload from expired tokens.
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

// ─── Cookie Configuration ─────────────────────────────────────────────────────

/**
 * Standard cookie options for the HTTP-only refresh token cookie.
 * Matches the frontend's `withCredentials: true` expectation.
 */
export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',
};

/**
 * Cookie options to clear the refresh token (logout).
 */
export const clearRefreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax' | 'none',
  maxAge: 0,
  path: '/api/auth',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900; // Default 15 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 900;
  }
}

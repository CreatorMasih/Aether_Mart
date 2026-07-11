import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../utils/jwt.util';
import {
  UnauthorizedError,
} from './errorHandler.middleware';
import { ErrorCodes } from '../../utils/response.util';

/**
 * JWT Authentication Middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT,
 * and attaches the decoded payload to `req.user`.
 *
 * Throws `UnauthorizedError` if the token is missing, expired, or invalid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is required', ErrorCodes.TOKEN_MISSING);
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
    };
    req.tokenPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware.
 * Does NOT throw if token is absent — just sets req.user if present.
 * Useful for public endpoints that have enhanced behavior when authenticated
 * (e.g., personalized product feeds).
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      req.user = {
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
      };
      req.tokenPayload = payload;
    }
  } catch {
    // Silently ignore errors — this is optional auth
  }

  next();
}

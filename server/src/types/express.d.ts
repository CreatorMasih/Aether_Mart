import { UserRole } from '../modules/auth/auth.types';

/**
 * Augments the Express Request interface to carry authenticated user context
 * after the auth middleware processes the JWT.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Populated by `authMiddleware` after JWT verification.
       * Contains the decoded token payload.
       */
      user?: {
        userId: string;
        role: UserRole;
        email?: string;
        phone?: string;
      };

      /**
       * Populated by `authMiddleware` — the raw decoded JWT payload.
       */
      tokenPayload?: import('../utils/jwt.util').JwtPayload;
    }
  }
}

export {};

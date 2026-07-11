import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../modules/auth/auth.types';
import { ForbiddenError, UnauthorizedError } from './errorHandler.middleware';
import { ErrorCodes } from '../../utils/response.util';

/**
 * Role-based access control middleware factory.
 *
 * Must be used AFTER the `authenticate` middleware.
 *
 * Usage:
 *   router.get('/admin/users', authenticate, requireRoles('ADMIN'), handler);
 *   router.post('/catalog', authenticate, requireRoles('SHOPKEEPER'), handler);
 *   router.get('/orders', authenticate, requireRoles('CUSTOMER', 'ADMIN'), handler);
 *
 * @param roles - One or more roles that are permitted to access the route
 */
export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', ErrorCodes.TOKEN_MISSING));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
        )
      );
    }

    next();
  };
}

/**
 * Convenience aliases for single-role guards.
 */
export const requireCustomer = requireRoles('CUSTOMER');
export const requireMerchant = requireRoles('SHOPKEEPER');
export const requireRider = requireRoles('RIDER');
export const requireAdmin = requireRoles('ADMIN');
export const requireMerchantOrAdmin = requireRoles('SHOPKEEPER', 'ADMIN');
export const requireAnyRole = requireRoles('CUSTOMER', 'SHOPKEEPER', 'RIDER', 'ADMIN');

// ─── PERMISSION AUTHORIZATION ─────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  CUSTOMER: ['read:catalog'],
  SHOPKEEPER: ['read:catalog', 'write:catalog', 'manage:orders'],
  RIDER: ['read:catalog', 'dispatch:rider'],
  ADMIN: ['read:catalog', 'write:catalog', 'manage:orders', 'dispatch:rider'],
};

/**
 * Permission-based access control middleware factory.
 *
 * Checks if the user's role grants the required permissions.
 * Must be used AFTER the `authenticate` middleware.
 */
export function requirePermissions(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', ErrorCodes.TOKEN_MISSING));
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role] || [];
    const hasAllPermissions = permissions.every((p) => userPermissions.includes(p));

    if (!hasAllPermissions) {
      return next(
        new ForbiddenError(
          `Access denied. Required permission(s): ${permissions.join(', ')}.`
        )
      );
    }

    next();
  };
}

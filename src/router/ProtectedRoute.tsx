import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth-store';
import type { UserRole } from '../core/config/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, activeRole } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Redirect to login page and store history
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && activeRole && !allowedRoles.includes(activeRole)) {
    // Role not authorized -> Redirect to standard landing
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

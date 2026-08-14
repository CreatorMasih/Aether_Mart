import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/auth-store';
import { AlertTriangle } from 'lucide-react';
import type { UserRole } from '../core/config/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, clearSession } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    // Redirect to login page and store history
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Strictly validate actual backend user.role against allowedRoles
  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role as UserRole))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-primary text-text-primary text-center space-y-4 max-w-md mx-auto">
        <div className="p-4 rounded-3xl bg-status-warning/10 text-status-warning">
          <AlertTriangle className="w-10 h-10 mx-auto" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">Signed in as {user.role}</h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            You are signed in with a <span className="font-extrabold text-text-primary uppercase">{user.role}</span> account. Accessing this portal requires <span className="font-extrabold text-brand-emerald uppercase">{allowedRoles.join(', ')}</span> permissions.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full pt-2">
          <button
            onClick={() => {
              clearSession();
              navigate('/auth', { replace: true });
            }}
            className="w-full py-3 bg-brand-emerald text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-brand-emerald-hover"
          >
            Sign Out & Switch Account
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="w-full py-2.5 bg-bg-secondary border border-border-primary text-text-secondary font-semibold text-xs rounded-xl cursor-pointer hover:bg-bg-tertiary"
          >
            Return to Main Menu
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Navigation, LogOut } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';
import { LogoutConfirmationModal } from '../ui/LogoutConfirmationModal';

export const RiderLayout: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, clearSession } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => {
    clearSession();
    showToast({
      type: 'success',
      title: 'Logged Out',
      description: 'Rider portal session closed.',
    });
    navigate('/auth');
  };

  if (user && user.role !== 'RIDER') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-md mx-auto">
        <h2 className="text-lg font-bold text-text-primary">Signed in as {user.role}</h2>
        <p className="text-xs text-text-secondary">
          You are signed in with a <span className="font-bold text-text-primary">{user.role}</span> account. Please sign out to access the Rider Portal.
        </p>
        <button
          onClick={handleLogoutConfirm}
          className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-bold text-xs cursor-pointer"
        >
          Sign Out & Switch to Rider Account
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary max-w-md mx-auto shadow-high border-x border-border-primary">
      {/* Mobile rider status header */}
      <header className="sticky top-0 z-sticky bg-bg-secondary border-b border-border-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-status-warning text-white flex items-center justify-center font-heading font-extrabold text-xs uppercase flex-shrink-0">
            {user?.fullName?.charAt(0) || user?.phone?.charAt(0) || 'R'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-text-primary leading-tight truncate">{user?.fullName || 'Delivery Partner'}</span>
            <span className="text-[9px] text-text-secondary font-semibold leading-none mt-0.5">Rider</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">

          
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-1.5 border border-status-error/20 rounded-lg text-status-error hover:bg-status-error/5 cursor-pointer transition-all"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Touch action content panel */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Rider Navigation tabs */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-bg-secondary border-t border-border-primary py-2.5 px-6 flex justify-around items-center z-sticky">
        <NavLink
          to="dashboard"
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 text-[9px] font-bold uppercase",
            isActive ? "text-brand-emerald" : "text-text-secondary"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          Dashboard
        </NavLink>

        <NavLink
          to="active"
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 text-[9px] font-bold uppercase",
            isActive ? "text-brand-emerald" : "text-text-secondary"
          )}
        >
          <Navigation className="h-5 w-5" />
          Navigator
        </NavLink>
      </nav>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default RiderLayout;

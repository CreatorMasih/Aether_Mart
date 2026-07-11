import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Navigation, LogOut } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

export const RiderLayout: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { clearSession } = useAuthStore();

  const handleLogout = () => {
    clearSession();
    showToast({
      type: 'success',
      title: 'Logged Out',
      description: 'Rider portal session closed.',
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary max-w-md mx-auto shadow-high border-x border-border-primary">
      {/* Mobile rider status header */}
      <header className="sticky top-0 z-sticky bg-bg-secondary border-b border-border-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-heading font-extrabold text-md text-brand-emerald">Aether Mart</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald font-semibold uppercase tracking-wider">Rider</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 border border-status-error/20 rounded-lg text-status-error hover:bg-status-error/5 cursor-pointer"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
        </button>
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
    </div>
  );
};

export default RiderLayout;

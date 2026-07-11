import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { clearSession } = useAuthStore();

  const handleLogout = () => {
    clearSession();
    showToast({
      type: 'success',
      title: 'Logged Out',
      description: 'Super Admin session terminated.',
    });
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary select-none">
      {/* Super Admin Top Control Ribbon */}
      <header className="bg-bg-secondary border-b border-border-primary px-6 py-4 flex items-center justify-between shadow-subtle">
        <div className="flex items-center gap-3">
          <span className="font-heading font-extrabold text-xl text-brand-emerald">Aether Mart</span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-status-error/10 text-status-error font-semibold uppercase tracking-wider">Super Admin Command Center</span>
        </div>

        <nav className="flex items-center gap-2">
          <NavLink
            to="dashboard"
            className={({ isActive }) => cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              isActive 
                ? "bg-brand-emerald/10 text-brand-emerald" 
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Executive Summary
          </NavLink>

          <NavLink
            to="users"
            className={({ isActive }) => cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
              isActive 
                ? "bg-brand-emerald/10 text-brand-emerald" 
                : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
            )}
          >
            <Users className="h-4 w-4" />
            User Operations
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-status-error hover:bg-status-error/5 cursor-pointer transition-all ml-4"
          >
            <LogOut className="h-4 w-4" />
            Logout Command
          </button>
        </nav>
      </header>

      {/* Admin workspace */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../core/theme/useTheme';
import { cn } from '../../utils/cn';
import { LogoutConfirmationModal } from '../ui/LogoutConfirmationModal';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, clearSession } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => {
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
      <header className="bg-bg-secondary border-b border-border-primary px-6 py-4 flex items-center justify-between shadow-subtle flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="font-heading font-extrabold text-xl text-brand-emerald">Aether Mart</span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-status-error/10 text-status-error font-semibold uppercase tracking-wider">Super Admin Command Center</span>
        </div>

        <nav className="flex items-center gap-2 flex-wrap">
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

          {/* Admin Profile Avatar Info */}
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border-primary rounded-xl bg-bg-tertiary ml-2">
            <div className="h-5 w-5 rounded-full bg-status-error text-white flex items-center justify-center font-heading font-extrabold text-[9px] uppercase">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <span className="text-xs font-bold text-text-primary hidden sm:inline">{user?.fullName || 'Super Admin'}</span>
          </div>

          {/* Appearance Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 border border-border-primary rounded-xl hover:bg-bg-tertiary text-text-primary cursor-pointer transition-all ml-1"
            title="Toggle Appearance"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-brand-emerald" /> : <Moon className="h-4 w-4 text-brand-emerald" />}
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-status-error hover:bg-status-error/5 cursor-pointer transition-all ml-2"
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

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default AdminLayout;

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Layers, Package, Store, LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { useTheme } from '../../core/theme/useTheme';
import { cn } from '../../utils/cn';
import { LogoutConfirmationModal } from '../ui/LogoutConfirmationModal';

export const MerchantLayout: React.FC = () => {
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
      description: 'Merchant portal session closed.',
    });
    navigate('/');
  };

  const navItems = [
    { to: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { to: 'orders', label: 'Orders Checklist', icon: ShoppingBag },
    { to: 'catalog', label: 'Product Catalog', icon: Layers },
    { to: 'inventory', label: 'Inventory Stock', icon: Package },
    { to: 'profile', label: 'Store Profile', icon: Store },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-primary text-text-primary select-none">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-bg-secondary border-b md:border-b-0 md:border-r border-border-primary p-6 md:min-h-screen flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="font-heading font-extrabold text-lg text-brand-emerald">Aether Mart</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald font-semibold uppercase tracking-wider">Store</span>
          </div>

          {/* User Profile Info Card */}
          <div className="p-3 border border-border-primary rounded-xl bg-bg-tertiary flex items-center gap-3 mb-6">
            <div className="h-8 w-8 rounded-full bg-brand-emerald text-white flex items-center justify-center font-heading font-extrabold text-xs uppercase flex-shrink-0">
              {user?.fullName?.charAt(0) || user?.phone?.charAt(0) || 'M'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-text-primary truncate">{user?.fullName || 'Store Manager'}</h3>
              <p className="text-[9px] text-text-secondary truncate font-semibold uppercase tracking-wider mt-0.5">Merchant</p>
            </div>
          </div>

          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3">Merchant Management</div>
          
          <nav className="flex flex-col gap-1 text-xs font-semibold">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                    isActive 
                      ? "bg-brand-emerald/10 text-brand-emerald" 
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-border-primary/60 mt-4 md:mt-auto space-y-4">
          {/* Theme Settings Toggle */}
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-text-secondary">Appearance</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 border border-border-primary rounded-lg hover:bg-bg-tertiary text-text-primary cursor-pointer transition-all flex items-center gap-1.5"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-brand-emerald" /> : <Moon className="h-3.5 w-3.5 text-brand-emerald" />}
              <span className="text-[10px]">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-status-error hover:bg-status-error/5 transition-all cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Logout Portal
          </button>
        </div>
      </aside>

      {/* Primary Dashboard Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
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

export default MerchantLayout;

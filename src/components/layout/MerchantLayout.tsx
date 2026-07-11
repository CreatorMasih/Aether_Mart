import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Layers, LogOut } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../utils/cn';

export const MerchantLayout: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { clearSession } = useAuthStore();

  const handleLogout = () => {
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
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-primary text-text-primary select-none">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-bg-secondary border-b md:border-b-0 md:border-r border-border-primary p-6 md:min-h-screen flex-shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <span className="font-heading font-extrabold text-lg text-brand-emerald">Aether Mart</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald font-semibold uppercase tracking-wider">Store</span>
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

        <div className="pt-6 border-t border-border-primary/60 mt-auto hidden md:block">
          <button
            onClick={handleLogout}
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
    </div>
  );
};

export default MerchantLayout;

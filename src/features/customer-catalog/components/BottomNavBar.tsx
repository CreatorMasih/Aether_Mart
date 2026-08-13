import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, BarChart3, User } from 'lucide-react';
import { useDrawerStore } from '../../../components/ui/drawer-manager/drawer-store';
import { useCart } from '../../customer-checkout/hooks/useCart';
import { cn } from '../../../utils/cn';

export const BottomNavBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const openDrawer = useDrawerStore((state: any) => state.openDrawer);
  const { itemCount } = useCart();

  const navItems = [
    { label: 'Home', icon: <Home className="h-5 w-5" />, path: '/c/home' },
    { label: 'Categories', icon: <Grid className="h-5 w-5" />, path: '/c/category/all' },
    {
      label: 'Cart',
      icon: (
        <div className="relative">
          <ShoppingBag className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-brand-emerald text-white text-[9px] font-extrabold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </div>
      ),
      action: () => openDrawer('CART'),
    },
    { label: 'Insights', icon: <BarChart3 className="h-5 w-5" />, path: '/c/profile/insights' },
    { label: 'Profile', icon: <User className="h-5 w-5" />, path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-sticky bg-bg-secondary/90 backdrop-blur-md border-t border-border-primary py-2 px-4 flex items-center justify-around md:hidden shadow-high pointer-events-auto">
      {navItems.map((item, idx) => {
        const isActive = item.path ? location.pathname === item.path : false;
        return (
          <button
            key={idx}
            onClick={() => {
              if (item.action) {
                item.action();
              } else if (item.path) {
                navigate(item.path);
              }
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer",
              isActive 
                ? "text-brand-emerald" 
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {item.icon}
            <span className="text-[10px] font-bold tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavBar;

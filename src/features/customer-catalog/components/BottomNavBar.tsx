import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, User } from 'lucide-react';
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
    { label: 'Orders', icon: <ShoppingBag className="h-5 w-5" />, path: '/c/profile?tab=orders' },
    { label: 'Account', icon: <User className="h-5 w-5" />, path: '/c/profile?tab=profile' },
  ];

  return (
    <>
      {itemCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-sticky md:hidden">
          <button
            onClick={() => openDrawer('CART')}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg flex items-center justify-between cursor-pointer border border-emerald-500"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span>{itemCount} {itemCount === 1 ? 'item' : 'items'} added</span>
            </div>
            <div className="flex items-center gap-1">
              <span>View Cart</span>
              <span>→</span>
            </div>
          </button>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-sticky bg-bg-secondary/95 backdrop-blur-md border-t border-border-primary py-2 px-4 flex items-center justify-around md:hidden shadow-high pointer-events-auto">
        {navItems.map((item, idx) => {
          const isActive = location.pathname.startsWith(item.path.split('?')[0]);
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg transition-all cursor-pointer",
                isActive 
                  ? "text-brand-emerald font-extrabold" 
                  : "text-text-secondary hover:text-text-primary font-bold"
              )}
            >
              {item.icon}
              <span className="text-[10px] tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default BottomNavBar;

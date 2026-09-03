import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, History, Trash2, X, ShoppingBag } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { useCustomerStore } from '../store/customer-store';
import { useCart } from '../../customer-checkout/hooks/useCart';
import { useDrawerStore } from '../../../components/ui/drawer-manager/drawer-store';
import { cn } from '../../../utils/cn';

interface CustomerHeaderProps {
  onNotificationClick: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  onNotificationClick,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { searchHistory, addSearchQuery, clearSearchHistory } = useCustomerStore();
  const navigate = useNavigate();
  const openDrawer = useDrawerStore((state) => state.openDrawer);
  const { itemCount } = useCart();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (clean.length > 0) {
      addSearchQuery(clean);
      navigate(`/c/search?q=${encodeURIComponent(clean)}`);
      setIsFocused(false);
    }
  };

  const handleHistoryItemClick = (item: string) => {
    setQuery(item);
    addSearchQuery(item);
    navigate(`/c/search?q=${encodeURIComponent(item)}`);
    setIsFocused(false);
  };

  return (
    <header className="sticky top-0 z-100 bg-bg-secondary/90 backdrop-blur-md border-b border-border-primary w-full px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        {/* Top line: Brand + LocationSelector + Cart Button + Notification Bell */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span 
              onClick={() => navigate('/c/home')}
              className="font-heading font-extrabold text-xl text-brand-emerald cursor-pointer select-none"
            >
              Aether Mart
            </span>
            <div className="h-6 w-px bg-border-primary hidden sm:block" />
            <LocationSelector />
          </div>

          <div className="flex items-center gap-2">
            {/* Cart Drawer Trigger Button */}
            <button
              onClick={() => openDrawer('CART')}
              className="px-3 py-1.5 rounded-xl border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald hover:bg-brand-emerald/20 transition-all relative flex items-center gap-1.5 cursor-pointer font-bold text-xs font-heading"
              aria-label="Open cart drawer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-brand-emerald text-white text-[10px] font-extrabold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Notification Bell */}
            <button
              onClick={onNotificationClick}
              className="p-2 rounded-xl border border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary transition-all relative cursor-pointer"
              aria-label="Open notifications center"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-status-error" />
            </button>
          </div>
        </div>

        {/* Search bar container */}
        <div className="flex-1 max-w-xl md:mx-6 relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder='Search for "fresh milk", "organic apples", "face wash"...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className={cn(
                "w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs font-semibold bg-bg-tertiary text-text-primary transition-all",
                "focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald focus:bg-bg-secondary",
                isFocused && "border-brand-emerald bg-bg-secondary shadow-subtle"
              )}
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-text-secondary" />
            
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-3 p-0.5 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </form>

          {/* Autocomplete / History Dropdown */}
          {isFocused && (
            <>
              {/* Backscreen to close focus */}
              <div className="fixed inset-0 z-overlay" onClick={() => setIsFocused(false)} />
              
              <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border-primary bg-bg-secondary shadow-high p-4 z-drawer pointer-events-auto">
                {searchHistory.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Recent Searches</p>
                      <button
                        onClick={clearSearchHistory}
                        className="text-[10px] font-bold text-status-error hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        Clear All
                      </button>
                    </div>
                    <div className="space-y-1">
                      {searchHistory.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleHistoryItemClick(item)}
                          className="w-full text-left py-2 px-3 hover:bg-bg-tertiary rounded-lg flex items-center gap-2.5 text-xs font-semibold text-text-primary transition-colors cursor-pointer"
                        >
                          <History className="h-3.5 w-3.5 text-text-secondary" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-text-secondary">Try searching for groceries, pharmacy, or fresh foods.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
};

export default CustomerHeader;

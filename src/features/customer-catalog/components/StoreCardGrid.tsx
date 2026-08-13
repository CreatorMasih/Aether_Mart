import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Clock, MapPin, Truck, ChevronRight } from 'lucide-react';
import type { Store } from '../../../types';
import { cardHover } from '../../../core/theme/animations';
import { formatCurrency } from '../../../utils/formatters';

interface StoreCardGridProps {
  stores: Store[];
}

export const StoreCardGrid: React.FC<StoreCardGridProps> = ({ stores }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stores.map((store: any) => {
        const isClosed = store.isOpen === false || store.isPaused || store.isHoliday;
        const deliveryFeeText = store.deliveryFee === 0 ? 'Free Delivery' : `Delivery ${formatCurrency(store.deliveryFee || 20)}`;

        return (
          <motion.div
            key={store.id}
            variants={cardHover}
            initial="initial"
            whileHover="hover"
            onClick={() => navigate(`/c/store/${store.id}`)}
            className="p-4 rounded-2xl border border-border-primary bg-bg-secondary flex flex-col justify-between shadow-subtle relative select-none cursor-pointer hover:border-brand-emerald/40 transition-all group"
          >
            <div className="flex gap-3 items-start">
              {/* Logo / Image Circle */}
              <div className="h-14 w-14 rounded-xl bg-bg-tertiary border border-border-primary/60 overflow-hidden flex items-center justify-center text-2xl shadow-subtle flex-shrink-0">
                {store.logoUrl && store.logoUrl.startsWith('http') ? (
                  <img src={store.logoUrl} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{store.logoUrl || '🏪'}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-text-primary truncate font-heading group-hover:text-brand-emerald transition-colors">
                    {store.name}
                  </h4>
                  {isClosed ? (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-status-error/10 text-status-error shrink-0">
                      🔴 Closed
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald shrink-0">
                      🟢 Open
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-text-secondary font-semibold mt-0.5 truncate">
                  {store.category || 'Grocery & Daily Essentials'}
                </p>

                <p className="text-[10px] text-text-secondary truncate mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-text-secondary" />
                  {store.distance !== undefined ? `${store.distance} km away` : store.address}
                </p>
              </div>
            </div>

            {/* Metrics Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary/60 text-xs">
              <div className="flex items-center gap-3">
                {store.rating > 0 && (
                  <div className="flex items-center gap-1 font-bold text-text-primary">
                    <Star className="h-3.5 w-3.5 fill-status-warning text-status-warning" />
                    {store.rating}
                  </div>
                )}
                <div className="flex items-center gap-1 font-bold text-brand-emerald">
                  <Clock className="h-3.5 w-3.5" />
                  {store.deliveryTimeMins || store.deliveryTime || 25} min
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
                  <Truck className="h-3 w-3" />
                  {deliveryFeeText}
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/c/store/${store.id}`);
                }}
                className="p-1 rounded-lg hover:bg-bg-tertiary text-brand-emerald flex items-center gap-0.5 text-xs font-bold cursor-pointer"
              >
                View
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StoreCardGrid;

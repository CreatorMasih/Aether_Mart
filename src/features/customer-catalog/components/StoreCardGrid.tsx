import React from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, MapPin } from 'lucide-react';
import type { Store } from '../../../types';
import { cardHover } from '../../../core/theme/animations';

interface StoreCardGridProps {
  stores: Store[];
}

export const StoreCardGrid: React.FC<StoreCardGridProps> = ({ stores }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stores.map((store) => (
        <motion.div
          key={store.id}
          variants={cardHover}
          initial="initial"
          whileHover="hover"
          className="p-4 rounded-2xl border border-border-primary bg-bg-secondary flex gap-4 shadow-subtle relative select-none"
        >
          {/* Logo Circle */}
          <div className="h-12 w-12 rounded-xl bg-bg-tertiary border border-border-primary/60 flex items-center justify-center text-2xl shadow-subtle flex-shrink-0">
            {store.logoUrl || '🏪'}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-text-primary truncate">{store.name}</h4>
            <p className="text-[10px] text-text-secondary truncate mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {store.address}
            </p>

            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-primary/60 text-xs">
              <div className="flex items-center gap-1 font-bold text-text-primary">
                <Star className="h-3.5 w-3.5 fill-status-warning text-status-warning" />
                {store.rating}
              </div>
              <div className="h-3 w-px bg-border-primary" />
              <div className="flex items-center gap-1 font-bold text-brand-emerald">
                <Clock className="h-3.5 w-3.5" />
                {store.deliveryTimeMins || (store as any).deliveryTime || 10} mins
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StoreCardGrid;

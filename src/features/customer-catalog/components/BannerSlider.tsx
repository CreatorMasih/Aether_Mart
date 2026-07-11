import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
  textColor: string;
}

const BANNERS: BannerItem[] = [
  {
    id: 'b1',
    title: 'Monsoon Fruits Festival',
    subtitle: 'Flat 30% Off on Fresh Organic Mangoes & Lychees',
    badge: 'FRESH DEALS',
    bgGradient: 'from-emerald-500/20 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-500/20',
    textColor: 'text-emerald-500',
  },
  {
    id: 'b2',
    title: 'Immunity Boost Pack',
    subtitle: 'Get Vitamin C & Zinc Supplements Delivered in 10 Mins',
    badge: 'HEALTH & ESSENTIALS',
    bgGradient: 'from-violet-500/20 to-fuchsia-500/10 dark:from-violet-950/40 dark:to-fuchsia-950/20 border-violet-500/20',
    textColor: 'text-violet-500',
  },
  {
    id: 'b3',
    title: 'Daily Essentials Subs',
    subtitle: 'Save ₹150 Monthly on Milk & Bread Deliveries',
    badge: 'DAILY SAVERS',
    bgGradient: 'from-amber-500/20 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/20 border-amber-500/20',
    textColor: 'text-amber-500',
  },
];

export const BannerSlider: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-scroll loop
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev === BANNERS.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full overflow-hidden select-none">
      <div className="relative h-44 w-full">
        <AnimatePresence mode="wait">
          {BANNERS.map((banner, idx) => {
            if (idx !== activeIdx) return null;
            return (
              <motion.div
                key={banner.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className={cn(
                  "absolute inset-0 rounded-2xl border bg-gradient-to-r p-6 flex flex-col justify-between shadow-subtle",
                  banner.bgGradient
                )}
              >
                <div>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-secondary border border-current w-fit inline-block mb-2 font-heading tracking-wide", banner.textColor)}>
                    {banner.badge}
                  </span>
                  <h3 className="text-lg font-extrabold text-text-primary leading-tight font-heading max-w-sm sm:max-w-md">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1 font-semibold max-w-xs sm:max-w-sm truncate">
                    {banner.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-primary hover:underline cursor-pointer flex items-center gap-1">
                    Claim Discount →
                  </span>
                  
                  {/* Slider indicator Dots */}
                  <div className="flex items-center gap-1">
                    {BANNERS.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => setActiveIdx(dotIdx)}
                        className={cn(
                          "h-1 rounded-full transition-all cursor-pointer",
                          dotIdx === activeIdx ? "w-4 bg-text-primary" : "w-1 bg-text-secondary/30"
                        )}
                        aria-label={`Slide ${dotIdx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BannerSlider;

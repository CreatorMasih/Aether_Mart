import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';
import type { Banner } from '../services/catalog-mappers';

interface BannerSliderProps {
  banners: Banner[];
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ banners }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  // Auto-scroll loop
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden select-none">
      <div className="relative h-44 w-full">
        <AnimatePresence mode="wait">
          {banners.map((banner, idx) => {
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
                style={banner.imageUrl ? {
                  backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.3)), url(${banner.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : undefined}
              >
                <div>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full bg-bg-secondary border border-current w-fit inline-block mb-2 font-heading tracking-wide font-semibold", banner.textColor)}>
                    {banner.badge}
                  </span>
                  <h3 className="text-lg font-extrabold text-white leading-tight font-heading max-w-sm sm:max-w-md">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-gray-200 mt-1 font-semibold max-w-xs sm:max-w-sm truncate">
                    {banner.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white hover:underline cursor-pointer flex items-center gap-1">
                    Claim Discount →
                  </span>
                  
                  {/* Slider indicator Dots */}
                  <div className="flex items-center gap-1">
                    {banners.map((_, dotIdx) => (
                      <button
                        key={dotIdx}
                        onClick={() => setActiveIdx(dotIdx)}
                        className={cn(
                          "h-1 rounded-full transition-all cursor-pointer",
                          dotIdx === activeIdx ? "w-4 bg-white" : "w-1 bg-white/30"
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

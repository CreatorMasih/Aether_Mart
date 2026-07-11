import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, History, Heart, MapPin, Sparkles, Star, Milk, Pill, Apple, ShieldAlert } from 'lucide-react';
import { useCustomerStore } from '../store/customer-store';
import { MOCK_PRODUCTS } from '../services/mock-catalog-data';
import { BannerSlider } from './BannerSlider';
import { CategoryCircleGrid } from './CategoryCircleGrid';
import { ProductCardGrid } from './ProductCardGrid';
import { StoreCardGrid } from './StoreCardGrid';
import { heroReveal } from '../../../core/theme/animations';

export const HomeScreen: React.FC = () => {
  const { wishlist, recentlyViewed } = useCustomerStore();
  const [countdown, setCountdown] = useState<string>('09:59');

  // Simulated flash deals 10-minute ticker loop
  useEffect(() => {
    let totalSeconds = 599; // 9 mins 59 secs
    const timer = setInterval(() => {
      if (totalSeconds <= 0) {
        totalSeconds = 599; // loop reset
      } else {
        totalSeconds--;
      }
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter products by category/section
  const flashDealsProducts = MOCK_PRODUCTS.filter(p => p.id === 'prod-apple-1' || p.id === 'prod-avocado-1');
  const buyAgainProducts = MOCK_PRODUCTS.filter(p => p.id === 'prod-milk-1' || p.id === 'prod-bread-1');
  const dailyEssentialsProducts = MOCK_PRODUCTS.filter(p => p.categorySlug === 'daily-essentials');
  const pharmacyProducts = MOCK_PRODUCTS.filter(p => p.categorySlug === 'pharmacy');
  const freshProduceProducts = MOCK_PRODUCTS.filter(p => p.categorySlug === 'fresh-fruits-and-vegetables');
  const personalCareProducts = MOCK_PRODUCTS.filter(p => p.categorySlug === 'personal-care');
  const petCareProducts = MOCK_PRODUCTS.filter(p => p.categorySlug === 'pet-care');
  const electronicsProducts = MOCK_PRODUCTS.filter(p => p.categorySlug === 'electronics');

  const renderSectionHeader = (icon: React.ReactNode, title: string, subtitle?: string, badge?: string) => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-bg-secondary border border-border-primary text-brand-emerald shadow-subtle">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error/10 text-status-error tracking-wide uppercase">
                {badge}
              </span>
            )}
          </h2>
          {subtitle && <p className="text-[10px] text-text-secondary font-semibold mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      variants={heroReveal}
      initial="initial"
      animate="animate"
      className="space-y-8 pb-12"
    >
      {/* 1. Promotional Banners Carousel */}
      <section aria-label="Featured Offers">
        <BannerSlider />
      </section>

      {/* 2. Instant Shop Categories Grid */}
      <section aria-label="Browse Categories">
        <CategoryCircleGrid />
      </section>

      {/* 3. 🔥 Flash Deals Countdown */}
      <section className="p-5 rounded-2xl border border-status-error/10 bg-gradient-to-br from-status-error/5 via-bg-secondary to-bg-secondary">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-status-error/10 text-status-error shadow-subtle">
              <Flame className="h-5 w-5 fill-status-error animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
                Flash Deals
              </h2>
              <p className="text-[10px] text-text-secondary font-semibold mt-0.5">Closing soon! Flat 50% Off</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-status-error text-white font-heading text-xs font-extrabold shadow-subtle animate-bounce">
            {countdown}
          </div>
        </div>
        <ProductCardGrid products={flashDealsProducts} />
      </section>

      {/* 4. 🕒 Buy Again */}
      {buyAgainProducts.length > 0 && (
        <section>
          {renderSectionHeader(<History className="h-5 w-5" />, 'Buy Again', 'Based on your recent grocery orders')}
          <ProductCardGrid products={buyAgainProducts} />
        </section>
      )}

      {/* 5. ❤️ Wishlist Picks */}
      <section>
        {renderSectionHeader(<Heart className="h-5 w-5 fill-status-error text-status-error" />, 'Wishlist Picks', 'Items you have saved for later')}
        {wishlist.length > 0 ? (
          <ProductCardGrid products={wishlist.slice(0, 4)} />
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-border-primary text-center">
            <p className="text-xs text-text-secondary">Your saved wishlist items will appear here.</p>
          </div>
        )}
      </section>

      {/* 6. 📍 Nearby Stores */}
      <section>
        {renderSectionHeader(<MapPin className="h-5 w-5" />, 'Nearby Stores', 'Hyperlocal merchants delivering in your area')}
        <StoreCardGrid />
      </section>

      {/* 7. 🛒 Continue Shopping */}
      {recentlyViewed.length > 0 && (
        <section>
          {renderSectionHeader(<History className="h-5 w-5" />, 'Continue Shopping', 'Pick up where you left off')}
          <ProductCardGrid products={recentlyViewed.slice(0, 4)} />
        </section>
      )}

      {/* 8. ⭐ Top Rated Products */}
      <section>
        {renderSectionHeader(<Star className="h-5 w-5 fill-status-warning text-status-warning" />, 'Top Rated Products', 'Favorites with 4.8+ user reviews')}
        <ProductCardGrid products={MOCK_PRODUCTS.slice(0, 4)} />
      </section>

      {/* 9. 🥛 Daily Essentials */}
      <section>
        {renderSectionHeader(<Milk className="h-5 w-5" />, 'Daily Essentials', 'Milk, bread, butter, eggs & baking')}
        <ProductCardGrid products={dailyEssentialsProducts} />
      </section>

      {/* 10. 💊 Pharmacy */}
      <section>
        {renderSectionHeader(<Pill className="h-5 w-5" />, 'Pharmacy Essentials', 'OTC medicines, wellness, and care', '12 Min')}
        <ProductCardGrid products={pharmacyProducts} />
      </section>

      {/* 11. 🍎 Fresh Fruits & Vegetables */}
      <section>
        {renderSectionHeader(<Apple className="h-5 w-5" />, 'Fresh Fruits & Vegetables', 'Farm-fresh organic vegetables and seasonal fruits')}
        <ProductCardGrid products={freshProduceProducts} />
      </section>

      {/* 12. 🧴 Personal Care */}
      <section>
        {renderSectionHeader(<Sparkles className="h-5 w-5" />, 'Personal Care', 'Shampoos, body washes, skin lotions')}
        <ProductCardGrid products={personalCareProducts} />
      </section>

      {/* 13. 🐶 Pet Care */}
      <section>
        {renderSectionHeader(<Sparkles className="h-5 w-5" />, 'Pet Care', 'Kibble, treats, grooming, and pet hygiene')}
        <ProductCardGrid products={petCareProducts} />
      </section>

      {/* 14. 📱 Electronics Expansion (Future) */}
      <section className="relative opacity-70 group">
        {renderSectionHeader(<ShieldAlert className="h-5 w-5" />, 'Electronics & Devices', 'Cables, adapter fast chargers, earbuds', 'COMING SOON')}
        <div className="absolute inset-0 z-10 bg-bg-primary/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none rounded-2xl border border-dashed border-border-primary">
          <span className="text-[10px] font-extrabold px-3 py-1 rounded bg-text-primary text-bg-secondary shadow-subtle uppercase tracking-wider font-heading">
            Coming Soon to your pincode
          </span>
        </div>
        <ProductCardGrid products={electronicsProducts} />
      </section>

      {/* 15. 🎉 Seasonal Offers */}
      <section className="p-6 rounded-2xl border border-border-primary bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-bg-secondary flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-brand-violet/10 text-brand-violet font-heading tracking-wide uppercase">
            SEASONAL FESTIVAL
          </span>
          <h3 className="text-base font-extrabold text-text-primary leading-tight font-heading">
            Monsoon Care Specials
          </h3>
          <p className="text-xs text-text-secondary">
            Equip yourself with umbrellas, mosquito repellents, herbal teas, and sanitizers.
          </p>
        </div>
        <button className="py-2 px-4 rounded-lg bg-text-primary text-bg-secondary hover:bg-text-primary/90 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 self-center">
          Browse Monsoon Deals
        </button>
      </section>

    </motion.div>
  );
};

export default HomeScreen;

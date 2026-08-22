import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, MapPin, Sparkles, Star, Milk, Pill, Apple, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCustomerStore } from '../store/customer-store';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { BannerSlider } from './BannerSlider';
import { CategoryCircleGrid } from './CategoryCircleGrid';
import { ProductCardGrid } from './ProductCardGrid';
import { StoreCardGrid } from './StoreCardGrid';
import { pageTransition } from '../../../core/theme/animations';
import { NotServiceableState } from '../../../components/ui/NotServiceableState';
import { LocationPickerModal } from '../../../components/ui/LocationPickerModal';
import { DEFAULT_MAHASAMUND_ADDRESS, checkLocationServiceability } from '../../../core/config/serviceability';

export const HomeScreen: React.FC = () => {
  const { recentlyViewed, selectedAddress, setSelectedAddress } = useCustomerStore();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // Auto-resolve location on mount if not selected
  useEffect(() => {
    if (!selectedAddress) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const res = checkLocationServiceability({ latitude: lat, longitude: lng });
            if (res.isServiceable) {
              setSelectedAddress({
                ...DEFAULT_MAHASAMUND_ADDRESS,
                coordinates: { latitude: lat, longitude: lng },
                isServiceable: true,
              });
            } else {
              setSelectedAddress({
                ...DEFAULT_MAHASAMUND_ADDRESS,
                city: 'Outside Service Area',
                coordinates: { latitude: lat, longitude: lng },
                isServiceable: false,
              });
            }
          },
          () => {
            setSelectedAddress(DEFAULT_MAHASAMUND_ADDRESS);
          }
        );
      } else {
        setSelectedAddress(DEFAULT_MAHASAMUND_ADDRESS);
      }
    }
  }, [selectedAddress, setSelectedAddress]);

  const lat = selectedAddress?.coordinates?.latitude;
  const lng = selectedAddress?.coordinates?.longitude;
  const isServiceable = selectedAddress ? selectedAddress.isServiceable !== false : true;

  // 1. Fetch Dynamic Home Feed
  const { data: homeFeed, isLoading: isFeedLoading, isError: isFeedError, refetch: refetchFeed } = useQuery({
    queryKey: queryKeys.homeFeed(lat, lng),
    queryFn: () => catalogService.getHomeFeed(lat, lng),
    enabled: isServiceable,
  });

  // 2. Parallel Category Shelf Queries
  const { data: dailyEssentialsRes } = useQuery({
    queryKey: queryKeys.products({ category: 'daily-essentials', limit: 4 }),
    queryFn: () => catalogService.getProducts({ category: 'daily-essentials', limit: 4 }),
  });

  const { data: pharmacyRes } = useQuery({
    queryKey: queryKeys.products({ category: 'pharmacy', limit: 4 }),
    queryFn: () => catalogService.getProducts({ category: 'pharmacy', limit: 4 }),
  });

  const { data: freshProduceRes } = useQuery({
    queryKey: queryKeys.products({ category: 'fresh-fruits-and-vegetables', limit: 4 }),
    queryFn: () => catalogService.getProducts({ category: 'fresh-fruits-and-vegetables', limit: 4 }),
  });

  const { data: personalCareRes } = useQuery({
    queryKey: queryKeys.products({ category: 'personal-care', limit: 4 }),
    queryFn: () => catalogService.getProducts({ category: 'personal-care', limit: 4 }),
  });

  const { data: petCareRes } = useQuery({
    queryKey: queryKeys.products({ category: 'pet-care', limit: 4 }),
    queryFn: () => catalogService.getProducts({ category: 'pet-care', limit: 4 }),
  });

  const { data: electronicsRes } = useQuery({
    queryKey: queryKeys.products({ category: 'electronics', limit: 4 }),
    queryFn: () => catalogService.getProducts({ category: 'electronics', limit: 4 }),
  });

  const dailyEssentialsProducts = dailyEssentialsRes?.products || [];
  const pharmacyProducts = pharmacyRes?.products || [];
  const freshProduceProducts = freshProduceRes?.products || [];
  const personalCareProducts = personalCareRes?.products || [];
  const petCareProducts = petCareRes?.products || [];
  const electronicsProducts = electronicsRes?.products || [];

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
              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error/10 text-status-error tracking-wide uppercase font-semibold">
                {badge}
              </span>
            )}
          </h2>
          {subtitle && <p className="text-[10px] text-text-secondary font-semibold mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  if (!isServiceable) {
    return (
      <>
        <NotServiceableState
          currentLocationName={selectedAddress?.city || selectedAddress?.postalCode || 'your area'}
          onChangeLocationClick={() => setIsLocationModalOpen(true)}
        />
        <LocationPickerModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      </>
    );
  }

  if (isFeedLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
        <p className="text-xs text-text-secondary font-semibold">Loading your neighborhood storefront...</p>
      </div>
    );
  }

  if (isFeedError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-status-error/10 text-status-error">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-sm font-bold text-text-primary font-heading">Failed to Load Storefront</h2>
        <p className="text-xs text-text-secondary max-w-xs">An error occurred while connecting to our server coordinates. Please check your network connection.</p>
        <button 
          onClick={() => refetchFeed()} 
          className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-lg cursor-pointer"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  const feed = homeFeed!;

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      className="space-y-8 pb-12"
    >
      {/* 1. Promotional Banners Carousel */}
      <section aria-label="Featured Offers">
        <BannerSlider banners={feed.banners} />
      </section>

      {/* 2. 📍 Nearest Store & Stores near you */}
      <section aria-label="Stores near you" className="space-y-4">
        {feed.nearbyStores.length > 0 ? (
          <>
            {/* Nearest Store */}
            <div>
              {renderSectionHeader(<MapPin className="h-5 w-5 text-brand-emerald" />, 'Nearest to you', 'Closest merchant delivering in 15 mins')}
              <StoreCardGrid stores={[feed.nearbyStores[0]]} />
            </div>

            {/* Other Stores Near You */}
            {feed.nearbyStores.length > 1 && (
              <div>
                {renderSectionHeader(<MapPin className="h-5 w-5" />, 'Other stores near you', 'Explore more local storefronts')}
                <StoreCardGrid stores={feed.nearbyStores.slice(1)} />
              </div>
            )}
          </>
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-border-primary bg-bg-secondary text-center space-y-3">
            <span className="text-4xl block">📍</span>
            <h3 className="text-sm font-extrabold text-text-primary font-heading">
              No stores available at your location yet.
            </h3>
            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              Aether Mart isn't available at this location yet. Try changing your pincode or area.
            </p>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="px-4 py-2 bg-brand-emerald text-white hover:bg-brand-emerald-hover text-xs font-bold rounded-xl cursor-pointer shadow-subtle"
            >
              Change Location
            </button>
          </div>
        )}
      </section>

      {/* 3. Instant Shop Categories Grid */}
      <section aria-label="Browse Categories">
        <CategoryCircleGrid />
      </section>

      {/* 7. 🛒 Continue Shopping */}
      {recentlyViewed.length > 0 && (
        <section>
          {renderSectionHeader(<History className="h-5 w-5" />, 'Continue Shopping', 'Pick up where you left off')}
          <ProductCardGrid products={recentlyViewed.slice(0, 4)} />
        </section>
      )}

      {/* 8. ⭐ Top Picks for You */}
      {feed.recommendedProducts.length > 0 && (
        <section>
          {renderSectionHeader(<Star className="h-5 w-5 fill-status-warning text-status-warning" />, 'Top Picks for You', 'Fresh daily essentials from local stores')}
          <ProductCardGrid products={feed.recommendedProducts} />
        </section>
      )}

      {/* 9. 🥛 Daily Essentials */}
      {dailyEssentialsProducts.length > 0 && (
        <section>
          {renderSectionHeader(<Milk className="h-5 w-5" />, 'Daily Essentials', 'Milk, bread, butter, eggs & baking')}
          <ProductCardGrid products={dailyEssentialsProducts} />
        </section>
      )}

      {/* 10. 💊 Pharmacy */}
      {pharmacyProducts.length > 0 && (
        <section>
          {renderSectionHeader(<Pill className="h-5 w-5" />, 'Pharmacy Essentials', 'OTC medicines, wellness, and care', '12 Min')}
          <ProductCardGrid products={pharmacyProducts} />
        </section>
      )}

      {/* 11. 🍎 Fresh Fruits & Vegetables */}
      {freshProduceProducts.length > 0 && (
        <section>
          {renderSectionHeader(<Apple className="h-5 w-5" />, 'Fresh Fruits & Vegetables', 'Farm-fresh organic vegetables and seasonal fruits')}
          <ProductCardGrid products={freshProduceProducts} />
        </section>
      )}

      {/* 12. 🧴 Personal Care */}
      {personalCareProducts.length > 0 && (
        <section>
          {renderSectionHeader(<Sparkles className="h-5 w-5" />, 'Personal Care', 'Shampoos, body washes, skin lotions')}
          <ProductCardGrid products={personalCareProducts} />
        </section>
      )}

      {/* 13. 🐶 Pet Care */}
      {petCareProducts.length > 0 && (
        <section>
          {renderSectionHeader(<Sparkles className="h-5 w-5" />, 'Pet Care', 'Kibble, treats, grooming, and pet hygiene')}
          <ProductCardGrid products={petCareProducts} />
        </section>
      )}

      {/* 14. 📱 Electronics Expansion */}
      {electronicsProducts.length > 0 && (
        <section className="relative opacity-70 group">
          {renderSectionHeader(<ShieldAlert className="h-5 w-5" />, 'Electronics & Devices', 'Cables, adapter fast chargers, earbuds', 'COMING SOON')}
          <div className="absolute inset-0 z-10 bg-bg-primary/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none rounded-2xl border border-dashed border-border-primary">
            <span className="text-[10px] font-extrabold px-3 py-1 rounded bg-text-primary text-bg-secondary shadow-subtle uppercase tracking-wider font-heading">
              Coming Soon to your pincode
            </span>
          </div>
          <ProductCardGrid products={electronicsProducts} />
        </section>
      )}

      {/* 15. 🎉 Seasonal Offers */}
      {feed.seasonalOffers.length > 0 && (
        <section className="p-6 rounded-2xl border border-border-primary bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-bg-secondary flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-[8px] font-extrabold px-2 py-0.5 rounded bg-brand-violet/10 text-brand-violet font-heading tracking-wide uppercase font-semibold">
              SEASONAL FESTIVAL
            </span>
            <h3 className="text-base font-extrabold text-text-primary leading-tight font-heading">
              {feed.seasonalOffers[0].title}
            </h3>
            <p className="text-xs text-text-secondary">
              Equip yourself with active deals on seasonal products from nearby coordinate stores.
            </p>
          </div>
          <button className="py-2 px-4 rounded-lg bg-text-primary text-bg-secondary hover:bg-text-primary/90 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 self-center">
            Browse Monsoon Deals
          </button>
        </section>
      )}
    </motion.div>
  );
};

export default HomeScreen;

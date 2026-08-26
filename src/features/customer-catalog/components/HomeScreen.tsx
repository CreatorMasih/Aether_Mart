import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, MapPin, Star, Milk, Pill, Apple, AlertTriangle, Zap, Shield, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCustomerStore } from '../store/customer-store';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { CategoryCircleGrid } from './CategoryCircleGrid';
import { ProductCardGrid } from './ProductCardGrid';
import { StoreCardGrid } from './StoreCardGrid';
import { pageTransition } from '../../../core/theme/animations';
import { NotServiceableState } from '../../../components/ui/NotServiceableState';
import { DEFAULT_MAHASAMUND_ADDRESS, checkLocationServiceability } from '../../../core/config/serviceability';
import { SEOHead } from '../../../components/seo/SEOHead';

export const HomeScreen: React.FC = () => {
  const { recentlyViewed, selectedAddress, setSelectedAddress } = useCustomerStore();

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

  const lat = selectedAddress?.coordinates?.latitude ?? 21.1085;
  const lng = selectedAddress?.coordinates?.longitude ?? 82.0965;
  const isServiceable = selectedAddress ? selectedAddress.isServiceable !== false : true;

  // Fetch Dynamic Home Feed
  const { data: homeFeed, isLoading: isFeedLoading, isError: isFeedError, refetch: refetchFeed } = useQuery({
    queryKey: queryKeys.homeFeed(lat, lng),
    queryFn: () => catalogService.getHomeFeed(lat, lng),
    enabled: isServiceable,
  });

  // Parallel Category Shelf Queries
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

  const dailyEssentialsProducts = dailyEssentialsRes?.products || [];
  const pharmacyProducts = pharmacyRes?.products || [];
  const freshProduceProducts = freshProduceRes?.products || [];
  const personalCareProducts = personalCareRes?.products || [];

  const renderSectionHeader = (icon: React.ReactNode, title: string, subtitle?: string, badge?: string) => (
    <div className="flex items-center justify-between mb-4 select-none">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-emerald-600 shadow-xs">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight font-heading flex items-center gap-2">
            {title}
            {badge && (
              <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-700 tracking-wide uppercase font-semibold">
                {badge}
              </span>
            )}
          </h2>
          {subtitle && <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  if (!isServiceable) {
    return (
      <NotServiceableState
        currentLocationName={selectedAddress?.city || selectedAddress?.postalCode || 'your area'}
        onChangeLocationClick={() => {
          setSelectedAddress(DEFAULT_MAHASAMUND_ADDRESS);
        }}
      />
    );
  }

  if (isFeedLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Loading your Mahasamund storefront...</p>
      </div>
    );
  }

  if (isFeedError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-sm font-bold text-slate-900 font-heading">Failed to Load Storefront</h2>
        <p className="text-xs text-slate-500 max-w-xs">An error occurred while connecting to our Mahasamund servers.</p>
        <button 
          onClick={() => refetchFeed()} 
          className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold rounded-xl cursor-pointer"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  const feed = homeFeed!;

  return (
    <>
      <SEOHead
        title="Aether Mart | Hyperlocal Delivery in Mahasamund"
        description="Aether Mart brings food, groceries, medicines, daily essentials and more to your doorstep in Mahasamund, Chhattisgarh from trusted local businesses."
        canonicalUrl="https://aether-mart-six.vercel.app/c/home"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        className="space-y-8 pb-12"
      >
        {/* 1. CUSTOMER HERO SECTION (Matching Reference Design Target) */}
        <section aria-label="Hero Banner" className="select-none">
          <div className="relative w-full rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-6 sm:p-8 text-white overflow-hidden shadow-lg border border-emerald-700/40">
            {/* Decorative radial gradients */}
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Left Content Column */}
              <div className="space-y-4 max-w-xl text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200 text-xs font-bold font-heading">
                  <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                  <span>10-30 mins delivery in Mahasamund</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-heading leading-tight text-white">
                  Everything you need, delivered locally in Mahasamund
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed max-w-md">
                  Order food, groceries, medicines, daily essentials and more from trusted local stores and businesses in Mahasamund.
                </p>

              {/* Service Highlight Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Fast Delivery</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-[11px] font-bold text-white flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
                  <span>Best Quality</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-[11px] font-bold text-white flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-300" />
                  <span>Secure Payment</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Illustration */}
            <div className="relative shrink-0 w-48 sm:w-64 md:w-72 aspect-4/3 rounded-2xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md p-1.5 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80"
                alt="Fresh Groceries Mahasamund"
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-extrabold flex items-center gap-1 shadow-md border border-white/20">
                <span>🛵</span> 10-30 mins
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop by Category */}
      <section aria-label="Browse Categories" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 font-heading">Shop by Category</h2>
        </div>
        <CategoryCircleGrid />
      </section>

      {/* 3. Available Stores Near You */}
      <section aria-label="Stores near you" className="space-y-4">
        {feed.nearbyStores.length > 0 ? (
          <div>
            {renderSectionHeader(<MapPin className="h-5 w-5 text-emerald-600" />, 'Available Stores Near You', 'Top stores delivering in Mahasamund')}
            <StoreCardGrid stores={feed.nearbyStores} />
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-2 select-none">
            <h3 className="text-xs font-bold text-slate-800">No stores available nearby yet</h3>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              More local Mahasamund stores are coming soon. Explore our top daily picks below.
            </p>
          </div>
        )}
      </section>

      {/* 4. Top Picks for You */}
      {feed.recommendedProducts.length > 0 && (
        <section className="space-y-3">
          {renderSectionHeader(<Star className="h-5 w-5 fill-amber-400 text-amber-400" />, 'Top Picks for You', 'Fresh daily essentials from local stores')}
          <ProductCardGrid products={feed.recommendedProducts} />
        </section>
      )}

      {/* 5. Recently Viewed / Continue Shopping */}
      {recentlyViewed.length > 0 && (
        <section className="space-y-3">
          {renderSectionHeader(<History className="h-5 w-5 text-emerald-600" />, 'Continue Shopping', 'Pick up where you left off')}
          <ProductCardGrid products={recentlyViewed.slice(0, 4)} />
        </section>
      )}

      {/* 6. Daily Essentials Shelf */}
      {dailyEssentialsProducts.length > 0 && (
        <section className="space-y-3">
          {renderSectionHeader(<Milk className="h-5 w-5 text-emerald-600" />, 'Daily Essentials', 'Milk, bread, butter, eggs & bakery')}
          <ProductCardGrid products={dailyEssentialsProducts} />
        </section>
      )}

      {/* 7. Pharmacy Shelf */}
      {pharmacyProducts.length > 0 && (
        <section className="space-y-3">
          {renderSectionHeader(<Pill className="h-5 w-5 text-emerald-600" />, 'Pharmacy Essentials', 'OTC medicines, wellness, and personal care')}
          <ProductCardGrid products={pharmacyProducts} />
        </section>
      )}

      {/* 8. Fresh Produce Shelf */}
      {freshProduceProducts.length > 0 && (
        <section className="space-y-3">
          {renderSectionHeader(<Apple className="h-5 w-5 text-emerald-600" />, 'Fresh Fruits & Vegetables', 'Farm-fresh organic vegetables and seasonal fruits')}
          <ProductCardGrid products={freshProduceProducts} />
        </section>
      )}

      {/* 9. Personal Care Shelf */}
      {personalCareProducts.length > 0 && (
        <section className="space-y-3">
          {renderSectionHeader(<Apple className="h-5 w-5 text-emerald-600" />, 'Personal Care & Hygiene', 'Skincare, haircare, and personal hygiene')}
          <ProductCardGrid products={personalCareProducts} />
        </section>
      )}
    </motion.div>
    </>
  );
};

export default HomeScreen;

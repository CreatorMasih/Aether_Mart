import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Store as StoreIcon, MapPin, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCustomerStore } from '../store/customer-store';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { StoreCardGrid } from './StoreCardGrid';
import { pageTransition } from '../../../core/theme/animations';
import { SEOHead } from '../../../components/seo/SEOHead';

/**
 * Full listing of stores delivering near the customer's selected location.
 * Reached from the "View All" link on the home screen's "Available Stores
 * Near You" section. Reuses the same home-feed endpoint (which already returns
 * all nearby open stores) so no extra backend route is required.
 */
export const StoresListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedAddress } = useCustomerStore();

  const lat = selectedAddress?.coordinates?.latitude ?? 21.1085;
  const lng = selectedAddress?.coordinates?.longitude ?? 82.0965;
  const isServiceable = selectedAddress ? selectedAddress.isServiceable !== false : true;

  const { data: homeFeed, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.homeFeed(lat, lng),
    queryFn: () => catalogService.getHomeFeed(lat, lng),
    enabled: isServiceable,
  });

  const stores = homeFeed?.nearbyStores ?? [];

  if (!isServiceable) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
          <MapPin className="h-8 w-8" />
        </div>
        <h2 className="text-sm font-bold text-text-primary font-heading">Location Not Serviceable</h2>
        <p className="text-xs text-text-secondary max-w-xs">
          Aether Mart is currently available only in Mahasamund. Please change your location to browse stores.
        </p>
        <button
          onClick={() => navigate('/c/home')}
          className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-xl cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
        <p className="text-xs text-text-secondary font-semibold">Loading nearby stores...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-sm font-bold text-text-primary font-heading">Failed to Load Stores</h2>
        <p className="text-xs text-text-secondary max-w-xs">An error occurred while fetching nearby stores.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-xl cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Stores Near You | Aether Mart"
        description="Browse all local stores delivering near you in Mahasamund on Aether Mart."
        canonicalUrl="https://aether-mart-six.vercel.app/c/stores"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/c/home')}
              className="p-2 rounded-xl border border-border-primary bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary cursor-pointer transition-all"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
                <StoreIcon className="h-5 w-5 text-brand-emerald" />
                Stores Near You
              </h1>
              <p className="text-xs text-text-secondary mt-0.5 font-semibold">
                {stores.length} {stores.length === 1 ? 'store' : 'stores'} delivering in Mahasamund
              </p>
            </div>
          </div>
        </div>

        {stores.length > 0 ? (
          <StoreCardGrid stores={stores} />
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-border-primary bg-bg-tertiary text-center space-y-2">
            <h3 className="text-sm font-bold text-text-primary">No stores available nearby yet</h3>
            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              More local Mahasamund stores are coming soon. Please check back later.
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default StoresListingPage;

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  Star,
  Truck,
  AlertTriangle,
  Search,
  ArrowLeft,
  Store as StoreIcon,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { useCustomerStore } from '../store/customer-store';
import { ProductCardGrid } from './ProductCardGrid';
import { formatCurrency } from '../../../utils/formatters';
import { pageTransition } from '../../../core/theme/animations';

export const StoreDetailsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { selectedAddress } = useCustomerStore();
  const [storeSearch, setStoreSearch] = useState('');

  const lat = selectedAddress?.coordinates?.latitude;
  const lng = selectedAddress?.coordinates?.longitude;

  // 1. Fetch Store Info
  const { data: store, isLoading: isStoreLoading, isError: isStoreError } = useQuery({
    queryKey: ['storeDetails', storeId, lat, lng],
    queryFn: () => catalogService.getStoreById(storeId!, lat, lng),
    enabled: !!storeId,
  });

  // 2. Fetch Store Products
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: queryKeys.products({ storeId, search: storeSearch || undefined }),
    queryFn: () => catalogService.getProducts({ storeId, search: storeSearch || undefined, limit: 24 }),
    enabled: !!storeId,
  });

  if (isStoreLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
        <p className="text-xs text-text-secondary font-semibold">Loading merchant storefront...</p>
      </div>
    );
  }

  if (isStoreError || !store) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-status-error/10 text-status-error">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-text-primary font-heading">Store Not Found</h2>
        <p className="text-xs text-text-secondary">We couldn't locate this merchant store in our directory.</p>
        <button
          onClick={() => navigate('/c/home')}
          className="px-4 py-2 bg-text-primary text-bg-secondary text-xs font-bold rounded-xl cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const isClosed = store.isOpen === false || store.isPaused || store.isHoliday;
  const products = productsData?.products ?? [];

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 pb-12"
    >
      {/* Back button header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Stores
      </button>

      {/* Store Hero Card */}
      <div className="rounded-2xl border border-border-primary bg-bg-secondary overflow-hidden shadow-subtle relative">
        {/* Cover banner image */}
        <div className="h-36 sm:h-48 w-full bg-bg-tertiary relative overflow-hidden">
          <img
            src={store.coverImageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'}
            alt={store.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent" />
        </div>

        {/* Store Metadata info overlay */}
        <div className="p-6 pt-0 relative -mt-12 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 rounded-2xl bg-bg-secondary border-2 border-border-primary overflow-hidden flex items-center justify-center text-3xl shadow-high shrink-0">
                {store.logoUrl &&
                typeof store.logoUrl === 'string' &&
                (store.logoUrl.startsWith('http://') ||
                  store.logoUrl.startsWith('https://') ||
                  store.logoUrl.startsWith('data:image/')) ? (
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{store.logoUrl && store.logoUrl.length <= 4 ? store.logoUrl : '🏪'}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-text-primary font-heading leading-tight">
                    {store.name}
                  </h1>
                  {isClosed ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-status-error/10 text-status-error uppercase tracking-wider">
                      Closed
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald uppercase tracking-wider">
                      Open Now
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary font-semibold mt-0.5">
                  {store.category || 'Grocery & Essentials'}
                </p>
              </div>
            </div>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-semibold">
            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-primary/60 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-emerald shrink-0" />
              <div>
                <p className="text-[9px] text-text-secondary font-bold uppercase">Distance</p>
                <p className="text-text-primary font-bold">{store.distance ? `${store.distance} km away` : store.address}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-primary/60 flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-emerald shrink-0" />
              <div>
                <p className="text-[9px] text-text-secondary font-bold uppercase">Operating Hours</p>
                <p className="text-text-primary font-bold">{store.openingTime || '08:00'} - {store.closingTime || '22:00'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-primary/60 flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-emerald shrink-0" />
              <div>
                <p className="text-[9px] text-text-secondary font-bold uppercase">Delivery Fee</p>
                <p className="text-text-primary font-bold">{store.deliveryFee === 0 ? 'FREE' : formatCurrency(store.deliveryFee || 20)}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-bg-tertiary border border-border-primary/60 flex items-center gap-2">
              <Star className="h-4 w-4 text-status-warning fill-status-warning shrink-0" />
              <div>
                <p className="text-[9px] text-text-secondary font-bold uppercase">Rating & Radius</p>
                <p className="text-text-primary font-bold">{store.rating && store.rating > 0 ? `${store.rating} ★` : 'New Store'} ({store.deliveryRadiusKm || 5} km radius)</p>
              </div>
            </div>
          </div>

          {isClosed && (
            <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/20 flex items-center gap-2 text-xs font-semibold text-status-error">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>This store is currently closed and not accepting orders. Opens at {store.openingTime || '09:00 AM'}.</span>
            </div>
          )}
        </div>
      </div>

      {/* In-Store Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder={`Search products within ${store.name}...`}
          value={storeSearch}
          onChange={(e) => setStoreSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border-primary bg-bg-secondary text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
        />
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-text-secondary" />
      </div>

      {/* Store Products Catalog */}
      <section className="space-y-4">
        <h2 className="text-sm font-extrabold text-text-primary font-heading flex items-center gap-2">
          <StoreIcon className="h-4 w-4 text-brand-emerald" />
          Products from {store.name} ({products.length})
        </h2>

        {isProductsLoading ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center p-6 space-y-2">
            <div className="h-6 w-6 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
            <p className="text-xs text-text-secondary font-semibold">Loading products...</p>
          </div>
        ) : products.length > 0 ? (
          <ProductCardGrid products={products} />
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border-primary bg-bg-secondary space-y-2">
            <p className="text-xs text-text-secondary font-semibold">No products found matching your search in this store.</p>
            {storeSearch && (
              <button
                onClick={() => setStoreSearch('')}
                className="text-xs font-bold text-brand-emerald hover:underline cursor-pointer"
              >
                Clear Store Search
              </button>
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
};

export default StoreDetailsPage;

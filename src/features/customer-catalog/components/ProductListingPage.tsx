import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Grid3X3, 
  List, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Heart, 
  Plus, 
  Minus, 
  Clock, 
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerStore } from '../store/customer-store';
import { useCartMutations } from '../../customer-checkout/hooks/useCartMutations';
import { useCart } from '../../customer-checkout/hooks/useCart';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { useToast } from '../../../hooks/useToast';
import { catalogService } from '../services/catalog-service';
import { queryKeys } from '../../../core/network/queryKeys';
import { formatCurrency, formatWeight } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { pageTransition, cardHover } from '../../../core/theme/animations';
import type { CatalogProduct } from '../services/catalog-mappers';

import { NotServiceableState } from '../../../components/ui/NotServiceableState';
import { LocationPickerModal } from '../../../components/ui/LocationPickerModal';

export const ProductListingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { selectedAddress, toggleWishlist: storeToggleWishlist } = useCustomerStore();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const isServiceable = selectedAddress ? selectedAddress.isServiceable !== false : true;
  const { addToCart, updateQuantity } = useCartMutations();
  const { items: cartItems } = useCart();

  // Layout View Switch: 'GRID' or 'LIST'
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Sorting State
  const [sortBy, setSortBy] = useState<'POPULARITY' | 'PRICE_LOW' | 'PRICE_HIGH' | 'RATING'>('POPULARITY');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Filters State
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [filterInStock, setFilterInStock] = useState(false);
  const [priceRange, setPriceRange] = useState<number>(1000);

  // Pagination / Load More State
  const [page, setPage] = useState(1);
  const [accumulatedProducts, setAccumulatedProducts] = useState<CatalogProduct[]>([]);

  // Fetch Categories for page title
  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => catalogService.getCategories(),
  });

  const activeCategory = useMemo(() => {
    if (!slug || !categories) return null;
    return categories.find(c => c.slug === slug) || null;
  }, [slug, categories]);

  // Fetch Wishlist for highlighting active state
  const { data: wishlistData } = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: () => catalogService.getWishlist(),
  });
  const wishlist = wishlistData || [];

  // Centralized toggle wishlist mutation
  const toggleWishlistMutation = useMutation({
    mutationFn: async (product: CatalogProduct) => {
      const isWishlisted = wishlist.some(item => item.id === product.id);
      if (isWishlisted) {
        return catalogService.removeFromWishlist(product.id);
      } else {
        return catalogService.addToWishlist(product.id);
      }
    },
    onMutate: async (product: CatalogProduct) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: queryKeys.wishlist() });
      const previousWishlist = queryClient.getQueryData<CatalogProduct[]>(queryKeys.wishlist()) || [];
      const exists = previousWishlist.some(item => item.id === product.id);
      const newWishlist = exists
        ? previousWishlist.filter(item => item.id !== product.id)
        : [...previousWishlist, product];
      queryClient.setQueryData(queryKeys.wishlist(), newWishlist);
      storeToggleWishlist(product);
      return { previousWishlist };
    },
    onError: (_err, _product, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.wishlist(), context.previousWishlist);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
    }
  });

  // Construct query parameter DTO
  const queryParams = useMemo(() => {
    return {
      page,
      limit: 8,
      category: slug && slug !== 'all' ? slug : undefined,
      search: searchQuery || undefined,
      organic: filterOrganic ? 'true' : undefined,
      inStock: filterInStock ? 'true' : undefined,
      maxPrice: priceRange < 1000 ? priceRange : undefined,
      sort: sortBy === 'PRICE_LOW' ? 'price_asc' 
          : sortBy === 'PRICE_HIGH' ? 'price_desc' 
          : sortBy === 'RATING' ? 'rating' 
          : 'popularity',
    };
  }, [page, slug, searchQuery, filterOrganic, filterInStock, priceRange, sortBy]);

  const { data: pageData, isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.products(queryParams),
    queryFn: () => catalogService.getProducts(queryParams),
    enabled: isServiceable,
  });

  // Reset page and products when parameters change
  useEffect(() => {
    setPage(1);
    setAccumulatedProducts([]);
  }, [slug, searchQuery, filterOrganic, filterInStock, priceRange, sortBy]);

  // Accumulate products list as page data updates
  useEffect(() => {
    if (pageData) {
      if (page === 1) {
        setAccumulatedProducts(pageData.products);
      } else {
        setAccumulatedProducts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = pageData.products.filter(p => !existingIds.has(p.id));
          return [...prev, ...newProducts];
        });
      }
    }
  }, [pageData, page]);

  const hasMore = pageData ? page < pageData.pages : false;

  const loadNextPage = () => {
    if (!hasMore || isFetching) return;
    setPage((prev) => prev + 1);
  };

  const { triggerRef } = useInfiniteScroll({
    loadMore: loadNextPage,
    hasMore,
    loading: isFetching,
    rootMargin: '150px',
  });

  const handleResetFilters = () => {
    setFilterOrganic(false);
    setFilterInStock(false);
    setPriceRange(1000);
    showToast({
      type: 'info',
      title: 'Filters Cleared',
      description: 'Showing all matching products.',
    });
  };

  const pageTitle = searchQuery 
    ? `Search Results for "${searchQuery}"` 
    : activeCategory?.name || 'All Catalog Products';

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

  if (isLoading && page === 1) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
        <p className="text-xs text-text-secondary font-semibold">Loading listing products...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-status-error/10 text-status-error">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-sm font-bold text-text-primary font-heading">Failed to Load Products</h2>
        <p className="text-xs text-text-secondary">Please check your internet connection and try reloading.</p>
        <button onClick={() => navigate('/c/home')} className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-lg cursor-pointer">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-primary pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight font-heading">
            {pageTitle}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5 font-semibold">
            {pageData?.total || 0} items found
          </p>
        </div>

        {/* Action button bar */}
        <div className="flex items-center gap-2 self-end sm:self-auto relative">
          
          {/* View Toggler */}
          <div className="flex rounded-lg border border-border-primary bg-bg-secondary p-0.5">
            <button
              onClick={() => setViewMode('GRID')}
              className={cn(
                "p-1.5 rounded-md cursor-pointer transition-all",
                viewMode === 'GRID' ? "bg-bg-tertiary text-brand-emerald" : "text-text-secondary hover:text-text-primary"
              )}
              aria-label="Grid view layout"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={cn(
                "p-1.5 rounded-md cursor-pointer transition-all",
                viewMode === 'LIST' ? "bg-bg-tertiary text-brand-emerald" : "text-text-secondary hover:text-text-primary"
              )}
              aria-label="List view layout"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Sort Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(prev => !prev)}
              className="px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary hover:border-text-secondary flex items-center gap-1.5 text-xs font-bold text-text-primary cursor-pointer select-none"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-text-secondary" />
              Sort
              <ChevronDown className="h-3 w-3 text-text-secondary" />
            </button>

            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-overlay" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border-primary bg-bg-secondary shadow-high py-1.5 z-drawer">
                  {[
                    { label: 'Popularity', value: 'POPULARITY' },
                    { label: 'Price: Low to High', value: 'PRICE_LOW' },
                    { label: 'Price: High to Low', value: 'PRICE_HIGH' },
                    { label: 'Customer Rating', value: 'RATING' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value as any);
                        setShowSortDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-xs font-bold cursor-pointer transition-colors",
                        sortBy === opt.value ? "text-brand-emerald bg-brand-emerald/5" : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Filter Drawer Toggle */}
          <button
            onClick={() => setShowFilterDrawer(true)}
            className={cn(
              "px-3 py-2 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
              (filterOrganic || filterInStock || priceRange < 1000)
                ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald"
                : "border-border-primary bg-bg-secondary text-text-primary hover:border-text-secondary"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
            {(filterOrganic || filterInStock || priceRange < 1000) && (
              <span className="h-2 w-2 rounded-full bg-brand-emerald animate-pulse" />
            )}
          </button>

        </div>
      </div>

      {/* 2. Products Grid / List Viewport */}
      {accumulatedProducts.length > 0 ? (
        <div className="space-y-6">
          {viewMode === 'GRID' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {accumulatedProducts.map((product) => {
                const isWishlisted = wishlist.some(item => item.id === product.id);
                const cartItem = cartItems.find(item => item.productId === product.id && !item.variantId);
                const quantity = cartItem?.quantity || 0;
                
                const hasDiscount = product.discountPrice !== undefined;
                const discountPct = hasDiscount
                  ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    variants={cardHover}
                    initial="initial"
                    whileHover="hover"
                    className="rounded-2xl border border-border-primary bg-bg-secondary p-3 flex flex-col justify-between shadow-subtle relative overflow-hidden group select-none"
                  >
                    {/* Wishlist Button */}
                    <button
                      onClick={() => toggleWishlistMutation.mutate(product)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-bg-secondary/80 backdrop-blur-md border border-border-primary/40 text-text-secondary hover:text-status-error z-10 cursor-pointer"
                    >
                      <Heart className={cn("h-4 w-4 transition-transform active:scale-125", isWishlisted && "fill-status-error text-status-error")} />
                    </button>

                    <div onClick={() => navigate(`/c/product/${product.id}`)} className="cursor-pointer space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-bg-tertiary relative">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {hasDiscount && (
                          <span className="absolute bottom-2 left-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error text-white font-heading">
                            {discountPct}% OFF
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-[9px] text-text-secondary font-bold uppercase tracking-wider flex items-center gap-1">
                          {product.weightGrams ? formatWeight(product.weightGrams, 'g') : product.unit}
                          <span className="h-1 w-1 rounded-full bg-border-primary" />
                          <span className="text-brand-emerald font-extrabold flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            10 min
                          </span>
                        </p>
                        <h4 className="text-xs font-bold text-text-primary mt-0.5 leading-tight line-clamp-2">{product.name}</h4>
                        {product.stock <= 4 && product.stock > 0 && (
                          <p className="text-[9px] text-status-error font-bold mt-1">Only {product.stock} left in stock</p>
                        )}
                        {product.stock === 0 && (
                          <p className="text-[9px] text-text-secondary font-bold mt-1 uppercase tracking-wider">Out of stock</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary/60">
                      <span className="text-sm font-extrabold text-text-primary font-heading">
                        {formatCurrency(product.discountPrice || product.price)}
                      </span>
                      {product.stock > 0 ? (
                        quantity > 0 ? (
                          <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-2 py-1 shadow-subtle">
                            <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity - 1 })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Minus className="h-3 w-3" /></button>
                            <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
                            <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity + 1 })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Plus className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart({ productId: product.id, quantity: 1 })} className="px-3 py-1.5 rounded-lg border border-brand-emerald/40 hover:border-brand-emerald bg-bg-secondary text-brand-emerald hover:bg-brand-emerald/5 text-xs font-bold cursor-pointer">ADD</button>
                        )
                      ) : (
                        <span className="text-[10px] font-bold text-text-secondary">LOCKED</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            // LIST VIEW
            <div className="space-y-3">
              {accumulatedProducts.map((product) => {
                const isWishlisted = wishlist.some(item => item.id === product.id);
                const cartItem = cartItems.find(item => item.productId === product.id && !item.variantId);
                const quantity = cartItem?.quantity || 0;
                
                const hasDiscount = product.discountPrice !== undefined;
                const discountPct = hasDiscount
                  ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    variants={cardHover}
                    initial="initial"
                    whileHover="hover"
                    className="rounded-2xl border border-border-primary bg-bg-secondary p-4 flex gap-4 shadow-subtle relative overflow-hidden select-none"
                  >
                    <div onClick={() => navigate(`/c/product/${product.id}`)} className="h-24 w-24 rounded-xl overflow-hidden bg-bg-tertiary relative cursor-pointer flex-shrink-0">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      {hasDiscount && (
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error text-white font-heading">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div onClick={() => navigate(`/c/product/${product.id}`)} className="cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-brand-emerald font-extrabold flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            10 mins delivery
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-text-primary mt-1 truncate">{product.name}</h4>
                        <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{product.description}</p>
                        <p className="text-[9px] text-text-secondary font-bold mt-1 uppercase tracking-wider">
                          {product.weightGrams ? formatWeight(product.weightGrams, 'g') : product.unit}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-primary/60">
                        <span className="text-sm font-extrabold text-text-primary font-heading">
                          {formatCurrency(product.discountPrice || product.price)}
                        </span>
                        {product.stock > 0 ? (
                          quantity > 0 ? (
                            <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-2.5 py-1 shadow-subtle">
                              <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity - 1 })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Minus className="h-3 w-3" /></button>
                              <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
                              <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity + 1 })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Plus className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart({ productId: product.id, quantity: 1 })} className="px-4 py-1.5 rounded-lg border border-brand-emerald/40 hover:border-brand-emerald bg-bg-secondary text-brand-emerald hover:bg-brand-emerald/5 text-xs font-bold cursor-pointer">ADD</button>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-text-secondary uppercase">Out of Stock</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleWishlistMutation.mutate(product)}
                      className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-bg-tertiary text-text-secondary hover:text-status-error cursor-pointer"
                    >
                      <Heart className={cn("h-4 w-4", isWishlisted && "fill-status-error text-status-error")} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* 3. Infinite scroll loader element */}
          {hasMore && (
            <div ref={triggerRef} className="flex justify-center py-6">
              <div className="h-5 w-5 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      ) : (
        // 4. Empty search / catalog state
        <div className="p-12 text-center rounded-2xl border border-dashed border-border-primary bg-bg-secondary max-w-sm mx-auto space-y-3">
          <div className="p-3 bg-bg-tertiary rounded-full w-fit mx-auto text-text-secondary">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-sm font-bold text-text-primary">No products available in this store yet.</h3>
          <p className="text-xs text-text-secondary">
            Check back soon or try searching for another item.
          </p>
          <button
            onClick={handleResetFilters}
            className="text-xs font-bold text-brand-emerald hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 5. Right Sidebar Filter Drawer Overlay */}
      {showFilterDrawer && (
        <>
          <div className="fixed inset-0 bg-overlay-bg backdrop-blur-sm z-overlay" onClick={() => setShowFilterDrawer(false)} />
          <motion.div
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-bg-secondary border-l border-border-primary p-6 shadow-high z-drawer flex flex-col justify-between"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border-primary pb-3">
                <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Filter Catalog</h3>
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] font-bold text-status-error hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              {/* Price Range Filter Slider */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex justify-between">
                  Max Price
                  <span className="text-text-primary font-heading font-extrabold">{formatCurrency(priceRange)}</span>
                </label>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full accent-brand-emerald"
                />
              </div>

              {/* Organic Filter Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <label htmlFor="filterOrganic" className="text-xs font-bold text-text-primary block cursor-pointer">Organic Only</label>
                  <span className="text-[10px] text-text-secondary font-semibold">Show chemical-free certified produce</span>
                </div>
                <input
                  id="filterOrganic"
                  type="checkbox"
                  checked={filterOrganic}
                  onChange={(e) => setFilterOrganic(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
                />
              </div>

              {/* Stock Filter Toggle */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <label htmlFor="filterInStock" className="text-xs font-bold text-text-primary block cursor-pointer">In Stock Only</label>
                  <span className="text-[10px] text-text-secondary font-semibold">Hide locked or temporarily empty listings</span>
                </div>
                <input
                  id="filterInStock"
                  type="checkbox"
                  checked={filterInStock}
                  onChange={(e) => setFilterInStock(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
                />
              </div>

            </div>

            <button
              onClick={() => setShowFilterDrawer(false)}
              className="w-full py-3.5 bg-text-primary text-bg-secondary hover:bg-text-primary/90 font-bold text-xs rounded-xl cursor-pointer"
            >
              Apply Filters
            </button>
          </motion.div>
        </>
      )}

    </motion.div>
  );
};

export default ProductListingPage;

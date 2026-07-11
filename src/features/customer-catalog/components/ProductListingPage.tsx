import React, { useState, useMemo } from 'react';
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
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../services/mock-catalog-data';
import { useCustomerStore } from '../store/customer-store';
import { useCartStore } from '../../customer-checkout/store/cart-store';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency, formatWeight } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { pageTransition, cardHover } from '../../../core/theme/animations';

export const ProductListingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { wishlist, toggleWishlist } = useCustomerStore();
  const { items, addItem, updateQuantity } = useCartStore();

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

  // Pagination / Load More Simulation
  const [displayLimit, setDisplayLimit] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Match active category
  const activeCategory = useMemo(() => {
    if (!slug) return null;
    return MOCK_CATEGORIES.find(c => c.slug === slug) || null;
  }, [slug]);

  // Compute matched products
  const rawProducts = useMemo(() => {
    let list = [...MOCK_PRODUCTS];

    // Filter by Category slug
    if (slug && slug !== 'all') {
      list = list.filter(p => p.categorySlug === slug);
    }

    // Filter by Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    // Apply filters
    if (filterOrganic) {
      list = list.filter(p => p.isOrganic);
    }
    if (filterInStock) {
      list = list.filter(p => p.stock > 0);
    }
    list = list.filter(p => p.price <= priceRange);

    // Apply Sorting
    switch (sortBy) {
      case 'PRICE_LOW':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'PRICE_HIGH':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'RATING':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'POPULARITY':
      default:
        list.sort((a, b) => b.reviewsCount - a.reviewsCount);
        break;
    }

    return list;
  }, [slug, searchQuery, filterOrganic, filterInStock, priceRange, sortBy]);

  // Paginated subset
  const visibleProducts = useMemo(() => {
    return rawProducts.slice(0, displayLimit);
  }, [rawProducts, displayLimit]);

  const hasMore = visibleProducts.length < rawProducts.length;

  const loadNextPage = () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 4);
      setIsLoadingMore(false);
    }, 800);
  };

  const { triggerRef } = useInfiniteScroll({
    loadMore: loadNextPage,
    hasMore,
    loading: isLoadingMore,
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
            {rawProducts.length} items found
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
      {visibleProducts.length > 0 ? (
        <div className="space-y-6">
          {viewMode === 'GRID' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleProducts.map((product) => {
                const isWishlisted = wishlist.some(item => item.id === product.id);
                const cartItem = items.find(item => item.product.id === product.id && !item.selectedVariantId);
                const quantity = cartItem?.quantity || 0;
                
                // Calculate simulated discount
                const hasDiscount = product.priceHistory && product.priceHistory[0] > product.price;
                const discountPct = hasDiscount 
                  ? Math.round(((product.priceHistory![0] - product.price) / product.priceHistory![0]) * 100)
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    variants={cardHover}
                    initial="initial"
                    whileHover="hover"
                    className="rounded-2xl border border-border-primary bg-bg-secondary p-3 flex flex-col justify-between shadow-subtle relative overflow-hidden group select-none"
                  >
                    {/* Sponsored badge */}
                    {product.isSponsored && (
                      <span className="absolute top-3 left-3 text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-bg-secondary/90 border border-border-primary/40 text-text-secondary tracking-widest uppercase z-10">
                        SPONSORED
                      </span>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-bg-secondary/80 backdrop-blur-md border border-border-primary/40 text-text-secondary hover:text-status-error z-10 cursor-pointer"
                    >
                      <Heart className={cn("h-4 w-4 transition-transform active:scale-125", isWishlisted && "fill-status-error text-status-error")} />
                    </button>

                    <div onClick={() => navigate(`/c/product/${product.sku}`)} className="cursor-pointer space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-bg-tertiary relative">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {hasDiscount && (
                          <span className="absolute bottom-2 left-2 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error text-white shadow-subtle font-heading tracking-wide">
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
                      <span className="text-sm font-extrabold text-text-primary font-heading">{formatCurrency(product.price)}</span>
                      {product.stock > 0 ? (
                        quantity > 0 ? (
                          <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-2 py-1 shadow-subtle">
                            <button onClick={() => updateQuantity(product.id, quantity - 1)} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Minus className="h-3 w-3" /></button>
                            <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
                            <button onClick={() => updateQuantity(product.id, quantity + 1)} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Plus className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <button onClick={() => addItem(product)} className="px-3 py-1.5 rounded-lg border border-brand-emerald/40 hover:border-brand-emerald bg-bg-secondary text-brand-emerald hover:bg-brand-emerald/5 text-xs font-bold cursor-pointer">ADD</button>
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
              {visibleProducts.map((product) => {
                const isWishlisted = wishlist.some(item => item.id === product.id);
                const cartItem = items.find(item => item.product.id === product.id && !item.selectedVariantId);
                const quantity = cartItem?.quantity || 0;
                
                const hasDiscount = product.priceHistory && product.priceHistory[0] > product.price;
                const discountPct = hasDiscount 
                  ? Math.round(((product.priceHistory![0] - product.price) / product.priceHistory![0]) * 100)
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    variants={cardHover}
                    initial="initial"
                    whileHover="hover"
                    className="rounded-2xl border border-border-primary bg-bg-secondary p-4 flex gap-4 shadow-subtle relative overflow-hidden select-none"
                  >
                    <div onClick={() => navigate(`/c/product/${product.sku}`)} className="h-24 w-24 rounded-xl overflow-hidden bg-bg-tertiary relative cursor-pointer flex-shrink-0">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      {hasDiscount && (
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-status-error text-white font-heading">
                          {discountPct}% OFF
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div onClick={() => navigate(`/c/product/${product.sku}`)} className="cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          {product.isSponsored && (
                            <span className="text-[7px] font-extrabold px-1.5 py-0.5 rounded bg-bg-secondary border border-border-primary text-text-secondary tracking-widest uppercase">
                              SPONSORED
                            </span>
                          )}
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
                        <span className="text-sm font-extrabold text-text-primary font-heading">{formatCurrency(product.price)}</span>
                        {product.stock > 0 ? (
                          quantity > 0 ? (
                            <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-2.5 py-1 shadow-subtle">
                              <button onClick={() => updateQuantity(product.id, quantity - 1)} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Minus className="h-3 w-3" /></button>
                              <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
                              <button onClick={() => updateQuantity(product.id, quantity + 1)} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Plus className="h-3 w-3" /></button>
                            </div>
                          ) : (
                            <button onClick={() => addItem(product)} className="px-4 py-1.5 rounded-lg border border-brand-emerald/40 hover:border-brand-emerald bg-bg-secondary text-brand-emerald hover:bg-brand-emerald/5 text-xs font-bold cursor-pointer">ADD</button>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-text-secondary uppercase">Out of Stock</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleWishlist(product)}
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
          <h3 className="text-sm font-bold text-text-primary">No Matching Products</h3>
          <p className="text-xs text-text-secondary">
            We couldn't find any products matching your filters or query.
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

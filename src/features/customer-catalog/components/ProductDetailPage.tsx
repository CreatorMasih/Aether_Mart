import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Share2, 
  Clock, 
  Store, 
  ShieldCheck, 
  Star, 
  Check, 
  MapPin, 
  AlertTriangle,
  TrendingDown,
  ShoppingBag,
  Plus,
  Minus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerStore } from '../store/customer-store';
import { useCartMutations } from '../../customer-checkout/hooks/useCartMutations';
import { queryKeys } from '../../../core/network/queryKeys';
import { useToast } from '../../../hooks/useToast';
import { catalogService } from '../services/catalog-service';
import { formatCurrency, formatWeight } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';
import { ProductCardGrid } from './ProductCardGrid';
import type { CatalogProduct } from '../services/catalog-mappers';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>(); // slug maps to product id
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { addRecentlyViewed, toggleWishlist: storeToggleWishlist } = useCustomerStore();
  const { addToCart, updateQuantity } = useCartMutations();

  // Read cart items from React Query cache (single source of truth)
  const cartData = queryClient.getQueryData<import('../../../types').CartData>(queryKeys.cart());
  const cartItems = cartData?.items ?? [];

  const productId = slug || '';

  // 1. Fetch Product Details
  const { data: product, isLoading: isProductLoading, isError: isProductError } = useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: () => catalogService.getProductById(productId),
    enabled: !!productId,
  });

  // 2. Fetch Related Products
  const { data: relatedProducts } = useQuery({
    queryKey: queryKeys.relatedProducts(productId),
    queryFn: () => catalogService.getRelatedProducts(productId),
    enabled: !!productId,
  });

  // 3. Fetch Frequently Bought Together
  const { data: boughtTogether } = useQuery({
    queryKey: queryKeys.boughtTogether(productId),
    queryFn: () => catalogService.getFrequentlyBoughtTogether(productId),
    enabled: !!productId,
  });

  // 4. Fetch Reviews
  const { data: reviewsData } = useQuery({
    queryKey: queryKeys.reviews(productId),
    queryFn: () => catalogService.getProductReviews(productId, 1, 30),
    enabled: !!productId,
  });

  // 5. Fetch Wishlist
  const { data: wishlistData } = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: () => catalogService.getWishlist(),
  });
  const wishlist = wishlistData || [];

  const reviews = reviewsData || [];

  // Selected Variant (default to first variant if exists)
  const [selectedVariant, setSelectedVariant] = useState<import('../../../types').ProductVariant | null>(null);

  // Pincode Verification State
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<'IDLE' | 'LOADING' | 'VERIFIED' | 'FAILED'>('IDLE');

  // Full-screen image preview
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Active Specifications Accordion Tab
  const [activeTab, setActiveTab] = useState<'DESCRIPTION' | 'SPECS' | 'NUTRITION' | 'RETURN'>('DESCRIPTION');

  // Review Filters
  const [selectedReviewRating, setSelectedReviewRating] = useState<number | null>(null);
  const [reviewSort, setReviewSort] = useState<'RECENT' | 'HIGH' | 'LOW'>('RECENT');

  // Sync initial state and track recently viewed logs
  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(null);
      }
    }
  }, [product, addRecentlyViewed]);

  // Wishlist toggle mutation
  const toggleWishlistMutation = useMutation({
    mutationFn: async (targetProduct: CatalogProduct) => {
      const isWishlisted = wishlist.some(item => item.id === targetProduct.id);
      if (isWishlisted) {
        return catalogService.removeFromWishlist(targetProduct.id);
      } else {
        return catalogService.addToWishlist(targetProduct.id);
      }
    },
    onMutate: async (targetProduct) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.wishlist() });
      const previousWishlist = queryClient.getQueryData<CatalogProduct[]>(queryKeys.wishlist()) || [];
      const exists = previousWishlist.some(item => item.id === targetProduct.id);
      const newWishlist = exists
        ? previousWishlist.filter(item => item.id !== targetProduct.id)
        : [...previousWishlist, targetProduct];
      queryClient.setQueryData(queryKeys.wishlist(), newWishlist);
      storeToggleWishlist(targetProduct);
      return { previousWishlist };
    },
    onError: (_err, _targetProduct, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.wishlist(), context.previousWishlist);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      queryClient.invalidateQueries({ queryKey: ['homeFeed'] });
    }
  });

  // Calculations
  const isWishlisted = useMemo(() => {
    if (!product) return false;
    return wishlist.some(item => item.id === product.id);
  }, [product, wishlist]);

  const activePrice = selectedVariant ? selectedVariant.price : (product?.price || 0);
  const activeStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
  const activeWeight = selectedVariant ? selectedVariant.weightGrams : (product?.weightGrams || 0);

  const cartItem = cartItems.find(
    (item) => item.productId === product?.id && item.variantId === (selectedVariant?.id ?? null)
  );
  const quantity = cartItem?.quantity || 0;

  const bundleProduct = boughtTogether?.[0] || null;

  // Dynamic rating summary computed from reviews
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const reviewsCount = reviews.length;

  if (isProductLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="h-8 w-8 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
        <p className="text-xs text-text-secondary font-semibold">Loading product specifications...</p>
      </div>
    );
  }

  if (isProductError || !product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-3 rounded-full bg-status-error/10 text-status-error">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-text-primary font-heading">Product Not Found</h2>
        <p className="text-xs text-text-secondary">We couldn't retrieve the specifications for this item.</p>
        <button onClick={() => navigate('/c/home')} className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-lg cursor-pointer">
          Return to Storefront
        </button>
      </div>
    );
  }

  const handleShareProduct = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    showToast({
      type: 'success',
      title: 'Link Copied',
      description: 'Product URL copied to clipboard.',
    });
  };

  const handleVerifyPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      showToast({
        type: 'error',
        title: 'Invalid Pincode',
        description: 'Please enter a valid 6-digit postal code.',
      });
      return;
    }
    setPincodeStatus('LOADING');
    setTimeout(() => {
      if (pincode.startsWith('56')) {
        setPincodeStatus('VERIFIED');
        showToast({
          type: 'success',
          title: 'Delivery Available',
          description: 'Standard 10-minute delivery is active for this pincode.',
        });
      } else {
        setPincodeStatus('FAILED');
        showToast({
          type: 'error',
          title: 'Unserviceable Area',
          description: 'Aether Mart fleet does not operate in this pincode yet.',
        });
      }
    }, 1000);
  };

  const handleAddBundle = () => {
    if (!bundleProduct) return;
    addToCart({ productId: product.id, variantId: selectedVariant?.id, quantity: 1 });
    if (bundleProduct) {
      addToCart({ productId: bundleProduct.id, quantity: 1 });
    }
    showToast({
      type: 'success',
      title: 'Bundle Added to Cart',
      description: `Added ${product.name} and ${bundleProduct.name} to your cart.`,
    });
  };

  // Filtered reviews
  const filteredReviews = reviews.filter(rev => {
    if (selectedReviewRating === null) return true;
    return rev.rating === selectedReviewRating;
  }).sort((a, b) => {
    if (reviewSort === 'HIGH') return b.rating - a.rating;
    if (reviewSort === 'LOW') return a.rating - b.rating;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const hasDiscount = product.discountPrice !== undefined;
  const discountPct = hasDiscount
    ? Math.round(((product.price - product.discountPrice!) / product.price) * 100)
    : 0;

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8 pb-20 md:pb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left pane: Image Gallery & Previews */}
        <div className="space-y-4">
          <div 
            onClick={() => setShowImagePreview(true)}
            className="aspect-square w-full rounded-2xl overflow-hidden bg-bg-secondary border border-border-primary flex items-center justify-center cursor-zoom-in relative select-none"
          >
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            {product.isOrganic && (
              <span className="absolute bottom-4 left-4 text-[9px] font-extrabold px-2.5 py-1 rounded bg-brand-emerald text-white shadow-high tracking-wider uppercase font-heading">
                ORGANIC
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-secondary text-center font-semibold">
            Click image to open full-screen preview with pinch-to-zoom
          </p>
        </div>

        {/* Right pane: Product Purchase Console */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-brand-emerald uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                12-18 min delivery
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleWishlistMutation.mutate(product)}
                  className="p-2 rounded-lg border border-border-primary bg-bg-secondary text-text-secondary hover:text-status-error cursor-pointer"
                >
                  <Heart className={cn("h-4.5 w-4.5", isWishlisted && "fill-status-error text-status-error")} />
                </button>
                <button
                  onClick={handleShareProduct}
                  className="p-2 rounded-lg border border-border-primary bg-bg-secondary text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight font-heading mt-2 leading-tight">
              {product.name}
            </h1>
            <p className="text-xs text-text-secondary mt-1 font-semibold leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Pricing with dynamic tags */}
          <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Best Price</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-text-primary font-heading">
                  {formatCurrency(product.discountPrice || activePrice)}
                </span>
                {hasDiscount && (
                  <span className="text-xs font-bold text-text-secondary line-through">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Price drop tag */}
            {hasDiscount && (
              <span className="px-2.5 py-1.5 rounded-lg bg-brand-emerald/10 text-brand-emerald text-xs font-extrabold flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                {discountPct}% Off
              </span>
            )}
          </div>

          {/* Variants Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Select Variation</span>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                        isSelected 
                          ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" 
                          : "border-border-primary bg-bg-secondary text-text-primary hover:border-text-secondary"
                      )}
                    >
                      {v.name} — {formatCurrency(v.price)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live stock and delivery metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-border-primary bg-bg-tertiary flex items-center gap-2">
              <Store className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-[9px] text-text-secondary uppercase tracking-wider font-bold">Store Merchant</p>
                <p className="font-bold text-text-primary mt-0.5 truncate max-w-[120px]">
                  {product.storeInfo?.name ?? 'Aether Store'}
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl border border-border-primary bg-bg-tertiary flex items-center gap-2">
              {activeStock === 0 ? (
                <AlertTriangle className="h-4 w-4 text-status-error" />
              ) : (
                <ShieldCheck className="h-4 w-4 text-brand-emerald" />
              )}
              <div>
                <p className="text-[9px] text-text-secondary uppercase tracking-wider font-bold">Stock Status</p>
                <p className={cn("font-bold mt-0.5", activeStock <= 4 && activeStock > 0 ? "text-status-error" : "text-text-primary")}>
                  {activeStock === 0 ? 'Out of Stock' : activeStock <= 4 ? `Only ${activeStock} left` : 'In Stock'}
                </p>
              </div>
            </div>
          </div>

          {/* Pincode Availability Checker */}
          <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary space-y-3">
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-text-secondary" />
              Check Delivery Area
            </span>

            <form onSubmit={handleVerifyPincode} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Pincode (e.g. 560034)"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                className="flex-1 px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald"
              />
              <button
                type="submit"
                disabled={pincodeStatus === 'LOADING'}
                className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/90 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
              >
                CHECK
              </button>
            </form>

            {pincodeStatus === 'VERIFIED' && (
              <p className="text-[10px] text-brand-emerald font-bold flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Delivery is active to your coordinates.
              </p>
            )}
            {pincodeStatus === 'FAILED' && (
              <p className="text-[10px] text-status-error font-bold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Pincode is not currently serviced by our riders.
              </p>
            )}
          </div>

          {/* Desktop Purchase Button */}
          {activeStock > 0 ? (
            quantity > 0 ? (
              <div className="hidden md:flex items-center justify-between border border-border-primary p-3 rounded-xl bg-bg-tertiary">
                <span className="text-xs font-bold text-text-secondary">Quantity in cart</span>
                <div className="flex items-center gap-3 bg-brand-emerald text-white rounded-lg px-3 py-1.5 shadow-subtle">
                  <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity - 1, variantId: selectedVariant?.id })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Minus className="h-4 w-4" /></button>
                  <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
                  <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity + 1, variantId: selectedVariant?.id })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => addToCart({ productId: product.id, variantId: selectedVariant?.id, quantity: 1 })}
                className="hidden md:flex w-full py-4 bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-sm rounded-xl items-center justify-center gap-2 shadow-subtle cursor-pointer transition-all"
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                Add to Shopping Cart
              </button>
            )
          ) : (
            <button disabled className="hidden md:block w-full py-4 bg-bg-tertiary text-text-secondary font-bold text-sm rounded-xl cursor-not-allowed">
              LOCKED / OUT OF STOCK
            </button>
          )}

        </div>
      </div>

      {/* Specifications Accordion and Tabs */}
      <div className="border border-border-primary rounded-2xl bg-bg-secondary overflow-hidden">
        <div className="flex border-b border-border-primary bg-bg-tertiary/50">
          {[
            { label: 'Details', value: 'DESCRIPTION' },
            { label: 'Ingredients', value: 'SPECS' },
            { label: 'Nutrition', value: 'NUTRITION' },
            { label: 'Returns', value: 'RETURN' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as any)}
              className={cn(
                "flex-1 py-3 text-xs font-bold cursor-pointer border-b-2 transition-all",
                activeTab === tab.value 
                  ? "border-brand-emerald text-brand-emerald bg-bg-secondary" 
                  : "border-transparent text-text-secondary hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 text-xs leading-relaxed text-text-secondary space-y-4">
          {activeTab === 'DESCRIPTION' && (
            <div>
              <h4 className="font-bold text-text-primary mb-1">Product Overview</h4>
              <p>{product.description}</p>
            </div>
          )}

          {activeTab === 'SPECS' && (
            <div>
              <h4 className="font-bold text-text-primary mb-1">Ingredients List</h4>
              <p>Refer packaging details for specific compositions.</p>
              {product.fssaiCode && (
                <div className="mt-4 p-3 rounded-lg border border-border-primary bg-bg-tertiary flex items-center gap-2">
                  <span className="text-lg">🌱</span>
                  <div>
                    <p className="font-bold text-text-primary leading-none">FSSAI Certified</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">License: {product.fssaiCode}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'NUTRITION' && (
            <div>
              {product.calories || product.proteinGrams || product.carbGrams || product.fatGrams ? (
                <div className="max-w-xs border border-border-primary rounded-xl overflow-hidden">
                  <div className="bg-bg-tertiary p-3 border-b border-border-primary font-bold text-text-primary">
                    Nutritional Information (Approx per 100g)
                  </div>
                  <div className="divide-y divide-border-primary">
                    {[
                      { label: 'Energy (Calories)', value: product.calories ? `${product.calories} kcal` : '--' },
                      { label: 'Protein', value: product.proteinGrams ? `${product.proteinGrams} g` : '--' },
                      { label: 'Carbohydrates', value: product.carbGrams ? `${product.carbGrams} g` : '--' },
                      { label: 'Fat', value: product.fatGrams ? `${product.fatGrams} g` : '--' },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3 flex justify-between font-semibold">
                        <span className="text-text-secondary">{item.label}</span>
                        <span className="text-text-primary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p>Nutritional values do not apply to this category class.</p>
              )}
            </div>
          )}

          {activeTab === 'RETURN' && (
            <div>
              <h4 className="font-bold text-text-primary mb-1">Return & Refund Policy</h4>
              <p>Non-returnable item. Instant cancellations and refunds apply for spoiled products on arrival.</p>
            </div>
          )}
        </div>
      </div>

      {/* Frequently Bought Together Bundle */}
      {bundleProduct && (
        <section className="p-5 rounded-2xl border border-brand-emerald/20 bg-gradient-to-br from-brand-emerald/5 via-bg-secondary to-bg-secondary space-y-4">
          <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Frequently Bought Together</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Main Item */}
            <div className="p-3 border border-border-primary rounded-xl bg-bg-secondary flex items-center gap-3 w-full sm:max-w-xs">
              <div className="h-12 w-12 rounded-lg bg-bg-tertiary overflow-hidden flex-shrink-0">
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{product.name}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{formatCurrency(activePrice)}</p>
              </div>
            </div>

            <span className="text-lg font-bold text-text-secondary">+</span>

            {/* Bundle Item */}
            <div className="p-3 border border-border-primary rounded-xl bg-bg-secondary flex items-center gap-3 w-full sm:max-w-xs">
              <div className="h-12 w-12 rounded-lg bg-bg-tertiary overflow-hidden flex-shrink-0">
                <img src={bundleProduct.imageUrl} alt={bundleProduct.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{bundleProduct.name}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{formatCurrency(bundleProduct.price)}</p>
              </div>
            </div>

            {/* Add Bundle button */}
            <button
              onClick={handleAddBundle}
              className="py-2.5 px-4 rounded-xl bg-brand-emerald text-white hover:bg-brand-emerald-hover text-xs font-bold cursor-pointer w-full sm:w-auto ml-auto flex items-center justify-center gap-1.5"
            >
              Add Bundle to Cart
            </button>
          </div>
        </section>
      )}

      {/* Related Products Grid */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Customers Also Bought</h3>
          <ProductCardGrid products={relatedProducts.slice(0, 4)} />
        </section>
      )}

      {/* Customer Reviews Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Reviews & Ratings</h3>
          <div className="flex items-center gap-2">
            {['RECENT', 'HIGH', 'LOW'].map((sort) => (
              <button
                key={sort}
                onClick={() => setReviewSort(sort as any)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all",
                  reviewSort === sort 
                    ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" 
                    : "border-border-primary text-text-secondary hover:text-text-primary bg-bg-secondary"
                )}
              >
                {sort === 'RECENT' ? 'Recent' : sort === 'HIGH' ? 'Top Rated' : 'Lowest Rated'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overall breakdown card */}
          <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold text-text-primary font-heading">{avgRating}</span>
            <div className="flex items-center gap-0.5 text-status-warning mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className={cn("h-4 w-4", star <= Math.round(avgRating) ? "fill-status-warning text-status-warning" : "text-border-primary")} />
              ))}
            </div>
            <p className="text-[10px] text-text-secondary font-bold mt-2 uppercase tracking-wider">{reviewsCount} customer reviews</p>
          </div>

          {/* Rating distribution chart */}
          <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary md:col-span-2 space-y-2 text-xs font-semibold text-text-secondary">
            {[5, 4, 3, 2, 1].map((stars) => {
              const matchingCount = reviews.filter(r => r.rating === stars).length;
              const pct = reviews.length > 0 ? Math.round((matchingCount / reviews.length) * 100) : 0;
              const isSelected = selectedReviewRating === stars;
              return (
                <button
                  key={stars}
                  onClick={() => setSelectedReviewRating(prev => prev === stars ? null : stars)}
                  className={cn(
                    "w-full flex items-center gap-3 p-1 rounded hover:bg-bg-tertiary transition-colors cursor-pointer text-left",
                    isSelected && "bg-brand-emerald/5 text-brand-emerald"
                  )}
                >
                  <span className="min-w-10 text-right">{stars} Star</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-tertiary overflow-hidden">
                    <div className="h-full bg-status-warning" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="min-w-8">{pct}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reviews Listing */}
        {filteredReviews.length > 0 ? (
          <div className="divide-y divide-border-primary border border-border-primary rounded-2xl bg-bg-secondary overflow-hidden">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="p-4 space-y-2 text-xs font-semibold">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary">{rev.userName}</span>
                    {rev.isVerifiedPurchase && (
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald tracking-wide flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5" /> VERIFIED
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-secondary font-semibold">{rev.date}</span>
                </div>

                <div className="flex items-center gap-0.5 text-status-warning">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={cn("h-3 w-3", star <= rev.rating ? "fill-status-warning text-status-warning" : "text-border-primary")} />
                  ))}
                </div>

                <p className="text-text-secondary">{rev.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl">
            <p className="text-xs text-text-secondary">No customer reviews matched this selection.</p>
          </div>
        )}
      </section>

      {/* Mobile Sticky Add to Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-sticky bg-bg-secondary/90 backdrop-blur-md border-t border-border-primary p-4 flex items-center justify-between md:hidden shadow-high pointer-events-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{activeWeight ? formatWeight(activeWeight, 'g') : product.unit}</span>
          <span className="text-base font-extrabold text-text-primary font-heading">{formatCurrency(activePrice)}</span>
        </div>

        {activeStock > 0 ? (
          quantity > 0 ? (
            <div className="flex items-center gap-3 bg-brand-emerald text-white rounded-xl px-3 py-2 shadow-subtle">
              <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity - 1, variantId: selectedVariant?.id })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Minus className="h-4 w-4" /></button>
              <span className="text-xs font-extrabold font-heading min-w-4 text-center">{quantity}</span>
              <button onClick={() => updateQuantity({ productId: product.id, quantity: quantity + 1, variantId: selectedVariant?.id })} className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer"><Plus className="h-4 w-4" /></button>
            </div>
          ) : (
            <button
              onClick={() => addToCart({ productId: product.id, variantId: selectedVariant?.id, quantity: 1 })}
              className="py-3 px-6 bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-xs rounded-xl shadow-subtle cursor-pointer"
            >
              Add to Cart
            </button>
          )
        ) : (
          <span className="text-xs font-bold text-status-error">Out of Stock</span>
        )}
      </div>

      {/* Full Screen Image Modal Gallery */}
      {showImagePreview && (
        <div 
          onClick={() => setShowImagePreview(false)}
          className="fixed inset-0 bg-black/95 z-overlay flex items-center justify-center p-6 cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[90vh] pointer-events-none">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain rounded-xl" />
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default ProductDetailPage;

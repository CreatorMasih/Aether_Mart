import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Trash2,
  Gift,
  Check,
  Plus,
  Minus,
  ChevronRight,
  Leaf,
  Store,
  DollarSign,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { cartService } from '../services/cart-service';
import { useCartMutations } from '../hooks/useCartMutations';
import { useDrawerStore } from '../../../components/ui/drawer-manager/drawer-store';
import { formatCurrency } from '../../../utils/formatters';

import { useToast } from '../../../hooks/useToast';
import { parseApiError } from '../../../core/network/api-error-parser';
import { cn } from '../../../utils/cn';
import type { CartData } from '../../../types';

// ─── Helper: empty cart skeleton ─────────────────────────────────────────────
const EMPTY_CART: CartData = {
  id: null,
  store: null,
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  packagingFee: 0,
  handlingFee: 0,
  deliveryFee: 0,
  surgeFee: 0,
  driverTip: 0,
  ecoPackaging: false,
  totalAmount: 0,
  coupon: null,
};

export const CartDrawerContent: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const closeDrawer = useDrawerStore((state) => state.closeDrawer);

  // ─── UX toggles ──────────────────────────────────────────────────────────
  const [replaceUnavailable, setReplaceUnavailable] = useState(true);
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [driverTip, setDriverTip] = useState<number>(0);
  const [gstToggle, setGstToggle] = useState(false);
  const [gstin, setGstin] = useState('');
  const [companyName, setCompanyName] = useState('');

  // ─── Coupon state ─────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  // ─── Fetch cart from backend (single source of truth) ─────────────────────
  const {
    data: cart = EMPTY_CART,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: () => cartService.getCart(),
    staleTime: 30_000,
    retry: 2,
  });

  // ─── Cart mutations (optimistic) ──────────────────────────────────────────
  const { updateQuantity, removeItem, isUpdatingQuantity, isRemoving } = useCartMutations();

  // ─── Coupon validation via backend ────────────────────────────────────────
  const couponMutation = useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      cartService.validateCoupon(code, subtotal),
    onSuccess: (coupon, { code }) => {
      const discount =
        coupon.type === 'PERCENTAGE'
          ? Math.min((cart.subtotal * coupon.value) / 100, coupon.maxDiscount ?? Infinity)
          : coupon.value;

      setAppliedCoupon({ code, discount });
      showToast({
        type: 'success',
        title: 'Coupon Applied!',
        description: `${code} saves you ${formatCurrency(discount)}.`,
      });
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      let description = parsed.message;

      // Map backend error codes to human messages
      if (parsed.code === 'COUPON_EXPIRED') description = 'This coupon has expired.';
      else if (parsed.code === 'COUPON_INVALID') description = 'Invalid coupon code.';
      else if (parsed.code === 'COUPON_MIN_ORDER')
        description = parsed.message; // already has min amount from backend
      else if (parsed.code === 'COUPON_LIMIT_REACHED')
        description = 'You have already used this coupon.';

      showToast({ type: 'error', title: 'Coupon Failed', description });
      setAppliedCoupon(null);
    },
  });

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    couponMutation.mutate({ code: couponCode.trim().toUpperCase(), subtotal: cart.subtotal });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    showToast({ type: 'success', title: 'Coupon Removed', description: 'Coupon discount cleared.' });
  };

  const handleCheckoutClick = () => {
    closeDrawer();
    navigate('/c/checkout', {
      state: {
        appliedCoupon,
        driverTip,
        ecoPackaging: ecoFriendly,
        replaceUnavailable,
      },
    });
  };

  // ─── Derived values ───────────────────────────────────────────────────────
  const freeDeliveryLimit = 199;
  const progressToFreeDelivery = Math.min((cart.subtotal / freeDeliveryLimit) * 100, 100);
  const remainingForFreeDelivery = Math.max(freeDeliveryLimit - cart.subtotal, 0);

  const giftLimit = 500;
  const progressToGift = Math.min((cart.subtotal / giftLimit) * 100, 100);
  const remainingForGift = Math.max(giftLimit - cart.subtotal, 0);

  // Display total uses backend totals + local adjustments for tip and eco
  const couponDiscount = appliedCoupon?.discount ?? cart.discount;
  const packagingFee = ecoFriendly ? Math.max(5, cart.packagingFee - 5) : cart.packagingFee;
  const displayTotal = cart.totalAmount + driverTip - (appliedCoupon?.discount ?? 0);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-emerald" />
        <p className="text-xs text-text-secondary font-semibold">Loading your cart…</p>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-status-error" />
        <h3 className="text-sm font-extrabold text-text-primary">Couldn't load your cart.</h3>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-emerald text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-emerald-hover transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  // ─── Empty cart ───────────────────────────────────────────────────────────
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[60vh] space-y-4">
        <span className="text-5xl">🛒</span>
        <h3 className="text-sm font-extrabold text-text-primary font-heading">Your cart is empty</h3>
        <p className="text-xs text-text-secondary max-w-[220px]">
          Add something from stores near you.
        </p>
        <button
          onClick={closeDrawer}
          className="px-5 py-2.5 bg-brand-emerald text-white font-bold text-xs rounded-xl shadow-subtle cursor-pointer hover:bg-brand-emerald-hover transition-colors"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between h-full relative select-none">

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

        {/* Store name + cart origin */}
        {cart.store && (
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary px-1">
            <Store className="h-3.5 w-3.5 text-brand-emerald" />
            <span className="text-text-primary">{cart.store.name}</span>
            <span className="text-brand-emerald">★ {cart.store.rating}</span>
          </div>
        )}

        {/* Free Delivery & Gift Progress */}
        <div className="space-y-4 p-4 rounded-2xl border border-border-primary bg-bg-secondary shadow-subtle">
          {/* Free Delivery */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-text-primary">Free Delivery Progress</span>
              <span className="text-brand-emerald font-heading">
                {cart.deliveryFee === 0
                  ? 'Unlocked 🎉'
                  : `Add ${formatCurrency(remainingForFreeDelivery)} more`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-brand-emerald transition-all duration-300"
                style={{ width: `${progressToFreeDelivery}%` }}
              />
            </div>
          </div>

          {/* Free Gift */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-text-primary flex items-center gap-1">
                <Gift className="h-4 w-4 text-brand-violet" />
                Free Gift Avocado
              </span>
              <span className="text-brand-violet font-heading">
                {cart.subtotal >= giftLimit ? 'Unlocked' : `Add ${formatCurrency(remainingForGift)} more`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-brand-violet transition-all duration-300"
                style={{ width: `${progressToGift}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <div className="divide-y divide-border-primary/40">
            {cart.items.map((item) => {
              const displayWeight = item.variantName || (item.name ? '' : '');
              const isMutating = isUpdatingQuantity || isRemoving;

              return (
                <div key={`${item.productId}-${item.variantId ?? 'base'}`} className="py-3 flex gap-3 items-start">
                  <div className="h-12 w-12 rounded-lg bg-bg-tertiary overflow-hidden flex-shrink-0 border border-border-primary/60">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=60';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-text-primary truncate">{item.name}</h4>
                    {displayWeight && (
                      <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
                        {displayWeight}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() =>
                          removeItem({ productId: item.productId, variantId: item.variantId ?? undefined })
                        }
                        disabled={isMutating}
                        className="text-[10px] font-bold text-status-error hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Quantity Controls & Price */}
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-xs font-extrabold text-text-primary font-heading">
                      {formatCurrency(item.total)}
                    </span>

                    <div className="flex items-center gap-2 bg-brand-emerald text-white rounded-lg px-1.5 py-0.5 shadow-subtle border border-brand-emerald-hover">
                      <button
                        onClick={() =>
                          updateQuantity({
                            productId: item.productId,
                            quantity: item.quantity - 1,
                            variantId: item.variantId ?? undefined,
                          })
                        }
                        disabled={isMutating}
                        className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer disabled:opacity-50"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="text-xs font-extrabold font-heading min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity({
                            productId: item.productId,
                            quantity: item.quantity + 1,
                            variantId: item.variantId ?? undefined,
                          })
                        }
                        disabled={isMutating}
                        className="p-0.5 hover:bg-brand-emerald-hover rounded cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Replacement & Eco Packaging */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="replaceUnavailable" className="font-bold text-text-primary block cursor-pointer">
                Replace unavailable items
              </label>
              <span className="text-[10px] text-text-secondary font-semibold">
                Store manager will auto-replace out of stock items
              </span>
            </div>
            <input
              id="replaceUnavailable"
              type="checkbox"
              checked={replaceUnavailable}
              onChange={(e) => setReplaceUnavailable(e.target.checked)}
              className="h-4 w-4 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
            />
          </div>

          <div className="border-t border-border-primary/60 pt-3 flex items-center justify-between text-xs">
            <div>
              <label htmlFor="ecoFriendly" className="font-bold text-text-primary flex items-center gap-1 block cursor-pointer">
                <Leaf className="h-4 w-4 text-brand-emerald" />
                Eco-Friendly Packaging
              </label>
              <span className="text-[10px] text-text-secondary font-semibold">
                Certified biodegradable compostable carry bags
              </span>
            </div>
            <input
              id="ecoFriendly"
              type="checkbox"
              checked={ecoFriendly}
              onChange={(e) => setEcoFriendly(e.target.checked)}
              className="h-4 w-4 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
            />
          </div>
        </div>

        {/* Rider Tip */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Support delivery partner
          </span>
          <p className="text-[10px] text-text-secondary font-semibold leading-relaxed">
            100% of your tip goes directly to the delivery rider.
          </p>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map((val) => (
              <button
                key={val}
                onClick={() => setDriverTip((prev) => (prev === val ? 0 : val))}
                className={cn(
                  'flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all',
                  driverTip === val
                    ? 'border-brand-emerald bg-brand-emerald/5 text-brand-emerald'
                    : 'border-border-primary text-text-secondary hover:text-text-primary bg-bg-secondary',
                )}
              >
                ₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Coupon — backend validated */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-2">
          {appliedCoupon ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-brand-emerald font-bold flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                {appliedCoupon.code} — saves {formatCurrency(appliedCoupon.discount)}
              </p>
              <button
                onClick={handleRemoveCoupon}
                className="text-[10px] text-status-error font-bold hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter promo code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="flex-1 px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald uppercase"
              />
              <button
                type="submit"
                disabled={couponMutation.isPending || !couponCode.trim()}
                className="px-4 py-2 bg-text-primary text-bg-secondary hover:bg-text-primary/95 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60 flex items-center gap-1"
              >
                {couponMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'APPLY'
                )}
              </button>
            </form>
          )}
        </div>

        {/* GST Invoice */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <label htmlFor="gstToggle" className="font-bold text-text-primary block cursor-pointer">
                Claim GST Invoice
              </label>
              <span className="text-[10px] text-text-secondary font-semibold">
                Enter corporate details for tax credit
              </span>
            </div>
            <input
              id="gstToggle"
              type="checkbox"
              checked={gstToggle}
              onChange={(e) => setGstToggle(e.target.checked)}
              className="h-4 w-4 rounded border-border-primary text-brand-emerald focus:ring-brand-emerald accent-brand-emerald cursor-pointer"
            />
          </div>

          {gstToggle && (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="GSTIN (e.g. 29AAAAA1111A1Z1)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary"
              />
              <input
                type="text"
                placeholder="Registered Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary"
              />
            </div>
          )}
        </div>

        {/* Bill Details — from backend */}
        <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3 text-xs font-semibold text-text-secondary">
          <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider block">Bill Details</span>

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="text-text-primary">{formatCurrency(cart.subtotal)}</span>
          </div>

          {couponDiscount > 0 && (
            <div className="flex justify-between text-brand-emerald">
              <span>Coupon Savings</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Delivery charges</span>
            <span className="text-text-primary">
              {cart.deliveryFee === 0 ? 'FREE' : formatCurrency(cart.deliveryFee)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Packaging & handling</span>
            <span className="text-text-primary">{formatCurrency(packagingFee)}</span>
          </div>

          <div className="flex justify-between">
            <span>Platform fee</span>
            <span className="text-text-primary">{formatCurrency(cart.handlingFee + cart.surgeFee)}</span>
          </div>

          <div className="flex justify-between">
            <span>Taxes (GST)</span>
            <span className="text-text-primary">{formatCurrency(cart.tax)}</span>
          </div>

          {driverTip > 0 && (
            <div className="flex justify-between text-brand-violet">
              <span>Delivery partner tip</span>
              <span>{formatCurrency(driverTip)}</span>
            </div>
          )}

          <div className="border-t border-border-primary/60 pt-3 flex justify-between text-sm font-extrabold text-text-primary">
            <span>Grand Total</span>
            <span className="font-heading">{formatCurrency(displayTotal)}</span>
          </div>
        </div>

      </div>

      {/* Sticky bottom CTA */}
      <div className="sticky bottom-0 left-0 right-0 bg-bg-secondary/90 backdrop-blur-md border-t border-border-primary p-4 flex items-center justify-between shadow-high pointer-events-auto">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">
            {cart.items.reduce((sum, i) => sum + i.quantity, 0)} Items
          </span>
          <span className="text-base font-extrabold text-text-primary font-heading">
            {formatCurrency(displayTotal)}
          </span>
        </div>

        <button
          onClick={handleCheckoutClick}
          className="py-3.5 px-6 bg-brand-emerald text-white hover:bg-brand-emerald-hover font-semibold text-xs rounded-xl shadow-subtle flex items-center gap-1.5 cursor-pointer"
        >
          Proceed to Checkout
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CartDrawerContent;

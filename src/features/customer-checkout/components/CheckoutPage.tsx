import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import {
  MapPin,
  Calendar,
  CreditCard,
  Tag,
  ShieldCheck,
  ArrowRight,
  Plus,
  Loader2,
  Check,
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { cartService } from '../services/cart-service';
import { orderService } from '../services/order-service';
import { useCartMutations } from '../hooks/useCartMutations';
import { useCustomerAddresses } from '../hooks/useCustomerAddresses';
import { useCustomerStore } from '../../customer-catalog/store/customer-store';
import { AddAddressModal } from '../../../components/ui/AddAddressModal';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { parseApiError } from '../../../core/network/api-error-parser';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';
import type { Address, PaymentMethod, CartData, PricingData, SelectedLocation } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliverySlot = 'EXPRESS' | 'STANDARD' | 'SCHEDULED';

interface CheckoutLocationState {
  appliedCoupon?: { code: string; discount: number } | null;
  driverTip?: number;
  ecoPackaging?: boolean;
  replaceUnavailable?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_PRICING: PricingData = {
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
  totalWeightGrams: 0,
  totalAmount: 0,
  coupon: null,
};

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

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // State passed from cart drawer
  const locationState = (location.state ?? {}) as CheckoutLocationState;

  const { clearCart } = useCartMutations();
  const { setSelectedAddress: setStoreSelectedAddress } = useCustomerStore();

  // ─── Address selection from real backend PostgreSQL APIs ──────────────────
  const { addresses: savedAddresses = [], isLoading: isAddressesLoading } = useCustomerAddresses();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Sync selectedAddress when addresses load or update
  useEffect(() => {
    if (savedAddresses.length > 0) {
      if (!selectedAddress || !savedAddresses.some((a) => a.id === selectedAddress.id)) {
        const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
        setSelectedAddress(defaultAddr);

        // Sync to Zustand customer store
        const loc: SelectedLocation = {
          id: defaultAddr.id,
          selectionType: 'SAVED',
          label: defaultAddr.label,
          streetAddress: defaultAddr.streetAddress,
          city: defaultAddr.city,
          postalCode: defaultAddr.postalCode,
          coordinates: {
            latitude: defaultAddr.latitude ?? defaultAddr.coordinates?.latitude ?? 21.1085,
            longitude: defaultAddr.longitude ?? defaultAddr.coordinates?.longitude ?? 82.0965,
          },
          isServiceable: true,
        };
        setStoreSelectedAddress(loc);
      }
    } else {
      setSelectedAddress(null);
    }
  }, [savedAddresses]);

  // ─── Delivery slot ────────────────────────────────────────────────────────
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>('EXPRESS');
  const [scheduledTime, setScheduledTime] = useState('Tomorrow, 9 AM - 11 AM');

  // ─── Payment ──────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  // ─── Coupon (carried from cart drawer) ────────────────────────────────────
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(
    locationState.appliedCoupon ?? null,
  );
  const [couponInput, setCouponInput] = useState('');

  // ─── Delivery instruction ─────────────────────────────────────────────────
  const [deliveryInstruction, setDeliveryInstruction] = useState('');

  // ─── Eco / Tip (carried from cart drawer) ─────────────────────────────────
  const ecoPackaging = locationState.ecoPackaging ?? false;
  const driverTip = locationState.driverTip ?? 0;

  // ─── Idempotency key (generated per checkout attempt) ─────────────────────
  const [idempotencyKey] = useState<string>(() => uuidv4());

  // ─── Fetch cart (to build recalculate items) ──────────────────────────────
  const { data: cart = EMPTY_CART } = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: () => cartService.getCart(),
    staleTime: 30_000,
  });

  // ─── Build recalculate params ─────────────────────────────────────────────
  const recalcParams = useMemo(() => {
    const items = cart.items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId ?? undefined,
      quantity: i.quantity,
    }));
    return {
      items,
      couponCode: appliedCoupon?.code,
      driverTip,
      ecoPackaging,
      deliveryLatitude: selectedAddress?.latitude,
      deliveryLongitude: selectedAddress?.longitude,
    };
  }, [cart.items, appliedCoupon, driverTip, ecoPackaging, selectedAddress]);

  // ─── POST /cart/recalculate — backend pricing (source of truth) ───────────
  const {
    data: pricing = EMPTY_PRICING,
    isFetching: isPricingLoading,
  } = useQuery({
    queryKey: queryKeys.cartRecalculate(recalcParams as Record<string, unknown>),
    queryFn: () => cartService.recalculate(recalcParams),
    enabled: cart.items.length > 0,
    staleTime: 60_000,
    retry: 1,
  });

  // ─── Validate coupon via backend ──────────────────────────────────────────
  const couponMutation = useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      cartService.validateCoupon(code, subtotal),
    onSuccess: (coupon, { code }) => {
      const discount =
        coupon.type === 'PERCENTAGE'
          ? Math.min((pricing.subtotal * coupon.value) / 100, coupon.maxDiscount ?? Infinity)
          : coupon.value;
      setAppliedCoupon({ code, discount });
      setCouponInput('');
      showToast({
        type: 'success',
        title: 'Coupon Applied!',
        description: `${code} saves you ${formatCurrency(discount)}.`,
      });
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      let description = parsed.message;
      if (parsed.code === 'COUPON_EXPIRED') description = 'This coupon has expired.';
      else if (parsed.code === 'COUPON_INVALID') description = 'Invalid coupon code.';
      else if (parsed.code === 'COUPON_LIMIT_REACHED')
        description = 'You have already used this coupon.';
      showToast({ type: 'error', title: 'Coupon Failed', description });
    },
  });

  // ─── Place Order ──────────────────────────────────────────────────────────
  const placeOrderMutation = useMutation({
    mutationFn: () => {
      if (!selectedAddress?.id) throw new Error('No delivery address selected');
      return orderService.placeOrder(
        {
          addressId: selectedAddress.id,
          paymentMethod,
          couponCode: appliedCoupon?.code,
          driverTip,
          ecoPackaging,
          deliveryInstruction: deliveryInstruction || undefined,
        },
        idempotencyKey,
      );
    },
    onSuccess: (orders) => {
      // Clear cart optimistically
      clearCart();
      const primaryOrder = orders[0];
      navigate('/c/orders/confirm', {
        replace: true,
        state: { orderId: primaryOrder?.id, status: 'success' },
      });
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      let title = 'Order Failed';
      let description = parsed.message;

      switch (parsed.code) {
        case 'OUT_OF_STOCK':
          title = 'Out of Stock';
          description = 'Some items are no longer available. Please update your cart.';
          break;
        case 'STORE_CLOSED':
          title = 'Store Closed';
          description = parsed.message;
          break;
        case 'CART_EMPTY':
          title = 'Cart Empty';
          description = 'Your cart is empty. Please add items before placing an order.';
          break;
        case 'PAYMENT_FAILED':
          title = 'Payment Failed';
          description = 'Your payment could not be processed. Please try again.';
          break;
        default:
          break;
      }

      showToast({ type: 'error', title, description });
    },
  });

  const handlePlaceOrder = useCallback(() => {
    if (!selectedAddress) {
      showToast({
        type: 'error',
        title: 'Address Required',
        description: 'Please select a delivery address to continue.',
      });
      return;
    }
    if (cart.items.length === 0) {
      showToast({
        type: 'error',
        title: 'Cart Empty',
        description: 'Your cart is empty. Please add items.',
      });
      return;
    }
    placeOrderMutation.mutate();
  }, [selectedAddress, cart.items.length, placeOrderMutation, showToast]);

  // ─── Empty cart guard ─────────────────────────────────────────────────────
  if (cart.items.length === 0 && !placeOrderMutation.isPending) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <span className="text-5xl">🛒</span>
        <h2 className="text-lg font-bold text-text-primary font-heading">Empty Cart</h2>
        <p className="text-xs text-text-secondary max-w-xs">
          Your cart is empty. Please add items before checking out.
        </p>
        <button
          onClick={() => navigate('/c/home')}
          className="px-4 py-2.5 bg-brand-emerald text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-brand-emerald-dark transition-colors"
        >
          Browse Storefront
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
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 select-none"
    >
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">

        {/* 1. Delivery Address Section */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-emerald" />
              Delivery Address
            </h2>
            <button
              onClick={() => {
                setEditingAddress(null);
                setShowAddAddressModal(true);
              }}
              className="text-xs font-bold text-brand-emerald hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New
            </button>
          </div>

          {isAddressesLoading ? (
            <div className="flex items-center justify-center p-6 text-text-secondary text-xs font-semibold gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
              Loading saved addresses...
            </div>
          ) : savedAddresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <button
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddress(addr);
                      const loc: SelectedLocation = {
                        id: addr.id,
                        selectionType: 'SAVED',
                        label: addr.label,
                        streetAddress: addr.streetAddress,
                        city: addr.city,
                        postalCode: addr.postalCode,
                        coordinates: {
                          latitude: addr.latitude ?? addr.coordinates?.latitude ?? 21.1085,
                          longitude: addr.longitude ?? addr.coordinates?.longitude ?? 82.0965,
                        },
                        isServiceable: true,
                      };
                      setStoreSelectedAddress(loc);
                    }}
                    className={cn(
                      'text-left p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer relative',
                      isSelected
                        ? 'border-brand-emerald bg-brand-emerald/5 text-text-primary shadow-sm'
                        : 'border-border-primary bg-bg-secondary hover:border-text-secondary',
                    )}
                  >
                    <div className="p-2 rounded-lg bg-bg-tertiary">
                      <MapPin className="h-4 w-4 text-brand-emerald" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary font-heading">{addr.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-brand-emerald" />}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">
                        {addr.streetAddress}, {addr.city}
                      </p>
                      <p className="text-[10px] text-text-tertiary mt-0.5">
                        {addr.state || 'Chhattisgarh'} - {addr.postalCode}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center border border-dashed border-border-primary rounded-xl space-y-3">
              <MapPin className="h-8 w-8 text-brand-emerald mx-auto opacity-70" />
              <p className="text-xs text-text-secondary font-medium">Add a delivery address to continue.</p>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddAddressModal(true);
                }}
                className="px-4 py-2 bg-brand-emerald text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-emerald-dark transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Address
              </button>
            </div>
          )}
        </section>

        {/* 2. Delivery Speed */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2 border-b border-border-primary/60 pb-3">
            <Calendar className="h-4 w-4 text-brand-emerald" />
            Delivery Speed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'EXPRESS', title: 'Express Delivery', eta: '12–18 Mins', desc: 'Direct rider assignment' },
              { id: 'STANDARD', title: 'Standard Delivery', eta: '45 Mins', desc: 'Eco bundled drop' },
              { id: 'SCHEDULED', title: 'Schedule Delivery', eta: 'Choose Slot', desc: 'Pre-book time ranges' },
            ].map((slot) => {
              const isSelected = selectedSlot === slot.id;
              return (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlot(slot.id as DeliverySlot)}
                  className={cn(
                    'text-left p-4 rounded-xl border flex flex-col justify-between h-28 transition-all cursor-pointer',
                    isSelected
                      ? 'border-brand-emerald bg-brand-emerald/5'
                      : 'border-border-primary bg-bg-secondary hover:border-text-secondary',
                  )}
                >
                  <div>
                    <span className="text-xs font-bold block">{slot.title}</span>
                    <span className="text-[10px] text-text-secondary mt-0.5 block font-semibold">
                      {slot.desc}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-brand-emerald">{slot.eta}</span>
                </button>
              );
            })}
          </div>

          {selectedSlot === 'SCHEDULED' && (
            <div className="p-3 bg-bg-tertiary rounded-xl border border-border-primary/60">
              <label
                htmlFor="scheduledTime"
                className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5"
              >
                Select Delivery Window
              </label>
              <select
                id="scheduledTime"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-bg-secondary border border-border-primary rounded-lg p-2 text-xs font-semibold"
              >
                <option value="Tomorrow, 9 AM - 11 AM">Tomorrow, 9 AM - 11 AM</option>
                <option value="Tomorrow, 2 PM - 4 PM">Tomorrow, 2 PM - 4 PM</option>
                <option value="Tomorrow, 6 PM - 8 PM">Tomorrow, 6 PM - 8 PM</option>
              </select>
            </div>
          )}
        </section>

        {/* 3. Delivery Instructions */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">
            Delivery Instructions (Optional)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              '🔔 Leave at door',
              '📞 Call before delivery',
              '🚫 Do not ring bell',
              '🧱 Leave with security',
            ].map((instruction) => {
              const isActive = deliveryInstruction === instruction;
              return (
                <button
                  key={instruction}
                  type="button"
                  onClick={() =>
                    setDeliveryInstruction(isActive ? '' : instruction)
                  }
                  className={cn(
                    'p-2.5 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer',
                    isActive
                      ? 'border-brand-emerald bg-brand-emerald/10 text-brand-emerald'
                      : 'border-border-primary bg-bg-tertiary hover:border-text-secondary text-text-secondary',
                  )}
                >
                  {instruction}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Payment Method */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2 border-b border-border-primary/60 pb-3">
            <CreditCard className="h-4 w-4 text-brand-emerald" />
            Payment Method
          </h2>

          <div className="space-y-3">
            {[
              {
                id: 'COD',
                title: 'Cash on Delivery / Pay on Delivery',
                desc: 'Pay cash or UPI QR upon receiving your order',
                badge: 'Popular',
              },
              {
                id: 'WALLET',
                title: 'Aether Pay Wallet',
                desc: 'Instant 1-click checkout with wallet balance',
                badge: 'Fastest',
              },
              {
                id: 'RAZORPAY',
                title: 'UPI / Cards / NetBanking (Razorpay)',
                desc: 'Google Pay, PhonePe, Cards & Netbanking',
                badge: 'Online',
              },
            ].map((method) => {
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer',
                    isSelected
                      ? 'border-brand-emerald bg-brand-emerald/5'
                      : 'border-border-primary bg-bg-secondary hover:border-text-secondary',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border flex items-center justify-center',
                        isSelected ? 'border-brand-emerald bg-brand-emerald' : 'border-text-tertiary',
                      )}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{method.title}</span>
                      <span className="text-[10px] text-text-secondary block">{method.desc}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald uppercase">
                    {method.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right Column — Summary & Checkout Action */}
      <div className="space-y-6">

        {/* Order Items Preview */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-heading">
              Order Items ({cart.items.length})
            </h3>
            {pricing.store && (
              <span className="text-[10px] font-bold text-brand-emerald bg-brand-emerald/10 px-2 py-0.5 rounded">
                {pricing.store.name}
              </span>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-bold text-text-secondary shrink-0">{item.quantity}x</span>
                  <span className="truncate text-text-primary font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-text-primary shrink-0">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Coupon Input */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 font-heading">
            <Tag className="h-4 w-4 text-brand-emerald" />
            Promo Code
          </h3>

          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-brand-emerald/10 border border-brand-emerald/30">
              <div>
                <span className="text-xs font-extrabold text-brand-emerald">{appliedCoupon.code}</span>
                <span className="text-[10px] text-text-secondary block">
                  -{formatCurrency(appliedCoupon.discount)} discount applied
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAppliedCoupon(null)}
                className="text-[10px] font-bold text-status-error hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 border border-border-primary rounded-xl bg-bg-tertiary text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-emerald"
              />
              <button
                type="button"
                disabled={!couponInput.trim() || couponMutation.isPending}
                onClick={() =>
                  couponMutation.mutate({ code: couponInput.trim(), subtotal: pricing.subtotal })
                }
                className="px-4 py-2 bg-brand-emerald text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-brand-emerald-dark disabled:opacity-50 transition-colors"
              >
                {couponMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
              </button>
            </div>
          )}
        </section>

        {/* Bill Breakdown */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider font-heading border-b border-border-primary/60 pb-2">
            Bill Details
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-text-secondary font-medium">
              <span>Item Subtotal</span>
              <span className="font-bold text-text-primary">{formatCurrency(pricing.subtotal)}</span>
            </div>

            {pricing.discount > 0 && (
              <div className="flex justify-between text-brand-emerald font-semibold">
                <span>Coupon Discount</span>
                <span>-{formatCurrency(pricing.discount)}</span>
              </div>
            )}

            <div className="flex justify-between text-text-secondary font-medium">
              <span>Delivery Fee</span>
              <span>{pricing.deliveryFee === 0 ? 'FREE' : formatCurrency(pricing.deliveryFee)}</span>
            </div>

            <div className="flex justify-between text-text-secondary font-medium">
              <span>Handling & Taxes</span>
              <span>{formatCurrency(pricing.handlingFee + pricing.tax)}</span>
            </div>

            {pricing.driverTip > 0 && (
              <div className="flex justify-between text-text-secondary font-medium">
                <span>Delivery Partner Tip</span>
                <span>{formatCurrency(pricing.driverTip)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-border-primary flex justify-between items-center text-sm font-extrabold text-text-primary font-heading">
              <span>To Pay</span>
              <span className="text-brand-emerald text-base">
                {isPricingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-emerald" />
                ) : (
                  formatCurrency(pricing.totalAmount)
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Place Order CTA */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={!selectedAddress || placeOrderMutation.isPending}
            onClick={handlePlaceOrder}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-brand-emerald hover:bg-brand-emerald-dark text-white font-extrabold text-sm shadow-xl hover:shadow-brand-emerald/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {placeOrderMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : (
              <>
                <span>Place Order • {formatCurrency(pricing.totalAmount)}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
            <span>100% Safe & Secure Payments</span>
          </div>
        </div>
      </div>

      {/* Add / Edit Delivery Address Modal */}
      <AddAddressModal
        isOpen={showAddAddressModal}
        onClose={() => setShowAddAddressModal(false)}
        editingAddress={editingAddress}
        onSuccess={(newAddr) => {
          setSelectedAddress(newAddr);
          const loc: SelectedLocation = {
            id: newAddr.id,
            selectionType: 'SAVED',
            label: newAddr.label,
            streetAddress: newAddr.streetAddress,
            city: newAddr.city,
            postalCode: newAddr.postalCode,
            coordinates: {
              latitude: newAddr.latitude ?? newAddr.coordinates?.latitude ?? 21.1085,
              longitude: newAddr.longitude ?? newAddr.coordinates?.longitude ?? 82.0965,
            },
            isServiceable: true,
          };
          setStoreSelectedAddress(loc);
        }}
      />
    </motion.div>
  );
};

export default CheckoutPage;

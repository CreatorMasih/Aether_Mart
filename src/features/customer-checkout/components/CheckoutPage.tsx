import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  X,
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { cartService } from '../services/cart-service';
import { orderService } from '../services/order-service';
import { apiClient } from '../../../core/network/api-client';
import { useCartMutations } from '../hooks/useCartMutations';
import { useAuthStore } from '../../auth/store/auth-store';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { parseApiError } from '../../../core/network/api-error-parser';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';
import type { Address, PaymentMethod, CartData, PricingData } from '../../../types';

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

  const { user, addSavedAddress } = useAuthStore();
  const { clearCart } = useCartMutations();

  // ─── Address selection ────────────────────────────────────────────────────
  const savedAddresses: Address[] = user?.savedAddresses ?? [];
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    savedAddresses[0] ?? null,
  );
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrZip, setNewAddrZip] = useState('');
  const [newAddrCity, setNewAddrCity] = useState('');
  const [newAddrLandmark, setNewAddrLandmark] = useState('');

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
      deliveryLatitude: selectedAddress?.coordinates?.latitude,
      deliveryLongitude: selectedAddress?.coordinates?.longitude,
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
      if (!selectedAddress?.id) throw new Error('No address selected');
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

  // ─── Add address (real backend Address CRUD API) ───────────────────────────
  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrStreet || !newAddrZip || !newAddrCity) {
      showToast({
        type: 'error',
        title: 'Form Incomplete',
        description: 'Please fill in street address, PIN code, and city.',
      });
      return;
    }

    try {
      const response = await apiClient.post('/customer/addresses', {
        label: newAddrLabel,
        receiverName: user?.fullName || 'Customer',
        receiverPhone: user?.phone || '',
        streetAddress: `${newAddrStreet}${newAddrLandmark ? `, Near ${newAddrLandmark}` : ''}`,
        postalCode: newAddrZip,
        city: newAddrCity,
        latitude: 12.9716,
        longitude: 77.5946,
      });

      const newAddress = response.data.data;

      addSavedAddress(newAddress);
      setSelectedAddress(newAddress);
      setShowAddAddressModal(false);
      showToast({ type: 'success', title: 'Address Added', description: 'Delivery address saved.' });

      setNewAddrStreet('');
      setNewAddrZip('');
      setNewAddrCity('');
      setNewAddrLandmark('');
    } catch (err: any) {
      const parsed = parseApiError(err);
      showToast({
        type: 'error',
        title: 'Failed to Save Address',
        description: parsed.message,
      });
    }
  };

  const handlePlaceOrder = useCallback(() => {
    if (!selectedAddress) {
      showToast({
        type: 'error',
        title: 'Address Required',
        description: 'Please select a delivery address.',
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
          className="px-4 py-2.5 bg-brand-emerald text-white font-bold text-xs rounded-xl cursor-pointer"
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

        {/* 1. Delivery Address */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-emerald" />
              Delivery Address
            </h2>
            <button
              onClick={() => setShowAddAddressModal(true)}
              className="text-xs font-bold text-brand-emerald hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add New
            </button>
          </div>

          {/* MISSING API NOTICE */}
          <div className="text-[10px] text-text-secondary bg-status-warning/10 border border-status-warning/20 rounded-lg px-3 py-2 font-semibold">
            ⚠️ Address CRUD API not yet available on backend.
            Addresses are stored locally until <code>POST /customer/addresses</code> is implemented.
          </div>

          {savedAddresses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {savedAddresses.map((addr) => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr)}
                    className={cn(
                      'text-left p-4 rounded-xl border flex items-start gap-3 transition-all cursor-pointer',
                      isSelected
                        ? 'border-brand-emerald bg-brand-emerald/5 text-text-primary'
                        : 'border-border-primary bg-bg-secondary hover:border-text-secondary',
                    )}
                  >
                    <div className="p-2 rounded-lg bg-bg-tertiary">
                      <MapPin className="h-4 w-4 text-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary">{addr.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-emerald" />}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-1 line-clamp-2">
                        {addr.streetAddress}, {addr.city} — {addr.postalCode}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-border-primary rounded-xl">
              <p className="text-xs text-text-secondary">
                No saved addresses. Please add a delivery address.
              </p>
            </div>
          )}
        </section>

        {/* 2. Delivery Slot */}
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
                <option>Tomorrow, 9 AM – 11 AM</option>
                <option>Tomorrow, 11 AM – 1 PM</option>
                <option>Tomorrow, 4 PM – 6 PM</option>
                <option>Tomorrow, 6 PM – 8 PM</option>
              </select>
            </div>
          )}
        </section>

        {/* 3. Coupon */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2 border-b border-border-primary/60 pb-3">
            <Tag className="h-4 w-4 text-brand-emerald" />
            Promo Code
          </h2>

          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 bg-brand-emerald/5 border border-brand-emerald/20 rounded-xl">
              <p className="text-xs text-brand-emerald font-bold flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                {appliedCoupon.code} — saves {formatCurrency(appliedCoupon.discount)}
              </p>
              <button
                onClick={() => setAppliedCoupon(null)}
                className="text-[10px] text-status-error font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (couponInput.trim())
                  couponMutation.mutate({
                    code: couponInput.trim().toUpperCase(),
                    subtotal: pricing.subtotal,
                  });
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Enter promo code"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                className="flex-1 px-4 py-2 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-brand-emerald/20 focus:border-brand-emerald uppercase"
              />
              <button
                type="submit"
                disabled={couponMutation.isPending || !couponInput.trim()}
                className="px-4 py-2 bg-text-primary text-bg-secondary text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60 flex items-center gap-1"
              >
                {couponMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'APPLY'
                )}
              </button>
            </form>
          )}
        </section>

        {/* 4. Delivery Instruction */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading border-b border-border-primary/60 pb-3">
            Delivery Instructions (Optional)
          </h2>
          <textarea
            rows={2}
            placeholder="E.g. Leave at gate, call before arriving…"
            value={deliveryInstruction}
            onChange={(e) => setDeliveryInstruction(e.target.value)}
            className="w-full px-4 py-2.5 border border-border-primary rounded-xl text-xs font-semibold bg-bg-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-brand-emerald/20"
          />
        </section>

        {/* 5. Payment Method — aligned to backend enum */}
        <section className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading flex items-center gap-2 border-b border-border-primary/60 pb-3">
            <CreditCard className="h-4 w-4 text-brand-emerald" />
            Payment Method
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { id: 'COD', label: 'Cash on Delivery', note: 'Pay rider on arrival' },
                { id: 'WALLET', label: 'Wallet', note: `Balance: ${formatCurrency(user?.walletBalance ?? 0)}` },
                { id: 'RAZORPAY', label: 'Online Pay', note: 'Cards, UPI, Net Banking' },
              ] as { id: PaymentMethod; label: string; note: string }[]
            ).map((pm) => {
              const isSelected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={cn(
                    'text-left py-4 px-3 rounded-xl border flex flex-col gap-1 transition-all cursor-pointer',
                    isSelected
                      ? 'border-brand-emerald bg-brand-emerald/5 text-brand-emerald'
                      : 'border-border-primary bg-bg-secondary hover:border-text-secondary',
                  )}
                >
                  <span className="text-xs font-bold">{pm.label}</span>
                  <span className="text-[10px] text-text-secondary font-semibold">{pm.note}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-brand-emerald mt-1" />}
                </button>
              );
            })}
          </div>

          {paymentMethod === 'WALLET' && (user?.walletBalance ?? 0) < pricing.totalAmount && (
            <div className="flex items-center gap-2 p-3 bg-status-warning/10 border border-status-warning/20 rounded-xl text-xs font-semibold text-status-warning">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Insufficient wallet balance. Please top up or choose another payment method.
            </div>
          )}

          {paymentMethod === 'RAZORPAY' && (
            <div className="text-[10px] text-text-secondary font-semibold p-3 bg-bg-tertiary rounded-xl border border-border-primary/60">
              You will be redirected to the Razorpay payment gateway to complete your payment securely.
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider justify-center">
            <ShieldCheck className="h-4 w-4 text-brand-emerald" />
            PCI-DSS Encrypted Secure Gateway
          </div>
        </section>
      </div>

      {/* Right Column — Order Summary */}
      <div className="space-y-6">
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4 sticky top-20">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary pb-2">
            Order Summary
          </h3>

          {/* Items preview */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cart.items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId ?? ''}`}
                className="flex items-center gap-2 text-xs"
              >
                <span className="text-text-secondary flex-1 truncate">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-bold text-text-primary shrink-0">
                  {formatCurrency(item.total)}
                </span>
              </div>
            ))}
          </div>

          {/* Backend-driven pricing */}
          {isPricingLoading ? (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Recalculating prices…
            </div>
          ) : (
            <div className="space-y-3 text-xs font-semibold text-text-secondary">
              <div className="flex justify-between">
                <span>MRP Subtotal</span>
                <span className="text-text-primary font-heading font-extrabold">
                  {formatCurrency(pricing.subtotal)}
                </span>
              </div>
              {pricing.discount > 0 && (
                <div className="flex justify-between text-brand-emerald">
                  <span>Coupon Savings</span>
                  <span>-{formatCurrency(pricing.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery charges</span>
                <span className="text-text-primary font-heading font-extrabold">
                  {pricing.deliveryFee === 0 ? 'FREE' : formatCurrency(pricing.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Packaging & handling</span>
                <span className="text-text-primary font-heading font-extrabold">
                  {formatCurrency(pricing.packagingFee + pricing.handlingFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Taxes (GST 5%)</span>
                <span className="text-text-primary font-heading font-extrabold">
                  {formatCurrency(pricing.tax)}
                </span>
              </div>
              {driverTip > 0 && (
                <div className="flex justify-between text-brand-violet">
                  <span>Rider tip</span>
                  <span>{formatCurrency(driverTip)}</span>
                </div>
              )}

              <div className="border-t border-border-primary/60 pt-3 flex justify-between text-sm font-extrabold text-text-primary">
                <span>Grand Total</span>
                <span className="font-heading text-brand-emerald">
                  {formatCurrency(pricing.totalAmount + driverTip)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placeOrderMutation.isPending || !selectedAddress || cart.items.length === 0}
            className="w-full py-4 bg-brand-emerald hover:bg-brand-emerald-hover text-white font-bold text-xs rounded-xl shadow-subtle flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {placeOrderMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Placing Order…
              </>
            ) : (
              <>
                Pay & Place Order
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {placeOrderMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error/20 rounded-xl text-xs text-status-error font-semibold">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {parseApiError(placeOrderMutation.error).message}
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      <AnimatePresence>
        {showAddAddressModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4"
            >
              <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">
                Add Delivery Address
              </h3>

              <form onSubmit={handleAddNewAddress} className="space-y-3.5 text-xs font-semibold">
                {/* Label */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">
                    Address Label
                  </span>
                  <div className="flex gap-2">
                    {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => setNewAddrLabel(lbl)}
                        className={cn(
                          'flex-1 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all',
                          newAddrLabel === lbl
                            ? 'border-brand-emerald bg-brand-emerald/5 text-brand-emerald'
                            : 'border-border-primary bg-bg-tertiary',
                        )}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="newAddrStreet" className="text-[10px] font-bold text-text-secondary uppercase">
                    Street Address
                  </label>
                  <input
                    id="newAddrStreet"
                    placeholder="123 Fresh Lane, Koramangala"
                    value={newAddrStreet}
                    onChange={(e) => setNewAddrStreet(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="newAddrZip" className="text-[10px] font-bold text-text-secondary uppercase">
                      PIN Code
                    </label>
                    <input
                      id="newAddrZip"
                      placeholder="560034"
                      value={newAddrZip}
                      onChange={(e) => setNewAddrZip(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="newAddrCity" className="text-[10px] font-bold text-text-secondary uppercase">
                      City
                    </label>
                    <input
                      id="newAddrCity"
                      placeholder="Bengaluru"
                      value={newAddrCity}
                      onChange={(e) => setNewAddrCity(e.target.value)}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="newAddrLandmark" className="text-[10px] font-bold text-text-secondary uppercase">
                    Landmark (Optional)
                  </label>
                  <input
                    id="newAddrLandmark"
                    placeholder="Near Central Mall"
                    value={newAddrLandmark}
                    onChange={(e) => setNewAddrLandmark(e.target.value)}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddAddressModal(false)}
                    className="flex-1 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-brand-emerald text-white hover:bg-brand-emerald-hover rounded-xl cursor-pointer"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CheckoutPage;

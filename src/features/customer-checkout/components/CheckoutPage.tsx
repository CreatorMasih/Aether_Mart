import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { Address, PaymentMethod, CartData, PricingData, SelectedLocation, OrderData } from '../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliverySlot = 'EXPRESS' | 'STANDARD' | 'SCHEDULED';

interface CheckoutLocationState {
  appliedCoupon?: { code: string; discount: number } | null;
  driverTip?: number;
  ecoPackaging?: boolean;
  replaceUnavailable?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { useAuthStore } from '../../auth/store/auth-store';
import { RazorpayTestModal } from '../../../components/ui/RazorpayTestModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
  const { user } = useAuthStore();

  // State passed from cart drawer
  const locationState = (location.state ?? {}) as CheckoutLocationState;

  const queryClient = useQueryClient();
  const { invalidateCart } = useCartMutations();
  const { setSelectedAddress: setStoreSelectedAddress } = useCustomerStore();

  // ─── Address selection from real backend PostgreSQL APIs ──────────────────
  const { addresses: savedAddresses = [], isLoading: isAddressesLoading } = useCustomerAddresses();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // ─── Pending / Retry Payment State ────────────────────────────────────────
  const [pendingOrder, setPendingOrder] = useState<OrderData | null>(null);
  const [showTestSimulator, setShowTestSimulator] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

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

  // Check for refresh-safe pending order in sessionStorage
  useEffect(() => {
    const rawPending = sessionStorage.getItem('aether_pending_order');
    if (rawPending) {
      try {
        const parsed = JSON.parse(rawPending) as OrderData;
        if (parsed?.id) {
          orderService.getOrderById(parsed.id).then((ord) => {
            if (ord.paymentStatus === 'PENDING') {
              setPendingOrder(ord);
            } else {
              sessionStorage.removeItem('aether_pending_order');
            }
          }).catch(() => {
            sessionStorage.removeItem('aether_pending_order');
          });
        }
      } catch (e) {
        sessionStorage.removeItem('aether_pending_order');
      }
    }
  }, []);

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

  // ─── Customer Wallet Balance Query ───────────────────────────────────────
  const { data: walletData } = useQuery({
    queryKey: ['customer', 'wallet'],
    queryFn: () => orderService.getWallet(),
    staleTime: 30_000,
  });

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

  // ─── Confirm Razorpay Payment Routine ────────────────────────────────────
  const handleConfirmPayment = async (targetOrder: OrderData, status: 'SUCCESS' | 'FAILED', razorpayPaymentId?: string) => {
    try {
      setIsProcessingPayment(true);
      const paymentId = targetOrder.payment?.id;
      if (!paymentId) throw new Error('Missing payment reference');

      await orderService.confirmPayment(paymentId, status, razorpayPaymentId);
      setShowTestSimulator(false);
      sessionStorage.removeItem('aether_pending_order');

      if (status === 'SUCCESS') {
        queryClient.setQueryData(queryKeys.cart(), {
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
        });
        invalidateCart();
        showToast({
          type: 'success',
          title: 'Payment Successful!',
          description: 'Your test mode order was confirmed.',
        });
        navigate('/c/orders/confirm', {
          replace: true,
          state: { orderId: targetOrder.id, status: 'success' },
        });
      } else {
        showToast({
          type: 'error',
          title: 'Payment Failed',
          description: 'Payment failed. Your order was not placed.',
        });
        setPendingOrder(targetOrder);
      }
    } catch (err) {
      const parsed = parseApiError(err);
      showToast({
        type: 'error',
        title: 'Payment Error',
        description: parsed.message || 'Unable to start payment. Please try again.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ─── Initiate Razorpay Checkout Flow ─────────────────────────────────────
  const triggerRazorpayCheckout = async (targetOrder: OrderData) => {
    sessionStorage.setItem('aether_pending_order', JSON.stringify(targetOrder));
    setPendingOrder(targetOrder);

    const scriptLoaded = await loadRazorpayScript();
    const RazorpayConstructor = (window as any).Razorpay;

    if (scriptLoaded && RazorpayConstructor) {
      try {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
          amount: Math.round(targetOrder.totalAmount * 100),
          currency: 'INR',
          name: 'Aether Mart (TEST MODE)',
          description: `Order #${targetOrder.orderNumber}`,
          order_id: targetOrder.payment?.gatewayOrderId || `rzp_test_order_${targetOrder.id}`,
          handler: async function (response: any) {
            await handleConfirmPayment(targetOrder, 'SUCCESS', response.razorpay_payment_id);
          },
          modal: {
            ondismiss: function () {
              showToast({
                type: 'error',
                title: 'Payment Cancelled',
                description: 'Payment cancelled. You can try again.',
              });
              setPendingOrder(targetOrder);
            },
          },
          prefill: {
            name: user?.fullName || 'Customer',
            contact: user?.phone || '',
            email: user?.email || '',
          },
          theme: { color: '#059669' },
        };

        const rzp = new RazorpayConstructor(options);
        rzp.on('payment.failed', function () {
          handleConfirmPayment(targetOrder, 'FAILED');
        });
        rzp.open();
      } catch (err) {
        // Fallback to explicit test mode simulator modal if SDK init fails
        setShowTestSimulator(true);
      }
    } else {
      // SDK blocked/unavailable -> render explicit test payment simulator modal
      setShowTestSimulator(true);
    }
  };

  // ─── Place Order Mutation ─────────────────────────────────────────────────
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
      const primaryOrder = orders[0];
      if (!primaryOrder) return;

      if (paymentMethod === 'RAZORPAY') {
        triggerRazorpayCheckout(primaryOrder);
      } else {
        queryClient.setQueryData(queryKeys.cart(), {
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
        });
        invalidateCart();
        sessionStorage.removeItem('aether_pending_order');
        showToast({
          type: 'success',
          title: 'Order placed successfully! 🎉',
          description: paymentMethod === 'WALLET' ? 'Payment completed via Wallet.' : 'Your Cash on Delivery order has been placed.',
        });
        navigate('/c/orders/confirm', {
          replace: true,
          state: { orderId: primaryOrder.id, status: 'success' },
        });
      }
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      let title = 'Order Failed';
      let description = parsed.message;

      if (parsed.code === 'TOKEN_MISSING' || parsed.status === 401) {
        showToast({
          type: 'info',
          title: 'Session Expired',
          description: 'Please log in to complete your order.',
        });
        navigate('/auth', { replace: true });
        return;
      }

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
        case 'WALLET_INSUFFICIENT_BALANCE':
          title = 'Insufficient Balance';
          description = 'Your wallet balance is insufficient.';
          break;
        default:
          description = parsed.message || (paymentMethod === 'RAZORPAY' ? 'Unable to start payment. Please try again.' : 'Couldn\'t place your order. Please try again.');
          break;
      }

      showToast({ type: 'error', title, description });
    },
  });

  // ─── Retry Payment Mutation ───────────────────────────────────────────────
  const retryPaymentMutation = useMutation({
    mutationFn: (orderId: string) => orderService.retryPayment(orderId),
    onSuccess: ({ order }) => {
      triggerRazorpayCheckout(order);
    },
    onError: (err) => {
      const parsed = parseApiError(err);
      showToast({
        type: 'error',
        title: 'Retry Failed',
        description: parsed.message || 'Unable to start payment. Please try again.',
      });
    },
  });

  const handlePlaceOrder = useCallback(async () => {
    if (!selectedAddress) {
      showToast({
        type: 'error',
        title: 'Address Required',
        description: 'Please select a delivery address to continue.',
      });
      return;
    }

    // Refetch backend cart right before order placement to guarantee sync with PostgreSQL
    try {
      const freshCart = await queryClient.fetchQuery({
        queryKey: queryKeys.cart(),
        queryFn: () => cartService.getCart(),
        staleTime: 0,
      });

      if (!freshCart || freshCart.items.length === 0) {
        showToast({
          type: 'error',
          title: 'Cart Empty',
          description: 'Your cart is empty. Please add items before checking out.',
        });
        return;
      }
    } catch {
      // If network glitch occurs during refetch, fallback to local cart validation
    }

    if (paymentMethod === 'WALLET' && walletData && walletData.balance < pricing.totalAmount) {
      showToast({
        type: 'error',
        title: 'Insufficient Balance',
        description: 'Your wallet balance is insufficient.',
      });
      return;
    }

    placeOrderMutation.mutate();
  }, [selectedAddress, queryClient, paymentMethod, walletData, pricing.totalAmount, placeOrderMutation, showToast]);

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
                title: 'Cash on Delivery',
                desc: 'Pay when your order arrives (Cash or UPI QR)',
                badge: 'Popular',
              },
              {
                id: 'WALLET',
                title: 'Aether Pay Wallet',
                desc: 'Instant 1-click checkout using your wallet balance',
                badge: 'Fastest',
              },
              {
                id: 'RAZORPAY',
                title: 'UPI / Cards / NetBanking',
                desc: 'Secure online payment via Razorpay Test Mode',
                badge: 'Online',
              },
            ].map((method) => {
              const isSelected = paymentMethod === method.id;
              const isWallet = method.id === 'WALLET';
              const isInsufficientWallet = isWallet && walletData != null && walletData.balance < pricing.totalAmount;

              return (
                <div key={method.id} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer select-none',
                      isSelected
                        ? 'border-brand-emerald bg-brand-emerald/5 shadow-sm'
                        : 'border-border-primary bg-bg-secondary hover:border-text-secondary',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                          isSelected ? 'border-brand-emerald bg-brand-emerald' : 'border-text-tertiary',
                        )}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-text-primary font-heading">{method.title}</span>
                        <span className="text-[10px] text-text-secondary block mt-0.5">{method.desc}</span>
                        {isWallet && walletData != null && (
                          <span
                            className={cn(
                              'text-[11px] font-bold block mt-1',
                              isInsufficientWallet ? 'text-red-500' : 'text-brand-emerald',
                            )}
                          >
                            Available Balance: {formatCurrency(walletData.balance)}
                            {isInsufficientWallet && ' (Insufficient)'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald uppercase shrink-0">
                      {method.badge}
                    </span>
                  </button>

                  {/* Warning banner when selected Wallet is insufficient */}
                  {isSelected && isInsufficientWallet && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Insufficient Wallet Balance</span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        Your wallet balance ({formatCurrency(walletData?.balance ?? 0)}) is less than the order total ({formatCurrency(pricing.totalAmount)}).
                      </p>
                      <div className="pt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('COD')}
                          className="text-[11px] font-bold text-brand-emerald hover:underline cursor-pointer"
                        >
                          [ Choose Cash on Delivery ]
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('RAZORPAY')}
                          className="text-[11px] font-bold text-brand-emerald hover:underline cursor-pointer"
                        >
                          [ Pay via UPI/Card ]
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
      {/* Pending Payment Alert Banner */}
      {pendingOrder && pendingOrder.paymentStatus === 'PENDING' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <div>
            <span className="font-bold font-heading block text-sm">Pending Payment Found</span>
            <span className="text-[11px] opacity-90">Order #{pendingOrder.orderNumber} ({formatCurrency(pendingOrder.totalAmount)})</span>
          </div>
          <button
            type="button"
            disabled={retryPaymentMutation.isPending}
            onClick={() => retryPaymentMutation.mutate(pendingOrder.id)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            {retryPaymentMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span>Retry Payment</span>
            )}
          </button>
        </div>
      )}

      {/* Place Order CTA */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={!selectedAddress || placeOrderMutation.isPending || isProcessingPayment}
            onClick={handlePlaceOrder}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-brand-emerald hover:bg-brand-emerald-dark text-white font-extrabold text-sm shadow-xl hover:shadow-brand-emerald/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {placeOrderMutation.isPending || isProcessingPayment ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  {paymentMethod === 'RAZORPAY'
                    ? 'Processing Payment...'
                    : 'Placing Order...'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {paymentMethod === 'COD'
                    ? `Place Order • ${formatCurrency(pricing.totalAmount)}`
                    : paymentMethod === 'WALLET'
                    ? `Pay from Wallet • ${formatCurrency(pricing.totalAmount)}`
                    : `Pay Securely • ${formatCurrency(pricing.totalAmount)}`}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
            <span>100% Safe & Secure Payments (Razorpay Test Mode)</span>
          </div>
        </div>
      </div>

      {/* Razorpay Test Mode Simulator Modal */}
      <RazorpayTestModal
        isOpen={showTestSimulator}
        order={pendingOrder}
        onSuccess={(razorpayPaymentId) => handleConfirmPayment(pendingOrder!, 'SUCCESS', razorpayPaymentId)}
        onFailure={() => handleConfirmPayment(pendingOrder!, 'FAILED')}
        onCancel={() => {
          setShowTestSimulator(false);
          showToast({
            type: 'error',
            title: 'Payment Cancelled',
            description: 'Payment cancelled. You can try again.',
          });
        }}
        isProcessing={isProcessingPayment}
      />

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

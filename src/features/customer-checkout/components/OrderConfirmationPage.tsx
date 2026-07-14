import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  MapPin,
  Loader2,
  Package,
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { orderService } from '../services/order-service';
import { pageTransition } from '../../../core/theme/animations';
import { formatCurrency } from '../../../utils/formatters';
import { ORDER_STATUS_LABELS } from '../../../core/config/constants';

interface LocationState {
  orderId?: string;
  status?: 'success' | 'failed';
}

export const OrderConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const isSuccess = state.status === 'success';
  const orderId = state.orderId;

  // ─── Fetch real order from backend ───────────────────────────────────────
  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.orderDetail(orderId ?? ''),
    queryFn: () => orderService.getOrderById(orderId!),
    enabled: isSuccess && !!orderId,
    staleTime: 5 * 60_000,
    retry: 2,
  });

  const etaTime = new Date(Date.now() + 18 * 60 * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-[60vh] flex items-center justify-center p-4 select-none"
    >
      <div className="w-full max-w-md p-6 md:p-8 rounded-2xl border border-border-primary bg-bg-secondary shadow-high text-center space-y-6">

        {isSuccess ? (
          <div className="space-y-4">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto text-brand-emerald p-3 bg-brand-emerald/10 rounded-full w-fit"
            >
              <CheckCircle2 className="h-12 w-12" />
            </motion.div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-heading">
                Order Placed! 🎉
              </h2>
              <p className="text-xs text-text-secondary">
                Your order is confirmed and the store is preparing it now.
              </p>
            </div>

            {/* Order Details from backend */}
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-text-secondary py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading order details…
              </div>
            ) : order ? (
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary/60 text-xs font-semibold text-text-secondary space-y-2.5 text-left">
                <div className="flex justify-between">
                  <span>Order ID</span>
                  <span className="text-text-primary font-heading font-extrabold">
                    #{order.orderNumber || order.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Status</span>
                  <span className="text-brand-emerald font-bold">
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Payment</span>
                  <span className="text-text-primary">{order.paymentMethod}</span>
                </div>

                <div className="flex justify-between">
                  <span>Items</span>
                  <span className="text-text-primary">{order.items.length} item(s)</span>
                </div>

                <div className="flex justify-between font-extrabold text-sm">
                  <span className="text-text-primary">Total Paid</span>
                  <span className="text-brand-emerald font-heading">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Est. Delivery</span>
                  <span className="text-brand-emerald font-heading font-extrabold flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {order.estimatedDeliveryTime ?? `~${etaTime}`}
                  </span>
                </div>

                {/* Delivery address */}
                {order.deliveryAddress && (
                  <div className="pt-2 border-t border-border-primary/60">
                    <span className="text-[10px] uppercase tracking-wider block mb-1">Delivering to</span>
                    <span className="text-text-primary">
                      {order.deliveryAddress.streetAddress}, {order.deliveryAddress.city}
                    </span>
                  </div>
                )}

                {/* Items preview */}
                <div className="pt-2 border-t border-border-primary/60 space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    Items in this order
                  </span>
                  {order.items.map((item) => (
                    <div key={item.productId} className="flex justify-between">
                      <span className="truncate flex-1">{item.productName} × {item.quantity}</span>
                      <span className="text-text-primary ml-2">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Fallback if order fetch fails */
              <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary/60 text-xs font-semibold text-text-secondary text-left">
                <div className="flex justify-between">
                  <span>Order Reference</span>
                  <span className="text-text-primary font-heading font-extrabold">
                    #{orderId?.substring(0, 8).toUpperCase() ?? 'PENDING'}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <span>Est. Delivery</span>
                  <span className="text-brand-emerald font-heading font-extrabold">
                    ~18 mins
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {orderId && (
                <button
                  onClick={() => navigate(`/c/orders/track/${orderId}`)}
                  className="flex-1 py-3 bg-brand-emerald text-white hover:bg-brand-emerald-hover text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-subtle"
                >
                  Track Live Order
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => navigate('/c/home')}
                className="flex-1 py-3 border border-border-primary text-text-secondary hover:bg-bg-tertiary text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          /* Failure State */
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto text-status-error p-3 bg-status-error/10 rounded-full w-fit"
            >
              <XCircle className="h-12 w-12" />
            </motion.div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-heading">
                Order Failed
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                We could not place your order. No charges have been applied. Please try again.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => navigate('/c/checkout')}
                className="flex-1 py-3 bg-status-error text-white hover:bg-status-error/90 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-subtle"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => navigate('/c/home')}
                className="flex-1 py-3 border border-border-primary text-text-secondary hover:bg-bg-tertiary text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderConfirmationPage;

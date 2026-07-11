import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, ShoppingBag, MapPin } from 'lucide-react';
import { pageTransition } from '../../../core/theme/animations';

export const OrderConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');

  const isSuccess = status === 'success';

  // Generate random order ID and tracking ETA (15 minutes from now)
  const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
  const etaTime = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
          // Success State
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto text-brand-emerald p-3 bg-brand-emerald/10 rounded-full w-fit"
            >
              <CheckCircle2 className="h-12 w-12" />
            </motion.div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-heading">Order Placed Successfully!</h2>
              <p className="text-xs text-text-secondary">Your payment has been secure-routed and items packed.</p>
            </div>

            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary/60 text-xs font-semibold text-text-secondary space-y-2 text-left">
              <div className="flex justify-between">
                <span>Order ID</span>
                <span className="text-text-primary font-heading font-extrabold">{orderId}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Delivery ETA</span>
                <span className="text-brand-emerald font-heading font-extrabold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {etaTime} (15 Mins)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => navigate(`/c/orders/track/${orderId}`)}
                className="flex-1 py-3 bg-brand-emerald text-white hover:bg-brand-emerald-hover text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-subtle"
              >
                Track Live Order
                <ArrowRight className="h-4 w-4" />
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
        ) : (
          // Failure State
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto text-status-error p-3 bg-status-error/10 rounded-full w-fit"
            >
              <XCircle className="h-12 w-12 animate-shake" />
            </motion.div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-text-primary tracking-tight font-heading">Payment Authorization Failed</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                The gateway transaction was rejected by your bank card issuer. No funds have been debited from your account.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => navigate('/c/checkout')}
                className="flex-1 py-3 bg-status-error text-white hover:bg-status-error/90 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-subtle"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Payment
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

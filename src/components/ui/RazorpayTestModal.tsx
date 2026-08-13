import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';
import type { OrderData } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface RazorpayTestModalProps {
  isOpen: boolean;
  order: OrderData | null;
  onSuccess: (razorpayPaymentId?: string) => Promise<void>;
  onFailure: () => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
}

export const RazorpayTestModal: React.FC<RazorpayTestModalProps> = ({
  isOpen,
  order,
  onSuccess,
  onFailure,
  onCancel,
  isProcessing,
}) => {
  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-overlay flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md bg-bg-secondary border border-brand-emerald/30 rounded-3xl shadow-2xl overflow-hidden text-text-primary"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-emerald to-emerald-700 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-6 w-6 text-emerald-200 shrink-0" />
              <div>
                <h3 className="font-heading font-extrabold text-sm tracking-wide">
                  RAZORPAY TEST ENVIRONMENT
                </h3>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Test Mode Payment Simulator
                </span>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="p-1 rounded-full hover:bg-white/10 transition-colors text-white/80 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 text-xs">
            {/* Warning banner */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-0.5 font-medium">
                <span className="font-bold">Test Sandbox Active</span>
                <p className="text-[11px] leading-relaxed">
                  No real money will be charged. Select an outcome below to test order payment state transitions.
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-2xl bg-bg-tertiary border border-border-primary space-y-2">
              <div className="flex justify-between font-semibold text-text-secondary">
                <span>Order Number:</span>
                <span className="font-mono text-text-primary font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between font-semibold text-text-secondary">
                <span>Store:</span>
                <span className="text-text-primary font-bold">{order.storeName || 'Aether Store'}</span>
              </div>
              <div className="pt-2 border-t border-border-primary flex justify-between items-center text-sm font-extrabold font-heading">
                <span>Total Amount:</span>
                <span className="text-brand-emerald text-base">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => onSuccess(`pay_test_${Date.now()}`)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-emerald hover:bg-brand-emerald-dark text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Simulate Payment SUCCESS</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={onFailure}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs border border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <span>Simulate Payment FAILURE</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={onCancel}
                className="w-full py-2.5 rounded-xl border border-border-primary hover:bg-bg-tertiary text-text-secondary font-bold text-xs transition-all cursor-pointer"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

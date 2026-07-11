import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Phone, 
  ShieldCheck, 
  AlertTriangle,
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  Package,
  Truck,
  UserCheck
} from 'lucide-react';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';

export const LiveOrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [orderStatus, setOrderStatus] = useState<'PLACED' | 'PACKING' | 'TRANSIT' | 'ARRIVED'>('TRANSIT');
  const [riderProgress, setRiderProgress] = useState(40); // percent progress along the path
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Auto-progress tracking timeline simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setRiderProgress((prev) => {
        if (prev >= 100) {
          setOrderStatus('ARRIVED');
          clearInterval(timer);
          return 100;
        }
        const next = prev + 5;
        if (next >= 85) setOrderStatus('ARRIVED');
        else if (next >= 50) setOrderStatus('TRANSIT');
        else if (next >= 20) setOrderStatus('PACKING');
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCancelOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason) {
      showToast({
        type: 'error',
        title: 'Select Reason',
        description: 'Please select or type a cancellation reason.',
      });
      return;
    }
    setShowCancelModal(false);
    showToast({
      type: 'success',
      title: 'Order Cancelled',
      description: 'Your order has been cancelled and funds refunded to your wallet.',
    });
    navigate('/c/home');
  };

  const handleCallRider = () => {
    showToast({
      type: 'success',
      title: 'Connecting Call',
      description: 'Dialing delivery partner via masked phone channel...',
    });
  };

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 pb-12 select-none"
    >
      {/* Header back navigation */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate('/c/profile/insights?tab=orders')} 
          className="p-2 border border-border-primary rounded-xl bg-bg-secondary hover:bg-bg-tertiary cursor-pointer text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="text-base font-extrabold text-text-primary tracking-tight font-heading">
            Track Order #{id}
          </h1>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">
            Arriving in 12 Mins
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Map & Timeline */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Simulated Map Visualizer */}
          <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-border-primary bg-bg-tertiary flex items-center justify-center">
            
            {/* Minimalist Grid and Path SVG Map */}
            <svg className="absolute inset-0 w-full h-full text-border-primary" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Delivery Path Route */}
              <path 
                d="M 50 150 Q 150 50 250 120 T 450 80" 
                stroke="#d1d5db" 
                strokeWidth="4" 
                strokeLinecap="round" 
                className="opacity-50"
              />
              <path 
                d="M 50 150 Q 150 50 250 120 T 450 80" 
                stroke="var(--color-brand-emerald)" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeDasharray="500"
                strokeDashoffset={500 - (500 * riderProgress) / 100}
                className="transition-all duration-1000"
              />
            </svg>

            {/* Store pin (start) */}
            <div className="absolute left-[8%] bottom-[30%] flex flex-col items-center">
              <span className="text-xl">🏪</span>
              <span className="text-[8px] font-extrabold bg-bg-secondary px-1 py-0.5 rounded border border-border-primary text-text-primary shadow-subtle uppercase">Store</span>
            </div>

            {/* Rider marker */}
            <div 
              className="absolute p-2.5 rounded-full bg-brand-emerald text-white shadow-high z-10 transition-all duration-1000 flex items-center justify-center"
              style={{
                left: `${10 + (riderProgress * 0.72)}%`,
                bottom: `${20 + (Math.sin((riderProgress / 100) * Math.PI) * 35)}%`,
              }}
            >
              <Truck className="h-4.5 w-4.5 animate-bounce" />
            </div>

            {/* Home pin (end) */}
            <div className="absolute right-[8%] top-[30%] flex flex-col items-center">
              <span className="text-xl">📍</span>
              <span className="text-[8px] font-extrabold bg-brand-emerald text-white px-1 py-0.5 rounded shadow-high uppercase">Home</span>
            </div>

            {/* Floating details overlay */}
            <div className="absolute top-4 left-4 bg-bg-secondary/90 backdrop-blur border border-border-primary px-3 py-2 rounded-xl text-xs font-bold text-text-primary shadow-subtle flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-emerald animate-ping" />
              Rider is {Math.round(riderProgress)}% close to your door
            </div>
          </div>

          {/* Timeline Milestones tracker */}
          <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-5">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border-primary pb-2">Order timeline</h3>
            
            <div className="relative border-l border-border-primary ml-3 pl-6 space-y-6 text-xs">
              
              {/* Milestone 1: Placed */}
              <div className="relative">
                <span className="absolute -left-[30px] top-0 p-1 rounded-full bg-brand-emerald text-white shadow-subtle">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className="font-extrabold text-text-primary">Order Confirmed</h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Payment authorized & order registered.</p>
                </div>
              </div>

              {/* Milestone 2: Packing */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-0 p-1 rounded-full shadow-subtle",
                  orderStatus !== 'PLACED' ? "bg-brand-emerald text-white" : "bg-bg-tertiary text-text-secondary"
                )}>
                  {orderStatus === 'PLACED' ? <Package className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <h4 className={cn("font-extrabold", orderStatus !== 'PLACED' ? "text-text-primary" : "text-text-secondary")}>
                    Packed & Dispatched
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Quality check completed and boxed.</p>
                </div>
              </div>

              {/* Milestone 3: Transit */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-0 p-1 rounded-full shadow-subtle",
                  orderStatus === 'TRANSIT' || orderStatus === 'ARRIVED' ? "bg-brand-emerald text-white animate-pulse" : "bg-bg-tertiary text-text-secondary"
                )}>
                  {orderStatus === 'ARRIVED' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <h4 className={cn("font-extrabold", orderStatus === 'TRANSIT' || orderStatus === 'ARRIVED' ? "text-text-primary animate-pulse" : "text-text-secondary")}>
                    Out for Delivery
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Rider is navigating via express route.</p>
                </div>
              </div>

              {/* Milestone 4: Arrived */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-0 p-1 rounded-full shadow-subtle",
                  orderStatus === 'ARRIVED' ? "bg-brand-emerald text-white" : "bg-bg-tertiary text-text-secondary"
                )}>
                  <UserCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className={cn("font-extrabold", orderStatus === 'ARRIVED' ? "text-text-primary" : "text-text-secondary")}>
                    Delivered
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Verify order box items with rider.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right column: Rider Info, Cancel Trigger, Support */}
        <div className="space-y-6">
          
          {/* Rider Info Card */}
          <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary text-center space-y-4">
            <div className="relative mx-auto h-16 w-16 rounded-full overflow-hidden bg-bg-tertiary border border-border-primary flex items-center justify-center">
              <span className="text-3xl">🚴</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald rounded uppercase tracking-wider font-heading">Rider Assigned</span>
              <h3 className="text-sm font-bold text-text-primary mt-1.5">Ramesh Kumar</h3>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">Hero Splendor • KA-03-HA-8822</p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleCallRider}
                className="flex-1 py-2.5 rounded-xl border border-border-primary bg-bg-tertiary hover:bg-bg-primary text-xs font-bold text-text-primary flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5" /> Call Rider
              </button>
              <button 
                onClick={() => navigate('/c/profile/insights?tab=support')}
                className="flex-1 py-2.5 rounded-xl border border-border-primary bg-bg-tertiary hover:bg-bg-primary text-xs font-bold text-text-primary flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Support
              </button>
            </div>
          </div>

          {/* Cancellation Warning Panel */}
          {orderStatus !== 'TRANSIT' && orderStatus !== 'ARRIVED' && (
            <div className="p-5 rounded-2xl border border-status-error/20 bg-status-error/5 space-y-3">
              <h4 className="text-xs font-bold text-status-error flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5" /> Cancel Order
              </h4>
              <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">
                You can cancel this order and claim 100% refund as the dispatch checks have not been verified yet.
              </p>
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full py-2.5 bg-status-error text-white hover:bg-status-error/90 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel Order
              </button>
            </div>
          )}

          {/* Secure Packing parameters */}
          <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex items-center gap-2 text-xs font-semibold text-text-secondary">
            <ShieldCheck className="h-5 w-5 text-brand-emerald" />
            <span>Tamper-proof sanitized packaging bag active</span>
          </div>

        </div>

      </div>

      {/* Cancellation Modal Dialog */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-overlay flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-2xl bg-bg-secondary border border-border-primary shadow-high space-y-4">
            <h3 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Cancel Order Confirmation</h3>
            <p className="text-xs text-text-secondary leading-relaxed font-semibold">
              Are you sure you want to cancel this order? Let us know the reason to help us improve.
            </p>

            <form onSubmit={handleCancelOrderSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-2">
                {[
                  'Ordered duplicate items by mistake',
                  'Delivery timeline is too long',
                  'Forgot to apply discount promo code',
                  'Changed delivery address coordinates'
                ].map((reason, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 p-2 rounded hover:bg-bg-tertiary cursor-pointer">
                    <input 
                      type="radio" 
                      name="cancelReason" 
                      value={reason} 
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="accent-status-error cursor-pointer" 
                    />
                    <span className="text-text-primary font-semibold">{reason}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2.5 border border-border-primary rounded-xl text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-status-error text-white hover:bg-status-error/90 rounded-xl cursor-pointer"
                >
                  Cancel Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </motion.div>
  );
};

export default LiveOrderTrackingPage;

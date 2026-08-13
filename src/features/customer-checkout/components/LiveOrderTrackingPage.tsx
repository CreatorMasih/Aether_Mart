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
  UserCheck,
  Loader2
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { orderService } from '../services/order-service';
import { socketService } from '../../../core/socket/socket-service';
import { RealTrackingMap } from '../../../components/ui/RealTrackingMap';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';
import { pageTransition } from '../../../core/theme/animations';

export const LiveOrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [riderLocOverride, setRiderLocOverride] = useState<{ lat: number; lng: number } | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<{ distanceKm: number; durationMins: number } | null>(null);

  // 1. Fetch real Order details from PostgreSQL backend
  const { data: order, isLoading, isError } = useQuery({
    queryKey: queryKeys.orderDetail(id!),
    queryFn: () => orderService.getOrderById(id!),
    enabled: !!id,
    refetchInterval: 5000, // Poll order status every 5 seconds
  });

  // 2. Real-time Socket.IO live status & rider location updates
  useEffect(() => {
    if (!id) return;

    const handleStatusUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(id) });
    };

    const handleRiderLocationUpdate = (locData: any) => {
      if (locData.orderId === id || !locData.orderId) {
        setRiderLocOverride({ lat: locData.latitude, lng: locData.longitude });
      }
    };

    socketService.trackOrder(id, handleStatusUpdate);
    socketService.on('rider:location_update', handleRiderLocationUpdate);

    return () => {
      socketService.untrackOrder(id, handleStatusUpdate);
      socketService.off('rider:location_update', handleRiderLocationUpdate);
    };
  }, [id, queryClient]);

  if (isLoading) {
    return (
      <div className="flex h-80 items-center justify-center text-xs font-semibold text-text-secondary select-none gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-brand-emerald" />
        Loading real-time order tracking...
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-xs font-semibold text-text-secondary select-none space-y-3">
        <AlertTriangle className="h-10 w-10 text-status-warning" />
        <h3 className="font-extrabold text-text-primary text-sm">Order Not Found</h3>
        <p className="text-[10px] text-text-secondary">We couldn't retrieve order details for ID: #{id}.</p>
        <button
          onClick={() => navigate('/c/profile/insights?tab=orders')}
          className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-bold cursor-pointer"
        >
          View Order History
        </button>
      </div>
    );
  }

  // Calculate real store & customer locations from PostgreSQL record
  const storeLoc = {
    lat: order.store?.latitude ?? 21.1085,
    lng: order.store?.longitude ?? 82.0965,
    name: order.store?.name || 'Aether Merchant Store',
    address: order.store?.address || 'Mahasamund',
  };

  const customerLoc = {
    lat: order.deliveryAddress?.latitude ?? 21.1085,
    lng: order.deliveryAddress?.longitude ?? 82.0965,
    address: order.deliveryAddress?.streetAddress || 'Mahasamund Customer Address',
  };

  const riderInfo = order.deliveryAssignment?.rider;
  const initialRiderLat = riderInfo?.currentLatitude ?? order.deliveryAssignment?.lastLatitude;
  const initialRiderLng = riderInfo?.currentLongitude ?? order.deliveryAssignment?.lastLongitude;

  const activeRiderLoc = riderLocOverride || (initialRiderLat && initialRiderLng ? { lat: initialRiderLat, lng: initialRiderLng } : null);

  const status = order.status;

  const handleCancelOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason) {
      showToast({
        type: 'error',
        title: 'Select Reason',
        description: 'Please select or type a cancellation reason.',
      });
      return;
    }
    try {
      await orderService.requestRefund(order.id, cancelReason);
      setShowCancelModal(false);
      showToast({
        type: 'success',
        title: 'Order Cancelled',
        description: 'Your order has been cancelled and funds refunded to your wallet.',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.orderDetail(id!) });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Cancellation Failed',
        description: err.message || 'Unable to cancel order.',
      });
    }
  };

  const handleCallRider = () => {
    const phone = riderInfo?.phone || order.deliveryAddress?.receiverPhone || '9999999999';
    window.open(`tel:${phone}`);
  };

  // Status mapping for step progress
  const isPackingDone = ['CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);
  const isOutForDelivery = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);
  const isDelivered = status === 'DELIVERED';

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
            Track Order #{order.orderNumber}
          </h1>
          <p className="text-[10px] text-brand-emerald font-bold uppercase tracking-wider mt-0.5">
            {isDelivered 
              ? '✓ Order Delivered' 
              : routeMetrics 
                ? `Arriving in ~${routeMetrics.durationMins} mins (${routeMetrics.distanceKm} km away)` 
                : `Status: ${status}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Real Map & Timeline */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Real Leaflet OpenStreetMap Visualizer */}
          <RealTrackingMap
            storeLocation={storeLoc}
            customerLocation={customerLoc}
            riderLocation={activeRiderLoc}
            height="380px"
            activeStep={isOutForDelivery ? 'TO_CUSTOMER' : 'TO_STORE'}
            onRouteCalculated={(m) => setRouteMetrics(m)}
          />

          {/* Timeline Milestones tracker */}
          <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-5 shadow-subtle">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-border-primary pb-2">Order timeline</h3>
            
            <div className="relative border-l border-border-primary ml-3 pl-6 space-y-6 text-xs font-semibold">
              
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
                  isPackingDone ? "bg-brand-emerald text-white" : "bg-bg-tertiary text-text-secondary"
                )}>
                  {isPackingDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <h4 className={cn("font-extrabold", isPackingDone ? "text-text-primary" : "text-text-secondary")}>
                    Packed & Prepared
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Merchant is preparing your order items.</p>
                </div>
              </div>

              {/* Milestone 3: Transit */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-0 p-1 rounded-full shadow-subtle",
                  isOutForDelivery ? "bg-brand-emerald text-white animate-pulse" : "bg-bg-tertiary text-text-secondary"
                )}>
                  {isDelivered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <h4 className={cn("font-extrabold", isOutForDelivery ? "text-text-primary animate-pulse" : "text-text-secondary")}>
                    Out for Delivery
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Rider is navigating via express route.</p>
                </div>
              </div>

              {/* Milestone 4: Arrived */}
              <div className="relative">
                <span className={cn(
                  "absolute -left-[30px] top-0 p-1 rounded-full shadow-subtle",
                  isDelivered ? "bg-brand-emerald text-white" : "bg-bg-tertiary text-text-secondary"
                )}>
                  <UserCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h4 className={cn("font-extrabold", isDelivered ? "text-text-primary" : "text-text-secondary")}>
                    Delivered
                  </h4>
                  <p className="text-[10px] text-text-secondary mt-0.5">Handover complete at customer location.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right column: Rider Info, Cancel Trigger, Support */}
        <div className="space-y-6">
          
          {/* Rider Info Card */}
          <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary text-center space-y-4 shadow-subtle">
            <div className="relative mx-auto h-16 w-16 rounded-full overflow-hidden bg-bg-tertiary border border-border-primary flex items-center justify-center">
              <span className="text-3xl">🚴</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald rounded uppercase tracking-wider font-heading">
                {riderInfo ? 'Rider Assigned' : 'Finding Nearby Rider'}
              </span>
              <h3 className="text-sm font-bold text-text-primary mt-1.5">
                {riderInfo?.fullName || 'Assigning Partner...'}
              </h3>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mt-0.5">
                {riderInfo?.vehicleType || 'BIKE'} • {riderInfo?.vehiclePlateNumber || 'Aether Express'}
              </p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleCallRider}
                disabled={!riderInfo}
                className="flex-1 py-2.5 rounded-xl border border-border-primary bg-bg-tertiary hover:bg-bg-primary text-xs font-bold text-text-primary flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
          {status === 'PLACED' && (
            <div className="p-5 rounded-2xl border border-status-error/20 bg-status-error/5 space-y-3">
              <h4 className="text-xs font-bold text-status-error flex items-center gap-1.5">
                <AlertTriangle className="h-4.5 w-4.5" /> Cancel Order
              </h4>
              <p className="text-[10px] text-text-secondary leading-relaxed font-semibold">
                You can cancel this order and claim 100% refund as store processing has not started yet.
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

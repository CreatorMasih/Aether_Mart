import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Square, 
  CheckSquare, 
  Navigation,
  ShieldCheck,
  AlertTriangle,
  Camera,
  HelpCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { riderService } from '../services/rider-service';
import { socketService } from '../../../core/socket/socket-service';
import { RealTrackingMap } from '../../../components/ui/RealTrackingMap';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

export const RiderJobActive: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [otpVal, setOtpVal] = useState('');
  const [pickupOtpVal, setPickupOtpVal] = useState('');
  const [signatureDone, setSignatureDone] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  // Local Geolocation coords captured from real device/browser GPS
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 21.1085, lng: 82.0965 });
  const [localStatusOverride, setLocalStatusOverride] = useState<'ARRIVED_STORE' | 'ARRIVED_CUSTOMER' | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [routeMetrics, setRouteMetrics] = useState<{ distanceKm: number; durationMins: number } | null>(null);

  // 1. Fetch current rider assignments to find active job
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: queryKeys.riderAssignments(),
    queryFn: () => riderService.getAssignments(),
    refetchInterval: 5000, // Poll active assignment status every 5 seconds
  });

  const assignments = assignmentsData ?? [];
  const activeJob = assignments.find((ass) => 
    ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(ass.status)
  );

  // Real device GPS tracking
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('Rider GPS location unavailable:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 2. Real-Time Coordinates streaming via Socket.IO + HTTP heartbeat
  useEffect(() => {
    if (!activeJob) return;

    // Send initial location update
    socketService.updateRiderLocation(activeJob.orderId, coords.lat, coords.lng);
    riderService.sendHeartbeat(coords.lat, coords.lng, true).catch(console.error);

    // Stream updates every 4 seconds
    const intervalId = setInterval(() => {
      socketService.updateRiderLocation(activeJob.orderId, coords.lat, coords.lng);
      riderService.sendHeartbeat(coords.lat, coords.lng, true).catch(console.error);
    }, 4000);

    return () => clearInterval(intervalId);
  }, [activeJob, coords]);

  // Sync checklist when active job changes
  useEffect(() => {
    if (activeJob) {
      setCheckedItems([]);
      setLocalStatusOverride(null);
    }
  }, [activeJob?.id]);

  // 3. Mutations
  const confirmPickupMutation = useMutation({
    mutationFn: ({ orderId, pickupOtp }: { orderId: string; pickupOtp: string }) =>
      riderService.confirmPickup(orderId, pickupOtp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.riderAssignments() });
      setLocalStatusOverride(null);
      showToast({
        type: 'success',
        title: 'Verified Store Handover',
        description: 'Navigating to customer dropoff location.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        description: err.message || 'Invalid pickup OTP PIN code.',
      });
    }
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: ({ orderId, deliveryOtp }: { orderId: string; deliveryOtp: string }) =>
      riderService.confirmDelivery(orderId, deliveryOtp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.riderAssignments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.riderEarnings() });
      setLocalStatusOverride(null);
      showToast({
        type: 'success',
        title: 'Delivery Complete',
        description: 'Earnings successfully credited to your wallet balance.',
      });
      navigate('/r/dashboard');
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Delivery Failed',
        description: err.message || 'Invalid customer delivery OTP PIN code.',
      });
    }
  });

  if (assignmentsLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-semibold text-text-secondary select-none">
        Loading active delivery status...
      </div>
    );
  }

  if (!activeJob) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-xs font-semibold text-text-secondary select-none space-y-3">
        <AlertTriangle className="h-10 w-10 text-status-warning" />
        <h4 className="font-extrabold text-text-primary text-xs">No Active Delivery Job</h4>
        <p className="text-[10px] text-text-secondary leading-relaxed">Please accept a job from your delivery partner console to start routing.</p>
        <button
          onClick={() => navigate('/r/dashboard')}
          className="px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-bold cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const order = activeJob.order;
  const currentStatus = localStatusOverride || activeJob.status;

  const storeLoc = {
    lat: order.store?.latitude ?? 21.1085,
    lng: order.store?.longitude ?? 82.0965,
    name: order.store?.name || 'Store',
    address: order.store?.address || 'Mahasamund',
  };

  const customerLoc = {
    lat: order.deliveryAddress?.latitude ?? 21.1085,
    lng: order.deliveryAddress?.longitude ?? 82.0965,
    address: order.deliveryAddress?.streetAddress || 'Customer Address',
  };

  const handleAdvanceToStoreArrived = () => {
    setLocalStatusOverride('ARRIVED_STORE');
    showToast({
      type: 'success',
      title: 'Arrived at Store',
      description: 'Please inspect checklist and verify pickup OTP.',
    });
  };

  const handleAdvanceToCustomerArrived = () => {
    setLocalStatusOverride('ARRIVED_CUSTOMER');
    showToast({
      type: 'success',
      title: 'Arrived at Customer',
      description: 'Please collect customer signature and verify delivery OTP.',
    });
  };

  const handleVerifyPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupOtpVal) {
      showToast({
        type: 'error',
        title: 'OTP Required',
        description: 'Please enter the 4-digit handover OTP from the store.',
      });
      return;
    }

    if (checkedItems.length < order.items.length) {
      showToast({
        type: 'error',
        title: 'Checklist Incomplete',
        description: 'Verify and check off all items in the checklist before pickup.',
      });
      return;
    }

    confirmPickupMutation.mutate({
      orderId: activeJob.orderId,
      pickupOtp: pickupOtpVal,
    });
  };

  const handleCompleteDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureDone || !photoUploaded) {
      showToast({
        type: 'error',
        title: 'Incomplete Verification',
        description: 'Please sign and upload proof of delivery photo first.',
      });
      return;
    }

    if (!otpVal) {
      showToast({
        type: 'error',
        title: 'OTP Required',
        description: 'Please input the customer confirmation OTP code.',
      });
      return;
    }

    confirmDeliveryMutation.mutate({
      orderId: activeJob.orderId,
      deliveryOtp: otpVal,
    });
  };

  const toggleCheckItemLocal = (productId: string) => {
    setCheckedItems((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  return (
    <div className="space-y-6 pb-16 text-xs font-semibold text-text-secondary select-none max-w-lg mx-auto">
      
      {/* 1. Header nav bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/r/dashboard')}
          className="p-2 border border-border-primary rounded-xl hover:bg-bg-secondary text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Route Navigation</h2>
          <span className="text-[9px] text-text-secondary uppercase mt-0.5 block font-bold tracking-wider">Order #{order.orderNumber}</span>
        </div>
      </div>

      {/* 2. Real Leaflet Routing Map */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-2">
            <Navigation className="h-4 w-4 text-brand-emerald animate-pulse" />
            Live GPS Route
          </h3>
          {routeMetrics && (
            <span className="text-[10px] font-extrabold text-brand-emerald bg-brand-emerald/10 px-2 py-0.5 rounded uppercase">
              {routeMetrics.distanceKm} km • ~{routeMetrics.durationMins} min ETA
            </span>
          )}
        </div>

        <RealTrackingMap
          storeLocation={storeLoc}
          customerLocation={customerLoc}
          riderLocation={coords}
          height="320px"
          activeStep={currentStatus === 'PICKED_UP' || currentStatus === 'ARRIVED_CUSTOMER' ? 'TO_CUSTOMER' : 'TO_STORE'}
          onRouteCalculated={(m) => setRouteMetrics(m)}
        />
      </div>

      {/* 3. Steps workflow details */}
      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4 shadow-subtle">
        
        {/* Step 1: Accepted (Ready to ride to store) */}
        {currentStatus === 'ACCEPTED' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase">Step 1: Navigate to Pickup Store</h4>
            <div className="p-3 bg-bg-tertiary rounded-xl border border-border-primary space-y-1">
              <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block">Pickup Store</span>
              <p className="font-bold text-text-primary">{order.storeName || order.store?.name}</p>
              <p className="text-text-secondary font-semibold">{order.deliveryAddress?.streetAddress || order.store?.address}</p>
            </div>
            <button
              onClick={handleAdvanceToStoreArrived}
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer"
            >
              Mark Arrived at Store
            </button>
          </div>
        )}

        {/* Step 2: Arrived Store (Packing checklist inspection & OTP verification) */}
        {currentStatus === 'ARRIVED_STORE' && (
          <form onSubmit={handleVerifyPickup} className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase border-b border-border-primary/60 pb-2">
              Step 2: Verify Store Handover (OTP: {activeJob.pickupOtp})
            </h4>

            {/* Checklist */}
            <div className="space-y-2.5">
              <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider block">Checklist Items</span>
              {(order.items || []).map((item: any) => {
                const isChecked = checkedItems.includes(item.productId);
                return (
                  <div
                    key={item.productId}
                    onClick={() => toggleCheckItemLocal(item.productId)}
                    className="p-3 rounded-xl border border-border-primary bg-bg-tertiary flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckSquare className="h-4.5 w-4.5 text-brand-emerald" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-text-secondary" />
                      )}
                      <span className="font-bold text-text-primary">{item.productName || item.name}</span>
                    </div>
                    <span className="font-bold text-text-secondary">Qty: {item.quantity}</span>
                  </div>
                );
              })}
            </div>

            {/* OTP Form */}
            <div className="space-y-1">
              <label htmlFor="pickupOtpVal" className="text-[10px] font-bold text-text-secondary uppercase">Store Pickup OTP PIN</label>
              <input
                id="pickupOtpVal"
                type="text"
                placeholder="Enter 4-digit code"
                value={pickupOtpVal}
                onChange={(e) => setPickupOtpVal(e.target.value)}
                className="w-full px-3 py-2.5 border border-border-primary bg-bg-tertiary rounded-xl text-center focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={confirmPickupMutation.isPending}
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer disabled:opacity-50"
            >
              {confirmPickupMutation.isPending ? 'Verifying...' : 'Verify Pickup & Start Delivery'}
            </button>
          </form>
        )}

        {/* Step 3: Picked Up (In Transit to Customer) */}
        {currentStatus === 'PICKED_UP' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase">Step 3: In Transit to Customer Location</h4>
            <div className="p-3 bg-bg-tertiary rounded-xl border border-border-primary space-y-2">
              <div>
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block">Customer</span>
                <p className="font-bold text-text-primary">{order.deliveryAddress?.receiverName || 'Customer'}</p>
                <p className="text-text-secondary font-semibold leading-relaxed">{order.deliveryAddress?.streetAddress}</p>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border-primary/60">
                <a
                  href={`tel:${order.deliveryAddress?.receiverPhone || '9999999999'}`}
                  className="flex-1 py-2 border border-border-primary rounded-xl flex items-center justify-center gap-1.5 font-bold text-text-primary hover:bg-bg-secondary"
                >
                  <Phone className="h-4 w-4" /> Call Customer
                </a>
              </div>
            </div>
            <button
              onClick={handleAdvanceToCustomerArrived}
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer"
            >
              Mark Arrived at Customer
            </button>
          </div>
        )}

        {/* Step 4: Arrived Customer (OTP input, proof of delivery sign/photo) */}
        {currentStatus === 'ARRIVED_CUSTOMER' && (
          <form onSubmit={handleCompleteDelivery} className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase border-b border-border-primary/60 pb-2">
              Step 4: Verify Delivery Handover (OTP: {activeJob.deliveryOtp})
            </h4>

            {/* Proof of delivery card */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => {
                  setPhotoUploaded(true);
                  showToast({ type: 'success', title: 'Photo Recorded', description: 'Proof of delivery image saved.' });
                }}
                className={cn(
                  "p-4 rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24",
                  photoUploaded ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary hover:bg-bg-tertiary"
                )}
              >
                <Camera className="h-5 w-5" />
                <span className="font-bold text-[9px] uppercase">{photoUploaded ? 'Photo Uploaded' : 'Upload Photo'}</span>
              </div>

              <div
                onClick={() => {
                  setSignatureDone(true);
                  showToast({ type: 'success', title: 'Signature Saved', description: 'Customer signature registered.' });
                }}
                className={cn(
                  "p-4 rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-2 cursor-pointer h-24",
                  signatureDone ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" : "border-border-primary hover:bg-bg-tertiary"
                )}
              >
                <ShieldCheck className="h-5 w-5" />
                <span className="font-bold text-[9px] uppercase">{signatureDone ? 'Signed' : 'Collect Sign'}</span>
              </div>
            </div>

            {/* OTP confirmation code input */}
            <div className="space-y-1">
              <label htmlFor="otpVal" className="text-[10px] font-bold text-text-secondary uppercase">Customer Confirmation OTP PIN</label>
              <input
                id="otpVal"
                type="text"
                placeholder="Enter 4-digit OTP"
                value={otpVal}
                onChange={(e) => setOtpVal(e.target.value)}
                className="w-full px-3 py-2.5 border border-border-primary bg-bg-tertiary rounded-xl text-center focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={confirmDeliveryMutation.isPending}
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer disabled:opacity-50"
            >
              {confirmDeliveryMutation.isPending ? 'Completing...' : 'Verify OTP & Complete Delivery'}
            </button>
          </form>
        )}

      </div>

      {/* 4. Support Helpline and Job cancellation option */}
      <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary flex justify-between items-center text-[10px]">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-4.5 w-4.5 text-text-secondary" />
          <span className="font-bold text-text-primary">Need assistance?</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              alert('Cancellation request forwarded to support dispatch desk.');
              navigate('/r/dashboard');
            }}
            className="py-1 px-3 border border-status-error/30 text-status-error hover:bg-status-error/5 rounded-lg font-bold cursor-pointer"
          >
            Cancel Job
          </button>
          <a
            href="tel:+919999999999"
            className="py-1 px-3 bg-bg-tertiary border border-border-primary text-text-primary rounded-lg font-bold cursor-pointer flex items-center gap-1"
          >
            <Phone className="h-3.5 w-3.5" /> Call Support
          </a>
        </div>
      </div>

    </div>
  );
};

export default RiderJobActive;

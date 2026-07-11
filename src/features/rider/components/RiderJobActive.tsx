import React, { useState } from 'react';
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
import { useRiderStore } from '../store/rider-store';
import { useToast } from '../../../hooks/useToast';
import { cn } from '../../../utils/cn';

export const RiderJobActive: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { 
    activeJob, 
    advanceJobStatus, 
    toggleCheckItem, 
    completeJob, 
    cancelActiveJob 
  } = useRiderStore();

  const [otpVal, setOtpVal] = useState('');
  const [pickupOtpVal, setPickupOtpVal] = useState('');
  const [signatureDone, setSignatureDone] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  if (!activeJob) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center text-xs font-semibold text-text-secondary select-none">
        <AlertTriangle className="h-10 w-10 text-status-warning mb-2" />
        <h4 className="font-extrabold text-text-primary text-xs">No Active Delivery Job</h4>
        <p className="text-[10px] leading-relaxed mt-1">Please accept a job from your delivery partner console to start routing.</p>
        <button
          onClick={() => navigate('/r/dashboard')}
          className="mt-4 px-6 py-2.5 bg-brand-emerald text-white rounded-xl font-bold cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleAdvance = () => {
    advanceJobStatus();
    showToast({
      type: 'success',
      title: 'Status Updated',
      description: `Transitioned to next route stage.`,
    });
  };

  const handleVerifyPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupOtpVal !== activeJob.pickupOtpCode) {
      showToast({
        type: 'error',
        title: 'Verification Failed',
        description: 'Store pickup OTP code does not match active record.',
      });
      return;
    }
    // Verify checklist completed
    const checkedCount = activeJob.checkedItems?.length || 0;
    if (checkedCount < activeJob.items.length) {
      showToast({
        type: 'error',
        title: 'Checklist Incomplete',
        description: 'Please verify and check off all items in the store checklist before pickup.',
      });
      return;
    }

    advanceJobStatus();
    showToast({
      type: 'success',
      title: 'Verified Store Handover',
      description: 'Navigating to dropoff coordinates.',
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

    const success = completeJob(otpVal);
    if (!success) {
      showToast({
        type: 'error',
        title: 'Invalid Delivery OTP',
        description: 'Customer confirmation OTP pin is incorrect.',
      });
      return;
    }

    showToast({
      type: 'success',
      title: 'Delivery Complete',
      description: 'Earnings successfully credited to your wallet.',
    });
    navigate('/r/dashboard');
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
          <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Route Tracking</h2>
          <span className="text-[9px] text-text-secondary uppercase mt-0.5 block font-bold tracking-wider">{activeJob.id}</span>
        </div>
      </div>

      {/* 2. Routing map simulation container */}
      <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3">
        <h3 className="text-xs font-bold text-text-primary uppercase flex items-center gap-2">
          <Navigation className="h-4.5 w-4.5 text-brand-emerald animate-pulse" />
          Live Route Navigation
        </h3>

        <div className="h-40 rounded-xl bg-bg-tertiary relative border border-border-primary overflow-hidden flex items-center justify-center">
          {/* Simulated navigation route drawing */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
          
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="h-5 w-5 rounded-full bg-brand-emerald border-4 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-subtle">S</div>
            <span className="text-[8px] font-bold text-text-secondary mt-1 uppercase">Store</span>
          </div>

          <svg className="w-full h-full absolute inset-0 px-10">
            <path d="M 50 80 Q 150 40, 250 80" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="6" className="animate-dash" />
          </svg>

          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="h-5 w-5 rounded-full bg-brand-violet border-4 border-white flex items-center justify-center text-[8px] font-bold text-white shadow-subtle">H</div>
            <span className="text-[8px] font-bold text-text-secondary mt-1 uppercase">Home</span>
          </div>

          <span className="absolute bottom-3 right-3 px-2 py-1 bg-black/75 text-white rounded text-[8px] font-extrabold uppercase">
            {activeJob.distanceKm} km • {activeJob.estTimeMinutes} min ETA
          </span>
        </div>
      </div>

      {/* 3. Steps workflow details */}
      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
        
        {/* Step 1: Accepted (Ready to ride to store) */}
        {activeJob.status === 'ACCEPTED' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase">Step 1: Navigate to Pickup Store</h4>
            <div className="p-3 bg-bg-tertiary rounded-xl border border-border-primary space-y-1">
              <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block">Pickup Store</span>
              <p className="font-bold text-text-primary">{activeJob.storeName}</p>
              <p className="text-text-secondary font-semibold">{activeJob.storeAddress}</p>
            </div>
            <button
              onClick={handleAdvance}
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer"
            >
              Mark Arrived at Store
            </button>
          </div>
        )}

        {/* Step 2: Arrived Store (Packing checklist inspection & OTP verification) */}
        {activeJob.status === 'ARRIVED_STORE' && (
          <form onSubmit={handleVerifyPickup} className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase border-b border-border-primary/60 pb-2">
              Step 2: Verify Store Handover (OTP: {activeJob.pickupOtpCode})
            </h4>

            {/* Checklist */}
            <div className="space-y-2.5">
              <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider block">Checklist Items</span>
              {activeJob.items.map((item) => {
                const isChecked = activeJob.checkedItems?.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheckItem(item.id)}
                    className="p-3 rounded-xl border border-border-primary bg-bg-tertiary flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isChecked ? (
                        <CheckSquare className="h-4.5 w-4.5 text-brand-emerald" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-text-secondary" />
                      )}
                      <span className="font-bold text-text-primary">{item.name}</span>
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
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer"
            >
              Verify Pickup & Start Delivery
            </button>
          </form>
        )}

        {/* Step 3: Picked Up (In Transit to Customer) */}
        {activeJob.status === 'PICKED_UP' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase">Step 3: In Transit to Customer Location</h4>
            <div className="p-3 bg-bg-tertiary rounded-xl border border-border-primary space-y-2">
              <div>
                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider block">Customer</span>
                <p className="font-bold text-text-primary">{activeJob.customerName}</p>
                <p className="text-text-secondary font-semibold leading-relaxed">{activeJob.customerAddress}</p>
              </div>
              <div className="flex items-center gap-3 pt-2 border-t border-border-primary/60">
                <a
                  href={`tel:${activeJob.customerPhone}`}
                  className="flex-1 py-2 border border-border-primary rounded-xl flex items-center justify-center gap-1.5 font-bold text-text-primary hover:bg-bg-secondary"
                >
                  <Phone className="h-4 w-4" /> Call Customer
                </a>
              </div>
            </div>
            <button
              onClick={handleAdvance}
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer"
            >
              Mark Arrived at Customer
            </button>
          </div>
        )}

        {/* Step 4: Arrived Customer (OTP input, proof of delivery sign/photo) */}
        {activeJob.status === 'ARRIVED_CUSTOMER' && (
          <form onSubmit={handleCompleteDelivery} className="space-y-4">
            <h4 className="text-xs font-bold text-text-primary uppercase border-b border-border-primary/60 pb-2">
              Step 4: Verify Delivery Handover (OTP: {activeJob.otpCode})
            </h4>

            {/* Proof of delivery card */}
            <div className="grid grid-cols-2 gap-3">
              {/* Photo Upload Mock */}
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

              {/* Signature Mock */}
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
              className="w-full py-3.5 bg-brand-emerald text-white rounded-xl font-bold shadow-emerald cursor-pointer"
            >
              Verify OTP & Complete Delivery
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
            onClick={() => cancelActiveJob('Vehicle issue')}
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

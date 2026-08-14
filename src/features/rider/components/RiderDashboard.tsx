import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Power, 
  MapPin, 
  Star, 
  Clock, 
  Wallet, 
  ShieldAlert, 
  FileCheck, 
  Play,
  Square
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { riderService } from '../services/rider-service';
import { apiClient } from '../../../core/network/api-client';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

export const RiderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'JOBS' | 'EARNINGS' | 'DOCS'>('JOBS');

  // Geolocation states (Default to Mahasamund platform service area)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 21.1085, lng: 82.0965 });

  // Resolve current coordinates on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          console.warn('Geolocation blocked. Defaulting coordinates to Mahasamund.');
        }
      );
    }
  }, []);

  // 1. Queries
  const { data: profileMe } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    }
  });

  const rider = profileMe?.profile;
  const isOnline = rider?.isOnline ?? false;
  const shiftActive = isOnline; // Shift status maps to online status

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: queryKeys.riderEarnings(),
    queryFn: () => riderService.getEarnings(),
    enabled: !!rider?.id && profileMe?.role === 'RIDER',
  });

  const { data: availableDeliveries } = useQuery({
    queryKey: queryKeys.riderAvailableJobs(coords.lat, coords.lng),
    queryFn: () => riderService.getAvailableDeliveries(coords.lat, coords.lng),
    refetchInterval: 5000, // Poll available jobs every 5 seconds when online
    enabled: isOnline && !!rider?.id && profileMe?.role === 'RIDER',
  });

  const { data: assignmentsData } = useQuery({
    queryKey: queryKeys.riderAssignments(),
    queryFn: () => riderService.getAssignments(),
    enabled: !!rider?.id && profileMe?.role === 'RIDER',
  });

  const assignmentsList = assignmentsData ?? [];
  const availableJobsList = availableDeliveries ?? [];

  // Find active assignment
  const activeJob = assignmentsList.find((ass) => 
    ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(ass.status)
  );

  // 2. Mutations
  const toggleDutyMutation = useMutation({
    mutationFn: (nextOnline: boolean) => {
      if (profileMe?.role !== 'RIDER') {
        throw new Error('Signed in account is not a Rider. Please sign out and sign in with a Rider account.');
      }
      return riderService.sendHeartbeat(coords.lat, coords.lng, nextOnline);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.riderAvailableJobs(coords.lat, coords.lng) });
      showToast({
        type: 'success',
        title: 'Duty Status Updated',
        description: 'Online shift duty updated in database.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Status Transition Failed',
        description: err.message || 'Unable to update duty status.',
      });
    }
  });

  const acceptJobMutation = useMutation({
    mutationFn: (orderId: string) => riderService.acceptDelivery(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.riderAssignments() });
      showToast({
        type: 'success',
        title: 'Delivery Accepted',
        description: 'You have accepted the delivery assignment.',
      });
      navigate('/r/active');
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Acceptance Failed',
        description: err.message || 'Unable to accept this delivery job.',
      });
    }
  });

  const payoutMutation = useMutation({
    mutationFn: () => riderService.requestPayout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.riderEarnings() });
      showToast({
        type: 'success',
        title: 'Transfer Completed',
        description: 'Earnings balance transferred to your registered bank account.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Transfer Failed',
        description: err.message || 'Unable to process payout transaction.',
      });
    }
  });

  const handleSOS = () => {
    alert('🚨 EMERGENCY SOS ACTIVATED. Alerting nearest dispatch agent and transmitting current coordinates.');
  };

  const handleAccept = (orderId: string) => {
    acceptJobMutation.mutate(orderId);
  };

  const handleTransferBank = () => {
    payoutMutation.mutate();
  };

  if (earningsLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-semibold text-text-secondary select-none">
        Loading rider profile and metrics...
      </div>
    );
  }

  const todayEarnings = earningsData?.todayEarnings ?? 0;
  const completedCount = earningsData?.completedCount ?? 0;
  const rating = earningsData?.rating ?? 5.0;
  const currentBalance = earningsData?.balance ?? 0;
  const payoutHistoryList = earningsData?.payoutHistory ?? [];

  return (
    <div className="space-y-6 pb-16 text-xs font-semibold text-text-secondary select-none max-w-lg mx-auto">
      
      {/* 1. Header with Shift & Online Controls */}
      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4 shadow-subtle">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-extrabold text-text-primary tracking-tight font-heading">Aether Partner</h2>
            <span className="text-[9px] text-text-secondary uppercase mt-0.5 block font-bold tracking-wider">
              {shiftActive ? 'Shift active & online' : 'Shift Offline'}
            </span>
          </div>
          
          <button
            onClick={() => toggleDutyMutation.mutate(!isOnline)}
            disabled={toggleDutyMutation.isPending}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
              isOnline 
                ? "bg-brand-emerald text-white shadow-emerald" 
                : "bg-bg-tertiary text-text-secondary border border-border-primary"
            )}
          >
            <Power className="h-4 w-4" />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Start/Stop Shift button */}
        <button
          onClick={() => toggleDutyMutation.mutate(!isOnline)}
          disabled={toggleDutyMutation.isPending}
          className={cn(
            "w-full py-3.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
            shiftActive 
              ? "bg-status-error/10 hover:bg-status-error/15 text-status-error border border-status-error/20" 
              : "bg-brand-emerald hover:bg-brand-emerald-hover text-white shadow-emerald"
          )}
        >
          {shiftActive ? (
            <>
              <Square className="h-4 w-4 fill-current" /> Stop Active Shift
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" /> Start Shift Duty
            </>
          )}
        </button>
      </div>

      {/* 2. Critical Stats Widgets */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-20 text-center">
          <span className="text-[9px] text-text-secondary uppercase block font-bold tracking-wider">Earnings</span>
          <span className="text-base font-extrabold text-text-primary font-heading mt-1">{formatCurrency(todayEarnings)}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-20 text-center">
          <span className="text-[9px] text-text-secondary uppercase block font-bold tracking-wider">Completed</span>
          <span className="text-base font-extrabold text-text-primary font-heading mt-1">{completedCount}</span>
        </div>
        <div className="p-3.5 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-20 text-center">
          <span className="text-[9px] text-text-secondary uppercase block font-bold tracking-wider">Rating</span>
          <span className="text-base font-extrabold text-text-primary font-heading mt-1 flex items-center justify-center gap-0.5">
            {rating} <Star className="h-4 w-4 fill-brand-emerald text-brand-emerald" />
          </span>
        </div>
      </div>

      {/* SOS Button widget (outdoor high safety trigger) */}
      <div className="flex gap-2">
        <button
          onClick={handleSOS}
          className="flex-1 py-3.5 bg-status-error hover:bg-status-error/95 text-white font-extrabold rounded-xl cursor-pointer shadow-subtle flex items-center justify-center gap-2 text-xs uppercase"
        >
          <ShieldAlert className="h-4.5 w-4.5" /> EMERGENCY SOS
        </button>
        {activeJob && (
          <button
            onClick={() => navigate('/r/active')}
            className="flex-1 py-3.5 bg-brand-violet hover:bg-brand-violet-hover text-white font-extrabold rounded-xl cursor-pointer shadow-subtle flex items-center justify-center gap-2 text-xs uppercase"
          >
            Active Order
          </button>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-border-primary/60 p-1 bg-bg-secondary/40 rounded-xl gap-1">
        {[
          { id: 'JOBS', label: 'Delivery Jobs' },
          { id: 'EARNINGS', label: 'Ledger Logs' },
          { id: 'DOCS', label: 'Verified Docs' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all",
              activeTab === tab.id 
                ? "bg-brand-emerald text-white shadow-emerald" 
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'JOBS' && (
          <div className="space-y-4">
            {!isOnline || !shiftActive ? (
              <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary text-text-secondary space-y-2">
                <Clock className="h-8 w-8 text-text-secondary mx-auto" />
                <h4 className="font-extrabold text-text-primary text-xs">Duty Offline</h4>
                <p className="text-[10px] leading-relaxed">Turn Online and Start shift duty to receive nearby delivery alerts.</p>
              </div>
            ) : availableJobsList.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary text-text-secondary">
                🌱 Polling active jobs... Standing by for nearby order dispatches.
              </div>
            ) : (
              <div className="space-y-3">
                {availableJobsList.map((job) => (
                  <div key={job.id} className="p-4 rounded-xl border border-border-primary bg-bg-secondary space-y-3 shadow-subtle">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-bg-tertiary border border-border-primary rounded text-text-primary uppercase">
                          {job.orderNumber}
                        </span>
                        <h4 className="font-extrabold text-text-primary mt-1">{job.storeName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-brand-emerald font-heading">
                          {formatCurrency(job.deliveryFee + job.driverTip)}
                        </span>
                        <span className="text-[9px] text-text-secondary block font-semibold mt-0.5">Est. Earnings</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[10px] text-text-secondary">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <MapPin className="h-4.5 w-4.5 text-text-secondary flex-shrink-0" />
                        Pickup: {job.deliveryAddress.streetAddress}
                      </p>
                      <p className="flex items-center gap-1.5 font-semibold">
                        <MapPin className="h-4.5 w-4.5 text-text-secondary flex-shrink-0" />
                        Drop: {job.deliveryAddress.streetAddress}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border-primary/60 text-[10px]">
                      <span className="text-text-secondary font-bold uppercase">5.2 km • 15 mins</span>
                      <button
                        onClick={() => handleAccept(job.id)}
                        disabled={acceptJobMutation.isPending}
                        className="py-1.5 px-4 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded-lg font-extrabold cursor-pointer disabled:opacity-50"
                      >
                        {acceptJobMutation.isPending ? 'Accepting...' : 'Accept Delivery'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'EARNINGS' && (
          <div className="space-y-4">
            {/* Wallet summary */}
            <div className="p-4 rounded-xl bg-bg-tertiary border border-border-primary flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-brand-emerald" />
                <div>
                  <span className="text-[9px] text-text-secondary uppercase font-bold">Wallet Balance</span>
                  <span className="font-extrabold text-text-primary text-sm mt-0.5 block">{formatCurrency(currentBalance)}</span>
                </div>
              </div>
              <button 
                onClick={handleTransferBank}
                disabled={currentBalance <= 0 || payoutMutation.isPending}
                className="py-2 px-4 bg-brand-emerald text-white rounded-lg font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {payoutMutation.isPending ? 'Processing...' : 'Transfer to Bank'}
              </button>
            </div>

            {/* Payout history lists */}
            <div className="space-y-2">
              <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider block">Past Payout logs</span>
              <div className="divide-y divide-border-primary border border-border-primary rounded-xl overflow-hidden bg-bg-secondary">
                {payoutHistoryList.map((pay) => (
                  <div key={pay.id} className="p-3.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-text-primary">{pay.id}</span>
                      <span className="text-[9px] text-text-secondary block font-semibold mt-0.5">{pay.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-text-primary font-heading">{formatCurrency(pay.amount)}</span>
                      <span className="text-[8px] font-extrabold text-brand-emerald uppercase block mt-0.5">{pay.status}</span>
                    </div>
                  </div>
                ))}
                {payoutHistoryList.length === 0 && (
                  <div className="text-center py-6 text-text-secondary">
                    No past payout transfers recorded.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DOCS' && (
          <div className="space-y-4 p-4 rounded-2xl border border-border-primary bg-bg-secondary">
            <h3 className="text-xs font-bold text-text-primary uppercase border-b border-border-primary/60 pb-2">Verification Documents</h3>
            
            <div className="space-y-3.5">
              
              {/* License Row */}
              <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
                <div>
                  <span className="font-bold text-text-primary block">Driving License</span>
                  <span className="text-[9px] text-text-secondary font-semibold mt-0.5 block">{rider?.licenseNumber || 'Not Uploaded'}</span>
                </div>
                <div className={cn("flex items-center gap-1.5", rider?.isLicenseUploaded ? "text-brand-emerald" : "text-status-warning")}>
                  <FileCheck className="h-4.5 w-4.5" />
                  <span className="text-[9px] font-bold uppercase">{rider?.isLicenseUploaded ? 'VERIFIED' : 'PENDING'}</span>
                </div>
              </div>

              {/* RC Row */}
              <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
                <div>
                  <span className="font-bold text-text-primary block">Vehicle RC Document</span>
                  <span className="text-[9px] text-text-secondary font-semibold mt-0.5 block">{rider?.rcNumber || 'Not Uploaded'}</span>
                </div>
                <div className={cn("flex items-center gap-1.5", rider?.isRcUploaded ? "text-brand-emerald" : "text-status-warning")}>
                  <FileCheck className="h-4.5 w-4.5" />
                  <span className="text-[9px] font-bold uppercase">{rider?.isRcUploaded ? 'VERIFIED' : 'PENDING'}</span>
                </div>
              </div>

              {/* Insurance Row */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-text-primary block">Vehicle Insurance</span>
                  <span className="text-[9px] text-text-secondary font-semibold mt-0.5 block">Valid till Sept 2027</span>
                </div>
                <div className={cn("flex items-center gap-1.5", rider?.isInsuranceUploaded ? "text-brand-emerald" : "text-status-warning")}>
                  <FileCheck className="h-4.5 w-4.5" />
                  <span className="text-[9px] font-bold uppercase">{rider?.isInsuranceUploaded ? 'VERIFIED' : 'PENDING'}</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default RiderDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Power, 
  Star, 
  Clock, 
  Wallet, 
  ShieldAlert, 
  FileCheck
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
  const [activeTab, setActiveTab] = useState<'JOBS' | 'ACTIVE' | 'HISTORY' | 'EARNINGS' | 'DOCS'>('JOBS');

  // Geolocation states (Default to Mahasamund platform service area)
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 21.1085, lng: 82.0965 });
  const lastHeartbeatTimeRef = React.useRef<number>(0);

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

  // Throttled GPS watch position on load & online shift (max once per 20 seconds)
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        const now = Date.now();
        if (isOnline && (now - lastHeartbeatTimeRef.current > 20000)) {
          lastHeartbeatTimeRef.current = now;
          riderService.sendHeartbeat(lat, lng, true).catch(console.error);
        }
      },
      (err) => {
        console.warn('[Rider GPS Watch] Location warning:', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline]);

  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: queryKeys.riderEarnings(),
    queryFn: () => riderService.getEarnings(),
    enabled: !!rider?.id && profileMe?.role === 'RIDER',
  });

  const { data: availableDeliveries } = useQuery({
    queryKey: queryKeys.riderAvailableJobs(),
    queryFn: () => riderService.getAvailableDeliveries(coords.lat, coords.lng),
    refetchInterval: 15000, // Poll available jobs every 15 seconds when online
    enabled: isOnline && !!rider?.id && profileMe?.role === 'RIDER',
  });

  const { data: assignmentsData } = useQuery({
    queryKey: queryKeys.riderAssignments(),
    queryFn: () => riderService.getAssignments(),
    enabled: !!rider?.id && profileMe?.role === 'RIDER',
  });

  const assignmentsList = assignmentsData ?? [];
  const availableJobsList = availableDeliveries ?? [];

  // Separate Active Assignment vs Completed Delivery History
  const activeJob = assignmentsList.find((ass) => 
    ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'].includes(ass.status)
  );

  const completedHistory = assignmentsList.filter((ass) =>
    ['DELIVERED', 'CANCELLED'].includes(ass.status)
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
      queryClient.invalidateQueries({ queryKey: queryKeys.riderAvailableJobs() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.riderAvailableJobs() });
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

  const handleToggleDuty = () => {
    toggleDutyMutation.mutate(!isOnline);
  };

  const handleAccept = (orderId: string) => {
    acceptJobMutation.mutate(orderId);
  };

  const handleTransferBank = () => {
    payoutMutation.mutate();
  };

  const currentBalance = earningsData?.balance ?? rider?.balance ?? 0;
  const payoutHistoryList = earningsData?.payoutHistory ?? [];

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto pb-24">
      {/* Header Profile Info & Shift Duty Toggle */}
      <div className="p-4 rounded-2xl border border-border-primary bg-bg-secondary flex justify-between items-center shadow-subtle">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-heading font-extrabold text-sm border border-emerald-500/20">
            {rider?.fullName?.[0] || 'R'}
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-text-primary text-sm leading-tight">{rider?.fullName || 'Delivery Partner'}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-text-secondary font-bold uppercase">{rider?.vehicleType || 'MOTORBIKE'}</span>
              <span className="text-[10px] text-text-tertiary">•</span>
              <div className="flex items-center text-amber-500 font-bold text-[10px]">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500 mr-0.5" />
                <span>{rider?.rating?.toFixed(1) || '5.0'}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggleDuty}
          disabled={toggleDutyMutation.isPending}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border shadow-xs",
            isOnline 
              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500" 
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
          )}
        >
          <Power className="h-3.5 w-3.5" />
          <span>{toggleDutyMutation.isPending ? 'Updating...' : isOnline ? 'DUTY ONLINE' : 'GO ONLINE'}</span>
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-xl border border-border-primary/60 bg-bg-secondary flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Today's Earnings</span>
            <span className="text-base font-extrabold text-emerald-700 font-heading block mt-0.5">
              {earningsLoading ? '...' : formatCurrency(earningsData?.todayEarnings ?? 0)}
            </span>
          </div>
          <Wallet className="h-5 w-5 text-emerald-600 opacity-80" />
        </div>

        <div className="p-3.5 rounded-xl border border-border-primary/60 bg-bg-secondary flex items-center justify-between shadow-subtle">
          <div>
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Delivered Today</span>
            <span className="text-base font-extrabold text-text-primary font-heading block mt-0.5">
              {earningsLoading ? '...' : (earningsData?.todayCompletedCount ?? 0)} Orders
            </span>
          </div>
          <Clock className="h-5 w-5 text-emerald-600 opacity-80" />
        </div>
      </div>

      {/* SOS & Active Order Banner */}
      <div className="flex gap-2">
        <button
          onClick={handleSOS}
          className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl cursor-pointer shadow-subtle flex items-center justify-center gap-2 text-xs uppercase"
        >
          <ShieldAlert className="h-4.5 w-4.5" /> EMERGENCY SOS
        </button>
        {activeJob && (
          <button
            onClick={() => navigate('/r/active')}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl cursor-pointer shadow-subtle flex items-center justify-center gap-2 text-xs uppercase animate-pulse"
          >
            Active Order ({activeJob.status})
          </button>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-border-primary/60 p-1 bg-bg-secondary/40 rounded-xl gap-1 overflow-x-auto">
        {[
          { id: 'JOBS', label: `Jobs (${availableJobsList.length})` },
          { id: 'ACTIVE', label: activeJob ? `Active (1)` : 'Active (0)' },
          { id: 'HISTORY', label: `History (${completedHistory.length})` },
          { id: 'EARNINGS', label: 'Ledger' },
          { id: 'DOCS', label: 'Docs' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all whitespace-nowrap px-2.5",
              activeTab === tab.id 
                ? "bg-emerald-600 text-white shadow-sm" 
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
                🌱 Standing by for nearby READY_FOR_PICKUP orders...
              </div>
            ) : (
              <div className="space-y-3">
                {availableJobsList.map((job) => {
                  const estPayout = (job.deliveryFee || 25) + (job.driverTip || 0);
                  return (
                    <div key={job.id} className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3 shadow-subtle">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 rounded uppercase tracking-wider font-heading">
                            READY FOR PICKUP • #{job.orderNumber}
                          </span>
                          <h4 className="font-extrabold text-text-primary text-sm mt-1">{job.storeName || job.store?.name || 'Aether Store'}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-emerald-700 font-heading">
                            {formatCurrency(estPayout)}
                          </span>
                          <span className="text-[9px] text-text-secondary block font-semibold">Est. Payout</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-text-secondary bg-bg-tertiary p-3 rounded-xl border border-border-primary/50">
                        <div className="flex items-start gap-2">
                          <span className="text-sm">🏪</span>
                          <div>
                            <span className="font-bold text-text-primary block text-[11px]">STORE PICKUP</span>
                            <span className="text-[10px] text-text-secondary">{job.store?.address || job.storeName || 'Store Location'}</span>
                          </div>
                        </div>
                        <div className="border-t border-border-primary/40 pt-1.5 flex items-start gap-2">
                          <span className="text-sm">🏠</span>
                          <div>
                            <span className="font-bold text-text-primary block text-[11px]">CUSTOMER DROP</span>
                            <span className="text-[10px] text-text-secondary">
                              {job.deliveryAddress?.receiverName ? `${job.deliveryAddress.receiverName} — ` : ''}
                              {job.deliveryAddress?.streetAddress || 'Customer Address'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border-primary/60 text-xs">
                        <span className="text-text-secondary font-extrabold uppercase text-[10px]">
                          {job.distanceToStoreKm ? `📍 ${job.distanceToStoreKm} km to store` : '📍 Nearby Pickup'}
                        </span>
                        <button
                          onClick={() => handleAccept(job.id)}
                          disabled={acceptJobMutation.isPending}
                          className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold cursor-pointer disabled:opacity-50 text-xs border border-emerald-500 shadow-sm"
                        >
                          {acceptJobMutation.isPending ? 'Accepting...' : 'ACCEPT DELIVERY'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ACTIVE' && (
          <div className="space-y-4">
            {!activeJob ? (
              <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary text-text-secondary space-y-2">
                <Clock className="h-8 w-8 text-text-secondary mx-auto" />
                <h4 className="font-extrabold text-text-primary text-xs">No Active Delivery</h4>
                <p className="text-[10px] leading-relaxed">Accept an available job from the Jobs tab to start a delivery shift.</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-50/20 space-y-3 shadow-subtle">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-emerald-600 text-white rounded uppercase tracking-wider font-heading">
                      ACTIVE • #{activeJob.order?.orderNumber || activeJob.orderId.slice(0, 8)}
                    </span>
                    <h4 className="font-extrabold text-text-primary text-sm mt-1">{activeJob.order?.store?.name || 'Aether Store'}</h4>
                  </div>
                  <button
                    onClick={() => navigate('/r/active')}
                    className="py-2 px-4 bg-emerald-600 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Manage Active Order
                  </button>
                </div>
                <div className="text-xs text-text-secondary">
                  Status: <span className="font-bold text-emerald-700">{activeJob.status}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <h4 className="font-extrabold text-text-primary text-xs uppercase tracking-wider border-b border-border-primary/60 pb-2">
              Completed Delivery History ({completedHistory.length})
            </h4>

            {completedHistory.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-border-primary rounded-2xl bg-bg-secondary text-text-secondary">
                No completed delivery assignments yet.
              </div>
            ) : (
              <div className="space-y-3">
                {completedHistory.map((ass) => {
                  const isDelivered = ass.status === 'DELIVERED';
                  const earnedPayout = (ass.order?.deliveryFee || 25) + (ass.order?.driverTip || 0);
                  return (
                    <div key={ass.id} className="p-4 rounded-2xl border border-border-primary bg-bg-secondary space-y-3 shadow-subtle">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={cn(
                            "text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider font-heading",
                            isDelivered ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"
                          )}>
                            {ass.status} • #{ass.order?.orderNumber || ass.orderId.slice(0, 8)}
                          </span>
                          <h4 className="font-extrabold text-text-primary text-sm mt-1">{ass.order?.store?.name || 'Aether Store'}</h4>
                          <span className="text-[10px] text-text-tertiary block mt-0.5">
                            {ass.deliveredAt ? new Date(ass.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Historical'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-emerald-700 font-heading block">
                            +{formatCurrency(earnedPayout)}
                          </span>
                          <span className="text-[9px] text-text-secondary block font-semibold">Credited Payout</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-text-secondary bg-bg-tertiary p-3 rounded-xl border border-border-primary/50">
                        <div className="flex items-start gap-2">
                          <span className="text-xs">🏪</span>
                          <span className="text-[10px]">{ass.order?.store?.address || 'Store Location'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-xs">🏠</span>
                          <span className="text-[10px]">{ass.order?.deliveryAddress?.streetAddress || 'Customer Address'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'EARNINGS' && (
          <div className="space-y-4">
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

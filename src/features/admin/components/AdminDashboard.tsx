import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  AlertTriangle,
  Sliders,
  Play
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { adminService } from '../services/admin-service';
import { formatCurrency } from '../../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // Queries
  const { data: kpis, isLoading: isKpisLoading } = useQuery({
    queryKey: queryKeys.adminKPIs(),
    queryFn: () => adminService.getKPIs()
  });

  const { data: funnel, isLoading: isFunnelLoading } = useQuery({
    queryKey: queryKeys.adminOrderFunnel(),
    queryFn: () => adminService.getOrderFunnel()
  });

  const { data: cancellations, isLoading: isCancellationsLoading } = useQuery({
    queryKey: queryKeys.adminCancellationAnalytics(),
    queryFn: () => adminService.getCancellationAnalytics()
  });

  const { data: settingsList, isLoading: isSettingsLoading } = useQuery({
    queryKey: queryKeys.adminSettings(),
    queryFn: () => adminService.getSettings()
  });

  const { data: auditLogsRes } = useQuery({
    queryKey: queryKeys.adminAuditLogs(1),
    queryFn: () => adminService.getAuditLogs({ page: 1, limit: 10 })
  });

  const { data: categoryData } = useQuery({
    queryKey: queryKeys.adminCategoryAnalytics(),
    queryFn: () => adminService.getCategoryAnalytics()
  });

  // Local state for configuration inputs
  const [platformFee, setPlatformFee] = useState(5);
  const [kmCharge, setKmCharge] = useState(15);
  const [commRate, setCommRate] = useState(10);
  const [maintMode, setMaintMode] = useState(false);

  useEffect(() => {
    if (settingsList) {
      const getVal = (key: string, def: number | boolean) => {
        const item = settingsList.find(s => s.key === key);
        if (!item) return def;
        if (typeof def === 'boolean') return item.value === 'true';
        return parseFloat(item.value) || def;
      };
      setPlatformFee(getVal('generalPlatformFee', 5) as number);
      setKmCharge(getVal('deliveryChargePerKm', 15) as number);
      setCommRate(getVal('commissionPercentage', 10) as number);
      setMaintMode(getVal('maintenanceMode', false) as boolean);
    }
  }, [settingsList]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Array<{ key: string; value: string }>) => adminService.bulkUpdateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminSettings() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAuditLogs(1) });
      alert('Platform configurations updated successfully.');
    }
  });

  const triggerJobsMutation = useMutation({
    mutationFn: () => adminService.triggerJobs(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminAuditLogs(1) });
      alert('Background maintenance jobs executed successfully.');
    }
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate([
      { key: 'generalPlatformFee', value: String(platformFee) },
      { key: 'deliveryChargePerKm', value: String(kmCharge) },
      { key: 'commissionPercentage', value: String(commRate) },
      { key: 'maintenanceMode', value: String(maintMode) }
    ]);
  };

  const geoRouting = settingsList ? settingsList.find(s => s.key === 'geoRoutingEnabled')?.value === 'true' : true;
  const dynamicPricing = settingsList ? settingsList.find(s => s.key === 'dynamicPricingEnabled')?.value === 'true' : false;

  const handleToggleFeature = (key: string, currentVal: boolean) => {
    updateSettingsMutation.mutate([
      { key, value: String(!currentVal) }
    ]);
  };

  const handleTriggerJobs = () => {
    if (confirm('Trigger all background platform cleanup and maintenance tasks?')) {
      triggerJobsMutation.mutate();
    }
  };

  const isLoading = isKpisLoading || isFunnelLoading || isCancellationsLoading || isSettingsLoading;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="h-6 w-6 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
      </div>
    );
  }

  // Calculate completed orders from funnel data
  const completedOrdersCount = funnel?.DELIVERED || 0;

  return (
    <div className="space-y-6 pb-12 text-xs font-semibold text-text-secondary select-none">
      
      {/* 1. Statistics grids */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28 shadow-subtle">
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="h-4.5 w-4.5 text-brand-emerald" />
            Gross GMV Revenue
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {formatCurrency(kpis?.gmv || 0)}
            </span>
            <p className="text-[9px] text-brand-emerald font-bold mt-0.5 uppercase tracking-wider flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              Live Database Feed
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28 shadow-subtle">
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingBag className="h-4.5 w-4.5 text-brand-violet" />
            Completed Orders
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {completedOrdersCount}
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              {kpis?.activeOrders || 0} active deliveries
            </p>
          </div>
        </div>

        {/* Today's Sales / Commission Revenue */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28 shadow-subtle">
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-brand-emerald" />
            Platform Earnings
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {formatCurrency(kpis?.revenue || 0)}
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              Active users: {kpis?.activeUsers || 0}
            </p>
          </div>
        </div>

        {/* Active fleet cancellation rate */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28 shadow-subtle">
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-4.5 w-4.5 text-status-error" />
            Cancellation rate
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-status-error font-heading">
              {cancellations?.cancellationRate?.toFixed(1) || 0}%
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              {cancellations?.cancelledOrders || 0} total incidents
            </p>
          </div>
        </div>

      </div>

      {/* 2. Revenue chart & Live Activity feed side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Dynamic category analytics sales */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2">
            Category Sales Performance
          </h3>
          
          <div className="relative h-48 w-full flex items-end justify-between px-6 pt-6 border-b border-border-primary">
            {categoryData && categoryData.length > 0 ? (
              categoryData.map((cat: any, idx: number) => {
                const maxGmv = Math.max(...categoryData.map((c: any) => c.gmv || 1));
                const heightPercentage = ((cat.gmv || 0) / maxGmv) * 80; // scale to max 80%
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                    <div className="relative w-8 rounded-t bg-brand-emerald/10 hover:bg-brand-emerald/20 transition-all flex items-end justify-center" style={{ height: `${Math.max(10, heightPercentage)}%` }}>
                      <span className="absolute -top-6 text-[9px] font-extrabold text-brand-emerald">{formatCurrency(cat.gmv)}</span>
                      <div className="w-full h-2 rounded-t bg-brand-emerald" />
                    </div>
                    <span className="text-[8px] text-text-secondary font-bold uppercase tracking-wider truncate max-w-[60px]">{cat.name}</span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center py-12 text-text-secondary">No category analytics recorded.</div>
            )}
          </div>
        </div>

        {/* Right: Live activity feed tickers */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2 flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-brand-emerald" />
            Live Platform Audit Ticker
          </h3>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {auditLogsRes && auditLogsRes.logs && auditLogsRes.logs.length > 0 ? (
              auditLogsRes.logs.map((log: any) => (
                <div key={log.id} className="p-3 bg-bg-tertiary/40 border border-border-primary/60 rounded-xl flex justify-between items-start gap-2">
                  <p className="font-bold text-text-primary text-[10px] leading-relaxed">
                    {log.action} ({log.targetType})
                  </p>
                  <span className="text-[8px] text-text-secondary whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-text-secondary">No audit logs recorded yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Global Platform settings & Audit ledger logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: General configuration rules */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4 shadow-subtle">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2 flex items-center gap-1.5 justify-between">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-4.5 w-4.5 text-text-secondary" />
              Platform Configurations
            </span>
            <button
              onClick={handleTriggerJobs}
              className="py-1 px-3 bg-brand-violet hover:bg-brand-violet/90 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-subtle"
            >
              <Play className="h-3 w-3" />
              Run Cleanup Jobs
            </button>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="platformFee" className="text-[9px] font-bold text-text-secondary uppercase block">Platform Fee (₹)</label>
                <input 
                  id="platformFee"
                  type="number" 
                  value={platformFee} 
                  onChange={(e) => setPlatformFee(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="kmCharge" className="text-[9px] font-bold text-text-secondary uppercase block">Km Charge (₹)</label>
                <input 
                  id="kmCharge"
                  type="number" 
                  value={kmCharge} 
                  onChange={(e) => setKmCharge(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="commRate" className="text-[9px] font-bold text-text-secondary uppercase block">Commission (%)</label>
                <input 
                  id="commRate"
                  type="number" 
                  value={commRate} 
                  onChange={(e) => setCommRate(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Beta Feature Flags</span>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-text-primary block">Dynamic Geo Routing</span>
                  <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">Optimizes rider dispatches based on active cell radiuses</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={geoRouting}
                  onChange={() => handleToggleFeature('geoRoutingEnabled', geoRouting)}
                  className="h-4.5 w-4.5 accent-brand-emerald cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-text-primary block">Peak Surge Engine</span>
                  <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">Applies dynamic pricing adjustments during heavy bookings</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={dynamicPricing}
                  onChange={() => handleToggleFeature('dynamicPricingEnabled', dynamicPricing)}
                  className="h-4.5 w-4.5 accent-brand-emerald cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-primary/60">
                <div>
                  <label htmlFor="maintMode" className="font-bold text-text-primary block cursor-pointer">Maintenance Mode</label>
                  <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">Toggling pauses all checkout operations globally</span>
                </div>
                <input 
                  id="maintMode"
                  type="checkbox" 
                  checked={maintMode}
                  onChange={(e) => setMaintMode(e.target.checked)}
                  className="h-4.5 w-4.5 accent-status-error cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="py-2.5 px-6 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded-xl font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              Save Configuration
            </button>
          </form>
        </div>

        {/* Right: Security audit log logs table */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4 shadow-subtle">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2 flex items-center gap-1.5">
            <ShieldCheck className="h-4.5 w-4.5 text-brand-emerald" />
            Audit Ledger Logs
          </h3>

          <div className="divide-y divide-border-primary border border-border-primary rounded-xl overflow-hidden bg-bg-tertiary/40 max-h-72 overflow-y-auto">
            {auditLogsRes && auditLogsRes.logs && auditLogsRes.logs.length > 0 ? (
              auditLogsRes.logs.map((log: any) => (
                <div key={log.id} className="p-3.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-text-primary block">{log.action}</span>
                    <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">
                      Target: {log.targetType} ({log.targetId || 'N/A'}) • {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[8px] font-extrabold text-brand-emerald uppercase whitespace-nowrap bg-brand-emerald/5 px-2 py-0.5 border border-brand-emerald/10 rounded">
                    {log.user?.email || 'System'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-text-secondary">No audit ledger logs found.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;

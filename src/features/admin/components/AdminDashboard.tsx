import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  ShieldCheck, 
  Activity, 
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { useAdminStore } from '../store/admin-store';
import { formatCurrency } from '../../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const { metrics, settings, auditLogs, updateSettings, toggleFeatureFlag } = useAdminStore();
  
  // Settings edit states
  const [platformFee, setPlatformFee] = useState(settings.generalPlatformFee);
  const [kmCharge, setKmCharge] = useState(settings.deliveryChargePerKm);
  const [commRate, setCommRate] = useState(settings.commissionPercentage);
  const [maintMode, setMaintMode] = useState(settings.maintenanceMode);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      generalPlatformFee: platformFee,
      deliveryChargePerKm: kmCharge,
      commissionPercentage: commRate,
      maintenanceMode: maintMode
    });
    alert('Global platform parameters updated successfully.');
  };

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
              {formatCurrency(metrics.totalRevenue)}
            </span>
            <p className="text-[9px] text-brand-emerald font-bold mt-0.5 uppercase tracking-wider flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              +22% this month
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
              {metrics.completedOrders}
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              {metrics.activeOrders} active deliveries
            </p>
          </div>
        </div>

        {/* Today's Sales */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28 shadow-subtle">
          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-brand-emerald" />
            Today's Bookings
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {formatCurrency(metrics.todayRevenue)}
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              Avg basket size: ₹245
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
              {((metrics.cancelledOrders / metrics.totalOrders) * 100).toFixed(1)}%
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              {metrics.cancelledOrders} total incidents
            </p>
          </div>
        </div>

      </div>

      {/* 2. Revenue chart & Live Activity feed side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Interactive sales curves */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2">
            Weekly Booking Curves
          </h3>
          
          <div className="relative h-48 w-full flex items-end justify-between px-6 pt-6 border-b border-border-primary">
            {[
              { label: 'Mon', val: 40 },
              { label: 'Tue', val: 55 },
              { label: 'Wed', val: 48 },
              { label: 'Thu', val: 75 },
              { label: 'Fri', val: 90 },
              { label: 'Sat', val: 110 },
              { label: 'Sun', val: 95 }
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                <div className="relative w-8 rounded-t bg-brand-emerald/10 hover:bg-brand-emerald/20 transition-all flex items-end justify-center" style={{ height: `${bar.val * 0.4}%` }}>
                  <span className="absolute -top-6 text-[9px] font-extrabold text-brand-emerald">₹{bar.val * 100}</span>
                  <div className="w-full h-2 rounded-t bg-brand-emerald" />
                </div>
                <span className="text-[8px] text-text-secondary font-bold uppercase tracking-wider">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Live activity feed tickers */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2 flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-brand-emerald" />
            Live Dispatch Feed
          </h3>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {[
              { id: '1', time: '1 min ago', desc: 'Ramesh Kumar checked out ORD-998231' },
              { id: '2', time: '3 mins ago', desc: 'Karthik Raja accepted delivery JOB-5011' },
              { id: '3', time: '8 mins ago', desc: 'Apollo Pharma packed order ORD-761234' },
              { id: '4', time: '12 mins ago', desc: 'Rider assigned to customer Sneha Patel' }
            ].map((act) => (
              <div key={act.id} className="p-3 bg-bg-tertiary/40 border border-border-primary/60 rounded-xl flex justify-between items-start gap-2">
                <p className="font-bold text-text-primary text-[10px] leading-relaxed">{act.desc}</p>
                <span className="text-[8px] text-text-secondary whitespace-nowrap">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Global Platform settings & Audit ledger logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: General configuration rules */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4 shadow-subtle">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary/60 pb-2 flex items-center gap-1.5">
            <Sliders className="h-4.5 w-4.5 text-text-secondary" />
            Platform Configurations
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
                  checked={settings.geoRoutingEnabled}
                  onChange={() => toggleFeatureFlag('geoRoutingEnabled')}
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
                  checked={settings.dynamicPricingEnabled}
                  onChange={() => toggleFeatureFlag('dynamicPricingEnabled')}
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
              className="py-2.5 px-6 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded-xl font-bold cursor-pointer transition-all"
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

          <div className="divide-y divide-border-primary border border-border-primary rounded-xl overflow-hidden bg-bg-tertiary/40">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-text-primary">{log.action}</span>
                  <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{log.timestamp}</span>
                </div>
                <span className="text-[8px] font-extrabold text-brand-emerald uppercase whitespace-nowrap bg-brand-emerald/5 px-2 py-0.5 border border-brand-emerald/10 rounded">
                  {log.adminUser}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;

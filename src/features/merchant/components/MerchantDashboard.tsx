import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Sliders,
  DollarSign as BankIcon
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { merchantService } from '../services/merchant-service';
import { apiClient } from '../../../core/network/api-client';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

export const MerchantDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeChartTab, setActiveChartTab] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  
  // Local Settings form state
  const [storeName, setStoreName] = useState('');
  const [radius, setRadius] = useState(5);
  const [minOrder, setMinOrder] = useState(0);
  const [holidayMode, setHolidayMode] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('');

  // 1. Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.merchantDashboard(),
    queryFn: () => merchantService.getDashboardStats(),
  });

  const { data: payoutHistoryData } = useQuery({
    queryKey: queryKeys.merchantPayouts(),
    queryFn: () => merchantService.getPayouts(),
  });

  const { data: profileMe } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    }
  });

  const store = profileMe?.profile?.store;
  const merchant = profileMe?.profile;

  // 2. Fetch products to get names of low/out stock alerts
  const { data: productsData } = useQuery({
    queryKey: queryKeys.merchantProducts(store?.id || ''),
    queryFn: async () => {
      const res = await apiClient.get(`/products?storeId=${store.id}`);
      return res.data.data.products;
    },
    enabled: !!store?.id,
  });

  // Sync settings form state when profile loads
  useEffect(() => {
    if (store) {
      setStoreName(store.name || '');
      setRadius(store.deliveryRadiusKm || 5);
      setMinOrder(store.minimumOrderValue || 0);
      setHolidayMode(store.isHoliday || false);
    }
    if (merchant) {
      setBankAccount(merchant.bankAccount || '');
      setBankName(merchant.bankName || '');
    }
  }, [store, merchant]);

  // 3. Settings update Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (params: Parameters<typeof merchantService.updateProfile>[0]) =>
      merchantService.updateProfile(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.merchantDashboard() });
      showToast({
        type: 'success',
        title: 'Settings Saved',
        description: 'Store configurations updated successfully.',
      });
    },
    onError: (err: any) => {
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: err.message || 'Unable to save settings.',
      });
    }
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      storeName,
      deliveryRadiusKm: radius,
      minimumOrderValue: minOrder,
      isHoliday: holidayMode,
      bankAccount,
      bankName,
    });
  };

  const payoutsList = payoutHistoryData ?? [];
  const productsList = productsData ?? [];
  const lowStockProducts = productsList.filter((p: any) => p.stock > 0 && p.stock <= 5);
  const outOfStockProducts = productsList.filter((p: any) => p.stock === 0);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const completedOrdersCount = stats?.completedOrdersCount ?? 0;
  const activeOrdersCount = stats?.activeOrdersCount ?? 0;
  const chartData = stats?.chartData ?? [
    { label: '08:00', val: 0 },
    { label: '11:00', val: 0 },
    { label: '14:00', val: 0 },
    { label: '17:00', val: 0 },
    { label: '20:00', val: 0 },
    { label: '23:00', val: 0 }
  ];

  if (statsLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-semibold text-text-secondary select-none">
        Loading merchant analytics logs...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 text-xs font-semibold text-text-secondary select-none">
      
      {/* 1. Metric summaries cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Today's Sales */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-brand-emerald" />
            Today's revenue
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {formatCurrency(totalRevenue)}
            </span>
            <p className="text-[9px] text-brand-emerald font-bold mt-0.5 uppercase tracking-wider flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" />
              +14% vs yesterday
            </p>
          </div>
        </div>

        {/* Active checkouts packing */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <ShoppingBag className="h-4 w-4 text-brand-violet" />
            Active packing
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {activeOrdersCount} Orders
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              Incoming from database
            </p>
          </div>
        </div>

        {/* Completed count */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-brand-emerald" />
            Completed items
          </span>
          <div className="mt-1">
            <span className="text-xl font-extrabold text-text-primary font-heading">
              {completedOrdersCount} checkouts
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              98.2% fulfillment rate
            </p>
          </div>
        </div>

        {/* Stock alerts warnings */}
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary flex flex-col justify-between h-28">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-status-error" />
            Low stock alerts
          </span>
          <div className="mt-1">
            <span className={cn("text-xl font-extrabold font-heading", lowStockProducts.length > 0 ? "text-status-error animate-pulse" : "text-text-primary")}>
              {lowStockProducts.length + outOfStockProducts.length} warnings
            </span>
            <p className="text-[9px] text-text-secondary font-bold mt-0.5 uppercase tracking-wider">
              {outOfStockProducts.length} items out of stock
            </p>
          </div>
        </div>

      </div>

      {/* 2. Charts and low-stock alerts side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 columns: Revenue Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <div className="flex justify-between items-center border-b border-border-primary/60 pb-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Order Volume Analytics</h3>
            <div className="flex gap-1.5">
              {['DAILY', 'WEEKLY', 'MONTHLY'].map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveChartTab(c as any)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-all",
                    activeChartTab === c 
                      ? "border-brand-emerald bg-brand-emerald/5 text-brand-emerald" 
                      : "border-border-primary text-text-secondary bg-bg-secondary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Minimalist responsive SVG Bar Chart */}
          <div className="relative h-48 w-full flex items-end justify-between px-6 pt-4 border-b border-border-primary">
            {chartData.map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                <div className="relative w-8 rounded-t bg-brand-emerald/10 hover:bg-brand-emerald/20 transition-all flex items-end justify-center" style={{ height: `${Math.max(5, bar.val * 20)}%` }}>
                  <span className="absolute -top-6 text-[9px] font-extrabold text-brand-emerald">{bar.val}</span>
                  <div className="w-full h-2 rounded-t bg-brand-emerald" />
                </div>
                <span className="text-[8px] text-text-secondary font-bold uppercase tracking-wider">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Low stock alarms alerts */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary pb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4.5 w-4.5 text-status-error" />
            Inventory Alerts
          </h3>

          <div className="space-y-3 overflow-y-auto max-h-48">
            {outOfStockProducts.map((p: any) => (
              <div key={p.id} className="p-3 bg-status-error/5 border border-status-error/10 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-text-primary">{p.name}</h4>
                  <span className="text-[9px] text-status-error font-bold uppercase">OUT OF STOCK</span>
                </div>
                <span className="text-xs font-extrabold text-text-primary">0</span>
              </div>
            ))}

            {lowStockProducts.map((p: any) => (
              <div key={p.id} className="p-3 bg-status-warning/5 border border-status-warning/10 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-text-primary">{p.name}</h4>
                  <span className="text-[9px] text-status-warning font-bold uppercase">LOW STOCK ALERT</span>
                </div>
                <span className="text-xs font-extrabold text-text-primary">{p.stock} units</span>
              </div>
            ))}

            {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                🌱 Catalog inventories look robust! No low stock alerts active.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Settings Form & Settlement Ledger breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Store settings details */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary pb-2 flex items-center gap-1.5">
            <Sliders className="h-4.5 w-4.5" />
            Store Settings Preferences
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            <div className="space-y-1">
              <label htmlFor="storeName" className="text-[10px] font-bold text-text-secondary uppercase">Storefront Name</label>
              <input 
                id="storeName"
                value={storeName} 
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2.5 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="radius" className="text-[10px] font-bold text-text-secondary uppercase">Delivery Radius (km)</label>
                <input 
                  id="radius"
                  type="number"
                  value={radius} 
                  onChange={(e) => setRadius(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="minOrder" className="text-[10px] font-bold text-text-secondary uppercase">Min Order Value (₹)</label>
                <input 
                  id="minOrder"
                  type="number"
                  value={minOrder} 
                  onChange={(e) => setMinOrder(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="bankName" className="text-[10px] font-bold text-text-secondary uppercase">Bank Name</label>
                <input 
                  id="bankName"
                  value={bankName} 
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2.5 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="bankAccount" className="text-[10px] font-bold text-text-secondary uppercase">Bank Account Number</label>
                <input 
                  id="bankAccount"
                  value={bankAccount} 
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. 501002938192"
                  className="w-full px-3 py-2.5 border border-border-primary rounded-xl bg-bg-tertiary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <label htmlFor="holidayMode" className="font-bold text-text-primary block cursor-pointer">Holiday Mode</label>
                <span className="text-[9px] text-text-secondary font-semibold">Toggling temporarily pauses store orders</span>
              </div>
              <input 
                id="holidayMode"
                type="checkbox" 
                checked={holidayMode}
                onChange={(e) => setHolidayMode(e.target.checked)}
                className="h-4.5 w-4.5 accent-brand-emerald cursor-pointer"
              />
            </div>

            <button 
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="py-2.5 px-6 bg-brand-emerald hover:bg-brand-emerald-hover text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>

        {/* Right: Settlements payouts console */}
        <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary space-y-4">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-primary pb-2 flex items-center gap-1.5">
            <BankIcon className="h-4.5 w-4.5 text-brand-emerald" />
            Payout Settled History
          </h3>

          <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-primary flex items-center justify-between text-xs">
            <div>
              <span className="text-[9px] text-text-secondary uppercase tracking-wider block font-bold">Payout account</span>
              <span className="font-bold text-text-primary mt-0.5 block">
                {bankName ? `${bankName} •••• ${bankAccount.slice(-4)}` : 'No Payout Account Connected'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-brand-emerald font-bold uppercase block">Pending Settlement</span>
              <span className="font-extrabold text-text-primary font-heading mt-0.5 block">₹0.00</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider block">Past settlements logs</span>
            
            <div className="divide-y divide-border-primary/60 border border-border-primary rounded-xl bg-bg-tertiary/40 overflow-hidden max-h-40 overflow-y-auto">
              {payoutsList.map((pay) => (
                <div key={pay.id} className="p-3.5 flex justify-between items-center text-xs">
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
              {payoutsList.length === 0 && (
                <div className="text-center py-6 text-text-secondary">
                  No past payout settlements recorded.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default MerchantDashboard;

import React from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Store as StoreIcon,
  PauseCircle,
  CheckSquare,
  Square,
  Package,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../core/network/queryKeys';
import { merchantService } from '../services/merchant-service';
import { apiClient } from '../../../core/network/api-client';
import { useToast } from '../../../hooks/useToast';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

interface SetupTask {
  id: string;
  label: string;
  isDone: boolean;
  link: string;
}

export const MerchantDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.merchantDashboard(),
    queryFn: () => merchantService.getDashboardStats(),
  });

  const { data: profileMe } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    },
  });

  const store = profileMe?.profile?.store;
  const merchant = profileMe?.profile;

  const { data: productsData } = useQuery({
    queryKey: queryKeys.merchantProducts(store?.id || ''),
    queryFn: async () => {
      const res = await apiClient.get(`/products?storeId=${store.id}`);
      return res.data.data.products;
    },
    enabled: !!store?.id,
  });

  const productsList = productsData ?? [];
  const lowStockCount = productsList.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = productsList.filter((p: any) => p.stock === 0).length;

  // Onboarding Setup Checklist Calculation
  const setupTasks: SetupTask[] = [
    { id: 'profile', label: 'Complete Store Profile', isDone: !!store?.name, link: '/merchant/profile' },
    { id: 'logo', label: 'Upload Store Logo & Banner', isDone: !!store?.logoUrl, link: '/merchant/profile' },
    { id: 'location', label: 'Set Physical Store Address', isDone: !!store?.address, link: '/merchant/profile' },
    { id: 'radius', label: 'Configure Delivery Radius', isDone: (store?.deliveryRadiusKm || 0) > 0, link: '/merchant/profile' },
    { id: 'product', label: 'Add Your First Product', isDone: productsList.length > 0, link: '/merchant/catalog' },
    { id: 'payment', label: 'Configure Bank Account / UPI', isDone: !!merchant?.bankAccount || !!store?.upiId, link: '/merchant/profile' },
    { id: 'timings', label: 'Set Operating Hours', isDone: !!store?.openingTime, link: '/merchant/profile' },
  ];

  const completedCount = setupTasks.filter((t) => t.isDone).length;
  const completionPercentage = Math.round((completedCount / setupTasks.length) * 100);

  // Store Availability Quick Toggles
  const updateStatusMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.patch('/merchant/profile', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      showToast({ type: 'success', title: 'Status Updated', description: 'Store operating mode changed.' });
    },
  });

  const chartData = stats?.chartData ?? [
    { label: 'Mon', val: 1200 },
    { label: 'Tue', val: 2400 },
    { label: 'Wed', val: 1800 },
    { label: 'Thu', val: 3100 },
    { label: 'Fri', val: 4500 },
    { label: 'Sat', val: 5200 },
    { label: 'Sun', val: 6100 },
  ];

  const maxVal = Math.max(...chartData.map((d) => d.val), 100);

  if (statsLoading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-border/40 rounded-xl w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-border/30 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Welcome back, {store?.name || 'Kirana Store'}! 👋
          </h1>
          <p className="text-xs text-text-secondary">Here is your live store performance & orders overview</p>
        </div>

        {/* Quick Availability Status Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => updateStatusMutation.mutate({ isOpen: !store?.isOpen })}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5',
              store?.isOpen
                ? 'bg-success/10 border-success/30 text-success'
                : 'bg-surface-subtle border-border text-text-secondary'
            )}
          >
            <StoreIcon className="w-4 h-4" />
            <span>{store?.isOpen ? 'Store Open' : 'Store Closed'}</span>
          </button>

          <button
            onClick={() => updateStatusMutation.mutate({ isPaused: !store?.isPaused })}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5',
              store?.isPaused
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-surface-subtle border-border text-text-secondary'
            )}
          >
            <PauseCircle className="w-4 h-4" />
            <span>{store?.isPaused ? 'Paused' : 'Active'}</span>
          </button>
        </div>
      </div>

      {/* Merchant Setup Checklist Card */}
      {completionPercentage < 100 && (
        <div className="p-5 bg-gradient-to-r from-brand-primary/10 to-accent-teal/10 border border-brand-primary/20 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary">Store Setup Checklist</h3>
              <p className="text-xs text-text-secondary">
                Complete all steps to activate instant hyperlocal delivery orders
              </p>
            </div>
            <span className="text-xs font-extrabold text-brand-primary bg-surface px-3 py-1 rounded-xl border border-brand-primary/30 shadow-xs">
              {completionPercentage}% Complete
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-surface/80 rounded-full h-2 overflow-hidden border border-border">
            <div
              className="bg-brand-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {setupTasks.map((task) => (
              <div key={task.id} className="flex items-center space-x-2 text-xs">
                {task.isDone ? (
                  <CheckSquare className="w-4 h-4 text-success shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-text-secondary shrink-0" />
                )}
                <span className={cn(task.isDone ? 'line-through text-text-secondary' : 'font-semibold text-text-primary')}>
                  {task.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-surface border border-border rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase">Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-success" />
          </div>
          <p className="text-xl font-extrabold text-text-primary">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase">Completed Orders</span>
            <CheckCircle2 className="w-4 h-4 text-brand-primary" />
          </div>
          <p className="text-xl font-extrabold text-text-primary">{stats?.completedOrdersCount ?? 0}</p>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase">Active Products</span>
            <Package className="w-4 h-4 text-accent-teal" />
          </div>
          <p className="text-xl font-extrabold text-text-primary">{productsList.length}</p>
        </div>

        <div className="p-4 bg-surface border border-border rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary uppercase">Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <p className="text-xl font-extrabold text-warning">{lowStockCount + outOfStockCount}</p>
        </div>
      </div>

      {/* Revenue Performance Graph */}
      <div className="p-5 bg-surface border border-border rounded-2xl space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Weekly Revenue Trends</h3>
            <p className="text-xs text-text-secondary">Sales performance across days</p>
          </div>
          <span className="text-xs font-bold text-success flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>+14.2% Growth</span>
          </span>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2 border-b border-border">
          {chartData.map((d, i) => {
            const heightPercent = Math.round((d.val / maxVal) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full bg-surface-subtle rounded-t-xl overflow-hidden h-32 flex items-end">
                  <div
                    className="w-full bg-brand-primary/80 group-hover:bg-brand-primary transition-all rounded-t-xl"
                    style={{ height: `${Math.max(12, heightPercent)}%` }}
                    title={`₹${d.val}`}
                  />
                </div>
                <span className="text-[10px] font-bold text-text-secondary">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

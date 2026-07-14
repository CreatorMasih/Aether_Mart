import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Store, 
  Truck, 
  Star,
  Search
} from 'lucide-react';
import { queryKeys } from '../../../core/network/queryKeys';
import { adminService } from '../services/admin-service';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

type UserSegmentTab = 'MERCHANTS' | 'RIDERS' | 'CUSTOMERS';

export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UserSegmentTab>('MERCHANTS');
  const [search, setSearch] = useState('');

  // Map tab to backend UserRole enum
  const roleFilter = activeTab === 'MERCHANTS' ? 'SHOPKEEPER' : activeTab === 'RIDERS' ? 'RIDER' : 'CUSTOMER';

  // Query users list
  const { data: usersData, isLoading } = useQuery({
    queryKey: queryKeys.adminUsers({ role: roleFilter, search }),
    queryFn: () => adminService.getUsers({
      role: roleFilter,
      search: search || undefined,
      limit: 100
    })
  });

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' }) => 
      adminService.updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const approveMerchantMutation = useMutation({
    mutationFn: (merchantId: string) => adminService.approveMerchant(merchantId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const approveRiderMutation = useMutation({
    mutationFn: (riderId: string) => adminService.approveRider(riderId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });

  const updateCommissionMutation = useMutation({
    mutationFn: ({ merchantId, rate }: { merchantId: string; rate: number }) => 
      adminService.updateMerchantCommission(merchantId, rate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      alert('Merchant commission rate updated in database successfully.');
    }
  });

  const handleToggleStatus = (userId: string, currentStatus: string, role: string) => {
    let nextStatus: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' = 'ACTIVE';
    if (role === 'CUSTOMER') {
      nextStatus = currentStatus === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
    } else {
      nextStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    }
    toggleStatusMutation.mutate({ userId, status: nextStatus });
  };

  const handleApproveMerchant = (merchantId: string) => {
    if (confirm('Approve store verification credentials?')) {
      approveMerchantMutation.mutate(merchantId);
    }
  };

  const handleApproveRider = (riderId: string) => {
    if (confirm('Approve rider KYC document credentials?')) {
      approveRiderMutation.mutate(riderId);
    }
  };

  const handleCommissionChange = (merchantId: string, value: string) => {
    const rate = parseInt(value);
    if (!isNaN(rate) && rate >= 0 && rate <= 100) {
      updateCommissionMutation.mutate({ merchantId, rate });
    }
  };

  return (
    <div className="space-y-6 pb-12 text-xs font-semibold text-text-secondary select-none">
      
      {/* 1. Navigation Tab select & Search bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-primary/60 pb-4">
        <div className="flex border border-border-primary/60 p-1.5 bg-bg-secondary/40 rounded-xl gap-1.5 w-full md:max-w-md">
          {[
            { id: 'MERCHANTS', label: 'Store Merchants', icon: Store },
            { id: 'RIDERS', label: 'Riders Fleet', icon: Truck },
            { id: 'CUSTOMERS', label: 'Customers List', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as UserSegmentTab);
                  setSearch('');
                }}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2",
                  activeTab === tab.id 
                    ? "bg-brand-emerald text-white shadow-emerald" 
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search by email, phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border-primary rounded-xl bg-bg-secondary focus:outline-none"
          />
        </div>
      </div>

      {/* 2. Tab Tables layout */}
      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary overflow-x-auto shadow-subtle min-h-[300px]">
        {isLoading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="h-6 w-6 rounded-full border-2 border-brand-emerald border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Merchant Segment */}
            {activeTab === 'MERCHANTS' && (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border-primary/60 text-text-secondary text-[9px] uppercase tracking-wider">
                    <th className="pb-3.5 pl-2">Store Profile</th>
                    <th className="pb-3.5">Owner Name</th>
                    <th className="pb-3.5">Rating</th>
                    <th className="pb-3.5">Docs Status</th>
                    <th className="pb-3.5 text-center">Commission %</th>
                    <th className="pb-3.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary/40">
                  {usersData?.users && usersData.users.length > 0 ? (
                    usersData.users.map((u: any) => {
                      const m = u.merchant;
                      if (!m) return null;
                      return (
                        <tr key={u.id} className="hover:bg-bg-tertiary/20">
                          <td className="py-4 pl-2 font-extrabold text-text-primary">
                            {m.store?.name || 'No Storefront'}
                            <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{u.id} • {u.phone || u.email}</span>
                          </td>
                          <td className="py-4 font-bold text-text-primary">{m.fullName}</td>
                          <td className="py-4">
                            <span className="flex items-center gap-1">
                              {(m.store?.rating || 0).toFixed(1)} <Star className="h-3.5 w-3.5 fill-brand-emerald text-brand-emerald" />
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "text-[8px] font-extrabold px-2 py-0.5 border rounded uppercase",
                              m.isApproved 
                                ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                                : "bg-status-warning/5 border-status-warning/20 text-status-warning"
                            )}>
                              {m.isApproved ? 'VERIFIED' : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <input 
                              type="number"
                              defaultValue={Math.round((m.store?.commissionRate || 0.10) * 100)}
                              onBlur={(e) => handleCommissionChange(m.id, e.target.value)}
                              className="w-12 text-center py-1 border border-border-primary rounded bg-bg-tertiary focus:outline-none"
                            />
                          </td>
                          <td className="py-4 text-right pr-2 space-x-2">
                            {!m.isApproved && (
                              <button
                                onClick={() => handleApproveMerchant(m.id)}
                                className="py-1 px-3 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded font-bold cursor-pointer transition-all"
                              >
                                Approve Docs
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(u.id, u.status, 'SHOPKEEPER')}
                              className={cn(
                                "py-1 px-3 rounded font-bold cursor-pointer transition-all border",
                                u.status === 'SUSPENDED' 
                                  ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                                  : "border-status-error/30 text-status-error hover:bg-status-error/5"
                              )}
                            >
                              {u.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-secondary">No merchants found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Rider Segment */}
            {activeTab === 'RIDERS' && (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border-primary/60 text-text-secondary text-[9px] uppercase tracking-wider">
                    <th className="pb-3.5 pl-2">Driver Name</th>
                    <th className="pb-3.5">KYC Verified</th>
                    <th className="pb-3.5">Rating</th>
                    <th className="pb-3.5">Vehicle Type</th>
                    <th className="pb-3.5">Earnings Wallet</th>
                    <th className="pb-3.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary/40">
                  {usersData?.users && usersData.users.length > 0 ? (
                    usersData.users.map((u: any) => {
                      const r = u.rider;
                      if (!r) return null;
                      return (
                        <tr key={u.id} className="hover:bg-bg-tertiary/20">
                          <td className="py-4 pl-2 font-extrabold text-text-primary">
                            {r.fullName}
                            <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{u.id} • {u.phone || u.email}</span>
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "text-[8px] font-extrabold px-2 py-0.5 border rounded uppercase",
                              r.isApproved 
                                ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                                : "bg-status-warning/5 border-status-warning/20 text-status-warning"
                            )}>
                              {r.isApproved ? 'VERIFIED' : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="flex items-center gap-1">
                              {(r.rating || 0).toFixed(1)} <Star className="h-3.5 w-3.5 fill-brand-emerald text-brand-emerald" />
                            </span>
                          </td>
                          <td className="py-4 text-text-primary font-bold uppercase">{r.vehicleType}</td>
                          <td className="py-4 font-heading font-extrabold text-text-primary">
                            {formatCurrency(r.balance)}
                          </td>
                          <td className="py-4 text-right pr-2 space-x-2">
                            {!r.isApproved && (
                              <button
                                onClick={() => handleApproveRider(r.id)}
                                className="py-1 px-3 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded font-bold cursor-pointer transition-all"
                              >
                                Approve KYC
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleStatus(u.id, u.status, 'RIDER')}
                              className={cn(
                                "py-1 px-3 rounded font-bold cursor-pointer transition-all border",
                                u.status === 'SUSPENDED' 
                                  ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                                  : "border-status-error/30 text-status-error hover:bg-status-error/5"
                              )}
                            >
                              {u.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-secondary">No riders found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Customer Segment */}
            {activeTab === 'CUSTOMERS' && (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-border-primary/60 text-text-secondary text-[9px] uppercase tracking-wider">
                    <th className="pb-3.5 pl-2">Customer Profile</th>
                    <th className="pb-3.5">Bookings Count</th>
                    <th className="pb-3.5">Wallet Balance</th>
                    <th className="pb-3.5">Status Check</th>
                    <th className="pb-3.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-primary/40">
                  {usersData?.users && usersData.users.length > 0 ? (
                    usersData.users.map((u: any) => {
                      const c = u.customer;
                      if (!c) return null;
                      return (
                        <tr key={u.id} className="hover:bg-bg-tertiary/20">
                          <td className="py-4 pl-2 font-extrabold text-text-primary">
                            {c.fullName || 'Unnamed Customer'}
                            <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{u.id} • {u.phone || u.email}</span>
                          </td>
                          <td className="py-4 font-bold text-text-primary">{(c.orders || []).length} orders</td>
                          <td className="py-4 font-heading font-extrabold text-text-primary">
                            {formatCurrency(c.wallet?.balance || 0)}
                          </td>
                          <td className="py-4">
                            <span className={cn(
                              "text-[8px] font-extrabold px-2 py-0.5 border rounded uppercase",
                              u.status === 'BLOCKED' 
                                ? "bg-status-error/5 border-status-error/20 text-status-error" 
                                : "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald"
                            )}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2">
                            <button
                              onClick={() => handleToggleStatus(u.id, u.status, 'CUSTOMER')}
                              className={cn(
                                "py-1 px-3 rounded font-bold cursor-pointer transition-all border",
                                u.status === 'BLOCKED' 
                                  ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                                  : "border-status-error/30 text-status-error hover:bg-status-error/5"
                              )}
                            >
                              {u.status === 'BLOCKED' ? 'Unblock Customer' : 'Block Customer'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-text-secondary">No customers found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

    </div>
  );
};

export default AdminUsers;

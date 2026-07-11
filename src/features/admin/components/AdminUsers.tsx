import React, { useState } from 'react';
import { 
  Users, 
  Store, 
  Truck, 
  Star
} from 'lucide-react';
import { useAdminStore } from '../store/admin-store';
import { formatCurrency } from '../../../utils/formatters';
import { cn } from '../../../utils/cn';

type UserSegmentTab = 'MERCHANTS' | 'RIDERS' | 'CUSTOMERS';

export const AdminUsers: React.FC = () => {
  const { 
    merchants, 
    riders, 
    customers, 
    toggleMerchantStatus, 
    approveMerchant, 
    updateMerchantCommission,
    toggleRiderStatus,
    approveRider,
    toggleCustomerStatus
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<UserSegmentTab>('MERCHANTS');

  return (
    <div className="space-y-6 pb-12 text-xs font-semibold text-text-secondary select-none">
      
      {/* 1. Navigation Tab select */}
      <div className="flex border-b border-border-primary/60 p-1.5 bg-bg-secondary/40 rounded-xl gap-1.5 max-w-md">
        {[
          { id: 'MERCHANTS', label: 'Store Merchants', icon: Store },
          { id: 'RIDERS', label: 'Riders Fleet', icon: Truck },
          { id: 'CUSTOMERS', label: 'Customers List', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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

      {/* 2. Tab Tables layout */}
      <div className="p-5 rounded-2xl border border-border-primary bg-bg-secondary overflow-x-auto shadow-subtle">
        
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
              {merchants.map((m) => (
                <tr key={m.id} className="hover:bg-bg-tertiary/20">
                  <td className="py-4 pl-2 font-extrabold text-text-primary">
                    {m.storeName}
                    <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{m.id} • {m.phone}</span>
                  </td>
                  <td className="py-4 font-bold text-text-primary">{m.ownerName}</td>
                  <td className="py-4">
                    <span className="flex items-center gap-1">
                      {m.rating} <Star className="h-3.5 w-3.5 fill-brand-emerald text-brand-emerald" />
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "text-[8px] font-extrabold px-2 py-0.5 border rounded uppercase",
                      m.docStatus === 'VERIFIED' 
                        ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                        : "bg-status-warning/5 border-status-warning/20 text-status-warning"
                    )}>
                      {m.docStatus}
                    </span>
                  </td>
                  <td className="py-4 text-center">
                    <input 
                      type="number"
                      value={m.commissionRate}
                      onChange={(e) => updateMerchantCommission(m.id, parseInt(e.target.value))}
                      className="w-12 text-center py-1 border border-border-primary rounded bg-bg-tertiary focus:outline-none"
                    />
                  </td>
                  <td className="py-4 text-right pr-2 space-x-2">
                    {m.docStatus === 'PENDING' && (
                      <button
                        onClick={() => approveMerchant(m.id)}
                        className="py-1 px-3 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded font-bold cursor-pointer transition-all"
                      >
                        Approve Docs
                      </button>
                    )}
                    <button
                      onClick={() => toggleMerchantStatus(m.id)}
                      className={cn(
                        "py-1 px-3 rounded font-bold cursor-pointer transition-all border",
                        m.isSuspended 
                          ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                          : "border-status-error/30 text-status-error hover:bg-status-error/5"
                      )}
                    >
                      {m.isSuspended ? 'Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
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
                <th className="pb-3.5">Earnings Wallet</th>
                <th className="pb-3.5 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary/40">
              {riders.map((r) => (
                <tr key={r.id} className="hover:bg-bg-tertiary/20">
                  <td className="py-4 pl-2 font-extrabold text-text-primary">
                    {r.name}
                    <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{r.id} • {r.phone}</span>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "text-[8px] font-extrabold px-2 py-0.5 border rounded uppercase",
                      r.docStatus === 'VERIFIED' 
                        ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                        : "bg-status-warning/5 border-status-warning/20 text-status-warning"
                    )}>
                      {r.docStatus}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="flex items-center gap-1">
                      {r.rating} <Star className="h-3.5 w-3.5 fill-brand-emerald text-brand-emerald" />
                    </span>
                  </td>
                  <td className="py-4 font-heading font-extrabold text-text-primary">
                    {formatCurrency(r.earnings)}
                  </td>
                  <td className="py-4 text-right pr-2 space-x-2">
                    {r.docStatus === 'PENDING' && (
                      <button
                        onClick={() => approveRider(r.id)}
                        className="py-1 px-3 bg-brand-emerald hover:bg-brand-emerald-hover text-white rounded font-bold cursor-pointer transition-all"
                      >
                        Approve KYC
                      </button>
                    )}
                    <button
                      onClick={() => toggleRiderStatus(r.id)}
                      className={cn(
                        "py-1 px-3 rounded font-bold cursor-pointer transition-all border",
                        r.isSuspended 
                          ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                          : "border-status-error/30 text-status-error hover:bg-status-error/5"
                      )}
                    >
                      {r.isSuspended ? 'Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
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
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-bg-tertiary/20">
                  <td className="py-4 pl-2 font-extrabold text-text-primary">
                    {c.name}
                    <span className="text-[8px] text-text-secondary block font-semibold mt-0.5">{c.id} • {c.phone}</span>
                  </td>
                  <td className="py-4 font-bold text-text-primary">{c.ordersCount} orders</td>
                  <td className="py-4 font-heading font-extrabold text-text-primary">
                    {formatCurrency(c.walletBalance)}
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "text-[8px] font-extrabold px-2 py-0.5 border rounded uppercase",
                      c.isBlocked 
                        ? "bg-status-error/5 border-status-error/20 text-status-error" 
                        : "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald"
                    )}>
                      {c.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-2">
                    <button
                      onClick={() => toggleCustomerStatus(c.id)}
                      className={cn(
                        "py-1 px-3 rounded font-bold cursor-pointer transition-all border",
                        c.isBlocked 
                          ? "bg-brand-emerald/5 border-brand-emerald/20 text-brand-emerald" 
                          : "border-status-error/30 text-status-error hover:bg-status-error/5"
                      )}
                    >
                      {c.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

    </div>
  );
};

export default AdminUsers;

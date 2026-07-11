import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminMerchant {
  id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  docStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  commissionRate: number;
  isSuspended: boolean;
  rating: number;
}

export interface AdminRider {
  id: string;
  name: string;
  phone: string;
  docStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  isSuspended: boolean;
  rating: number;
  earnings: number;
}

export interface AdminCustomer {
  id: string;
  name: string;
  phone: string;
  isBlocked: boolean;
  walletBalance: number;
  ordersCount: number;
}

interface PlatformSettings {
  generalPlatformFee: number;
  deliveryChargePerKm: number;
  commissionPercentage: number;
  maintenanceMode: boolean;
  geoRoutingEnabled: boolean;
  dynamicPricingEnabled: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
}

interface AdminState {
  metrics: {
    totalRevenue: number;
    todayRevenue: number;
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
    cancelledOrders: number;
  };
  merchants: AdminMerchant[];
  riders: AdminRider[];
  customers: AdminCustomer[];
  settings: PlatformSettings;
  auditLogs: AuditLog[];
  
  toggleMerchantStatus: (merchantId: string) => void;
  approveMerchant: (merchantId: string) => void;
  updateMerchantCommission: (merchantId: string, rate: number) => void;
  
  toggleRiderStatus: (riderId: string) => void;
  approveRider: (riderId: string) => void;
  
  toggleCustomerStatus: (customerId: string) => void;
  
  updateSettings: (fields: Partial<PlatformSettings>) => void;
  toggleFeatureFlag: (flagKey: 'geoRoutingEnabled' | 'dynamicPricingEnabled') => void;
  addAuditLog: (action: string) => void;
}

const INITIAL_MERCHANTS: AdminMerchant[] = [
  { id: 'MER-102', storeName: 'Aether Fresh Market', ownerName: 'Rajesh K', phone: '9880011223', docStatus: 'VERIFIED', commissionRate: 10, isSuspended: false, rating: 4.8 },
  { id: 'MER-103', storeName: 'Super Grocers', ownerName: 'Amit Verma', phone: '9900223344', docStatus: 'PENDING', commissionRate: 12, isSuspended: false, rating: 4.2 },
  { id: 'MER-104', storeName: 'Apollo Pharma', ownerName: 'Dr. Srinivas', phone: '9876543210', docStatus: 'VERIFIED', commissionRate: 8, isSuspended: true, rating: 4.9 }
];

const INITIAL_RIDERS: AdminRider[] = [
  { id: 'RID-501', name: 'Karthik Raja', phone: '9911223344', docStatus: 'VERIFIED', isSuspended: false, rating: 4.85, earnings: 4850 },
  { id: 'RID-502', name: 'Mohit Sen', phone: '9922334455', docStatus: 'PENDING', isSuspended: false, rating: 4.3, earnings: 1200 },
  { id: 'RID-503', name: 'Suresh Kumar', phone: '9933445566', docStatus: 'VERIFIED', isSuspended: true, rating: 4.0, earnings: 8400 }
];

const INITIAL_CUSTOMERS: AdminCustomer[] = [
  { id: 'CUST-801', name: 'Ramesh Kumar', phone: '9988223344', isBlocked: false, walletBalance: 350, ordersCount: 14 },
  { id: 'CUST-802', name: 'Sneha Patel', phone: '9876543210', isBlocked: false, walletBalance: 1200, ordersCount: 22 },
  { id: 'CUST-803', name: 'Vikram Singh', phone: '9845011223', isBlocked: true, walletBalance: 0, ordersCount: 2 }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'LOG-001', timestamp: 'Today, 10:12 AM', adminUser: 'SuperAdmin (NG)', action: 'Updated commission percentage to 10%' },
  { id: 'LOG-002', timestamp: 'Yesterday, 04:30 PM', adminUser: 'SuperAdmin (NG)', action: 'Approved store verification for Apollo Pharma' }
];

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      metrics: {
        totalRevenue: 284550,
        todayRevenue: 14850,
        totalOrders: 1840,
        activeOrders: 42,
        completedOrders: 1680,
        cancelledOrders: 118
      },
      merchants: INITIAL_MERCHANTS,
      riders: INITIAL_RIDERS,
      customers: INITIAL_CUSTOMERS,
      settings: {
        generalPlatformFee: 5,
        deliveryChargePerKm: 15,
        commissionPercentage: 10,
        maintenanceMode: false,
        geoRoutingEnabled: true,
        dynamicPricingEnabled: false
      },
      auditLogs: INITIAL_AUDIT_LOGS,

      toggleMerchantStatus: (id) => set((state) => {
        const nextMerchants = state.merchants.map((m) => 
          m.id === id ? { ...m, isSuspended: !m.isSuspended } : m
        );
        const merchant = state.merchants.find((m) => m.id === id);
        const action = merchant 
          ? `${merchant.isSuspended ? 'Activated' : 'Suspended'} merchant ${merchant.storeName}`
          : `Toggled status for merchant ${id}`;
        
        return {
          merchants: nextMerchants,
          auditLogs: [
            { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action },
            ...state.auditLogs
          ]
        };
      }),

      approveMerchant: (id) => set((state) => {
        const nextMerchants = state.merchants.map((m) => 
          m.id === id ? { ...m, docStatus: 'VERIFIED' as const } : m
        );
        const merchant = state.merchants.find((m) => m.id === id);
        const action = merchant ? `Approved document credentials for merchant ${merchant.storeName}` : `Approved merchant docs for ${id}`;

        return {
          merchants: nextMerchants,
          auditLogs: [
            { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action },
            ...state.auditLogs
          ]
        };
      }),

      updateMerchantCommission: (id, rate) => set((state) => ({
        merchants: state.merchants.map((m) => m.id === id ? { ...m, commissionRate: rate } : m),
        auditLogs: [
          { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action: `Adjusted commission rate for merchant ${id} to ${rate}%` },
          ...state.auditLogs
        ]
      })),

      toggleRiderStatus: (id) => set((state) => {
        const nextRiders = state.riders.map((r) => 
          r.id === id ? { ...r, isSuspended: !r.isSuspended } : r
        );
        const rider = state.riders.find((r) => r.id === id);
        const action = rider 
          ? `${rider.isSuspended ? 'Activated' : 'Suspended'} rider ${rider.name}`
          : `Toggled status for rider ${id}`;

        return {
          riders: nextRiders,
          auditLogs: [
            { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action },
            ...state.auditLogs
          ]
        };
      }),

      approveRider: (id) => set((state) => {
        const nextRiders = state.riders.map((r) => 
          r.id === id ? { ...r, docStatus: 'VERIFIED' as const } : r
        );
        const rider = state.riders.find((r) => r.id === id);
        const action = rider ? `Approved KYC credentials for rider ${rider.name}` : `Approved rider KYC for ${id}`;

        return {
          riders: nextRiders,
          auditLogs: [
            { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action },
            ...state.auditLogs
          ]
        };
      }),

      toggleCustomerStatus: (id) => set((state) => {
        const nextCustomers = state.customers.map((c) => 
          c.id === id ? { ...c, isBlocked: !c.isBlocked } : c
        );
        const customer = state.customers.find((c) => c.id === id);
        const action = customer 
          ? `${customer.isBlocked ? 'Unblocked' : 'Blocked'} customer ${customer.name}`
          : `Toggled status for customer ${id}`;

        return {
          customers: nextCustomers,
          auditLogs: [
            { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action },
            ...state.auditLogs
          ]
        };
      }),

      updateSettings: (fields) => set((state) => ({
        settings: { ...state.settings, ...fields },
        auditLogs: [
          { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action: `Updated platform configurations.` },
          ...state.auditLogs
        ]
      })),

      toggleFeatureFlag: (flagKey) => set((state) => {
        const nextVal = !state.settings[flagKey];
        return {
          settings: { ...state.settings, [flagKey]: nextVal },
          auditLogs: [
            { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action: `Toggled feature flag '${flagKey}' to ${nextVal}` },
            ...state.auditLogs
          ]
        };
      }),

      addAuditLog: (action) => set((state) => ({
        auditLogs: [
          { id: `LOG-${Date.now()}`, timestamp: 'Just now', adminUser: 'SuperAdmin (NG)', action },
          ...state.auditLogs
        ]
      }))
    }),
    {
      name: 'aether-admin-store-storage',
      partialize: (state) => ({
        metrics: state.metrics,
        merchants: state.merchants,
        riders: state.riders,
        customers: state.customers,
        settings: state.settings,
        auditLogs: state.auditLogs
      })
    }
  )
);

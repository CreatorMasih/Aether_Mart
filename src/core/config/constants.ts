/**
 * Aether Mart - Platform Configurations & Constants
 */

export const PLATFORM_CONFIG = {
  appName: 'Aether Mart',
  defaultDeliveryFee: 15,
  freeDeliveryThreshold: 199,
  handlingFee: 5,
  surgeFee: 0,
  taxRate: 0.05,
  supportPhone: '+919999999999',
  supportEmail: 'support@aethermart.com',
  defaultRadiusKm: 5,
};

export const STORAGE_KEYS = {
  THEME: 'aether-theme',
  AUTH_TOKEN: 'aether-auth-token',
  USER_SESSION: 'aether-user-session',
  CART: 'aether-cart',
  RECENT_SEARCHES: 'aether-recent-searches',
  SAVED_LOCATIONS: 'aether-saved-locations',
} as const;

export const ROUTES = {
  root: '/',
  welcome: '/welcome',
  auth: {
    login: '/auth',
    otp: '/auth/verify',
  },
  customer: {
    home: '/c/home',
    search: '/c/search',
    category: (slug: string) => `/c/category/${slug}`,
    product: (slug: string) => `/c/product/${slug}`,
    checkout: '/c/checkout',
    trackOrder: (id: string) => `/c/orders/track/${id}`,
    insights: '/c/profile/insights',
  },
  merchant: {
    dashboard: '/m/dashboard',
    orders: '/m/orders',
    catalog: '/m/catalog',
  },
  rider: {
    dashboard: '/r/dashboard',
    activeJob: '/r/active',
  },
  admin: {
    dashboard: '/a/dashboard',
  },
} as const;

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    completeProfile: '/auth/complete-profile',
  },
  customer: {
    profile: '/auth/complete-profile',
    addresses: '/customer/addresses',
    products: '/customer/products',
    categories: '/customer/categories',
    createOrder: '/customer/orders',
    orderHistory: '/customer/orders/history',
    orderTracking: (id: string) => `/customer/orders/${id}/track`,
  },
  merchant: {
    storeDetails: '/merchant/store',
    orders: '/merchant/orders',
    catalog: '/merchant/catalog',
    updateStock: '/merchant/catalog/stock',
  },
  rider: {
    profile: '/rider/profile',
    jobs: '/rider/jobs',
    acceptJob: (id: string) => `/rider/jobs/${id}/accept`,
    updateLocation: '/rider/location',
  },
} as const;

export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  SHOPKEEPER: 'SHOPKEEPER',
  RIDER: 'RIDER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const PERMISSIONS = {
  READ_CATALOG: 'read:catalog',
  WRITE_CATALOG: 'write:catalog',
  MANAGE_ORDERS: 'manage:orders',
  DISPATCH_RIDER: 'dispatch:rider',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type ThemeType = typeof THEMES[keyof typeof THEMES];

export const ORDER_STATUS = {
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PACKING: 'PACKING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.PLACED]: 'Order Received',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed by Store',
  [ORDER_STATUS.PACKING]: 'Packing Your Items',
  [ORDER_STATUS.READY_FOR_PICKUP]: 'Ready for Handover',
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 'Rider is on the Way',
  [ORDER_STATUS.DELIVERED]: 'Delivered Successfully',
  [ORDER_STATUS.CANCELLED]: 'Order Cancelled',
};

export const DELIVERY_INSTRUCTION_PRESETS = [
  { id: 'gate', label: 'Leave at gate', icon: 'GateIcon' },
  { id: 'door', label: 'Leave at door', icon: 'DoorIcon' },
  { id: 'no_ring', label: 'Don\'t ring bell', icon: 'BellOffIcon' },
  { id: 'call', label: 'Call before delivery', icon: 'PhoneCallIcon' },
  { id: 'guard', label: 'Handover to guard', icon: 'ShieldIcon' },
];

// ─── Catalog query keys ────────────────────────────────────────────────────────
export const queryKeys = {
  homeFeed: (lat?: number, lng?: number) => ['homeFeed', lat, lng] as const,
  categories: () => ['categories'] as const,
  products: (filters?: Record<string, unknown>) => ['products', filters] as const,
  product: (id: string) => ['product', id] as const,
  relatedProducts: (id: string) => ['product', id, 'related'] as const,
  boughtTogether: (id: string) => ['product', id, 'bought-together'] as const,
  reviews: (id: string, page?: number) => ['product', id, 'reviews', page] as const,
  wishlist: () => ['wishlist'] as const,
  recentlyViewed: () => ['recentlyViewed'] as const,
  searchSuggestions: (query: string) => ['searchSuggestions', query] as const,

  // ─── Cart query keys ────────────────────────────────────────────────────────
  cart: () => ['cart'] as const,
  cartRecalculate: (params: Record<string, unknown>) => ['cart', 'recalculate', params] as const,

  // ─── Order query keys ───────────────────────────────────────────────────────
  orderHistory: (page?: number) => ['orders', 'history', page ?? 1] as const,
  orderDetail: (id: string) => ['orders', 'detail', id] as const,

  // ─── Merchant query keys ────────────────────────────────────────────────────
  merchantDashboard: () => ['merchant', 'dashboard'] as const,
  merchantOrders: () => ['merchant', 'orders'] as const,
  merchantPayouts: () => ['merchant', 'payouts'] as const,
  merchantProducts: (storeId: string) => ['merchant', 'products', storeId] as const,

  // ─── Rider query keys ───────────────────────────────────────────────────────
  riderEarnings: () => ['rider', 'earnings'] as const,
  riderAvailableJobs: (lat?: number, lng?: number) => ['rider', 'availableJobs', lat, lng] as const,
  riderAssignments: () => ['rider', 'assignments'] as const,

  // ─── Admin query keys ───────────────────────────────────────────────────────
  adminUsers: (filters?: Record<string, unknown>) => ['admin', 'users', filters] as const,
  adminPendingMerchants: () => ['admin', 'merchants', 'pending'] as const,
  adminPendingRiders: () => ['admin', 'riders', 'pending'] as const,
  adminBanners: () => ['admin', 'banners'] as const,
  adminCoupons: () => ['admin', 'coupons'] as const,
  adminSettings: () => ['admin', 'settings'] as const,
  adminKPIs: () => ['admin', 'kpis'] as const,
  adminStorePerformance: () => ['admin', 'analytics', 'stores'] as const,
  adminRiderPerformance: () => ['admin', 'analytics', 'riders'] as const,
  adminOrderFunnel: () => ['admin', 'analytics', 'funnel'] as const,
  adminCancellationAnalytics: () => ['admin', 'analytics', 'cancellations'] as const,
  adminTopProducts: () => ['admin', 'analytics', 'products'] as const,
  adminCategoryAnalytics: () => ['admin', 'analytics', 'categories'] as const,
  adminAuditLogs: (page?: number) => ['admin', 'audit-logs', page ?? 1] as const,
};

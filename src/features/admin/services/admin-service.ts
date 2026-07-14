import { apiClient } from '../../../core/network/api-client';

export interface AppSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  isPublic: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  beforeValue?: string;
  afterValue?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    email: string;
    role: string;
  };
}

export class AdminService {
  // ─── User Management ────────────────────────────────────────────────────────
  async getUsers(params: { page?: number; limit?: number; search?: string; role?: string }) {
    const res = await apiClient.get('/admin/users', { params });
    return res.data.data as { users: any[]; total: number };
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED') {
    const res = await apiClient.put(`/admin/users/${userId}/status`, { status });
    return res.data.data;
  }

  // ─── Merchant Approvals ───────────────────────────────────────────────────
  async getPendingMerchants() {
    const res = await apiClient.get('/admin/merchants/pending');
    return res.data.data as any[];
  }

  async approveMerchant(merchantId: string, approve: boolean) {
    const res = await apiClient.put(`/admin/merchants/${merchantId}/approve`, { approve });
    return res.data.data;
  }

  async updateMerchantCommission(merchantId: string, commissionRate: number) {
    const res = await apiClient.put(`/admin/merchants/${merchantId}/commission`, { commissionRate });
    return res.data.data;
  }

  // ─── Rider Approvals ──────────────────────────────────────────────────────
  async getPendingRiders() {
    const res = await apiClient.get('/admin/riders/pending');
    return res.data.data as any[];
  }

  async approveRider(riderId: string, approve: boolean) {
    const res = await apiClient.put(`/admin/riders/${riderId}/approve`, { approve });
    return res.data.data;
  }

  // ─── Product Moderation ───────────────────────────────────────────────────
  async moderateProduct(productId: string, isActive: boolean) {
    const res = await apiClient.put(`/admin/products/${productId}/moderate`, { isActive });
    return res.data.data;
  }

  // ─── Banner Management ─────────────────────────────────────────────────────
  async getBanners() {
    const res = await apiClient.get('/admin/banners');
    return res.data.data as any[];
  }

  async createBanner(data: any) {
    const res = await apiClient.post('/admin/banners', data);
    return res.data.data;
  }

  async updateBanner(bannerId: string, data: any) {
    const res = await apiClient.put(`/admin/banners/${bannerId}`, data);
    return res.data.data;
  }

  async deleteBanner(bannerId: string) {
    const res = await apiClient.delete(`/admin/banners/${bannerId}`);
    return res.data.data;
  }

  // ─── Coupon Management ─────────────────────────────────────────────────────
  async getCoupons() {
    const res = await apiClient.get('/admin/coupons');
    return res.data.data as any[];
  }

  async createCoupon(data: any) {
    const res = await apiClient.post('/admin/coupons', data);
    return res.data.data;
  }

  async updateCoupon(couponId: string, data: any) {
    const res = await apiClient.put(`/admin/coupons/${couponId}`, data);
    return res.data.data;
  }

  async deleteCoupon(couponId: string) {
    const res = await apiClient.delete(`/admin/coupons/${couponId}`);
    return res.data.data;
  }

  // ─── Settings Management ───────────────────────────────────────────────────
  async getSettings() {
    const res = await apiClient.get('/admin/settings');
    return res.data.data as AppSetting[];
  }

  async bulkUpdateSettings(settings: Array<{ key: string; value: string; description?: string }>) {
    const res = await apiClient.put('/admin/settings', { settings });
    return res.data.data as AppSetting[];
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────
  async getKPIs() {
    const res = await apiClient.get('/admin/analytics/kpis');
    return res.data.data as {
      gmv: number;
      revenue: number;
      activeUsers: number;
      activeOrders: number;
    };
  }

  async getStorePerformance() {
    const res = await apiClient.get('/admin/analytics/stores');
    return res.data.data as any[];
  }

  async getRiderPerformance() {
    const res = await apiClient.get('/admin/analytics/riders');
    return res.data.data as any[];
  }

  async getOrderFunnel() {
    const res = await apiClient.get('/admin/analytics/funnel');
    return res.data.data;
  }

  async getCancellationAnalytics() {
    const res = await apiClient.get('/admin/analytics/cancellations');
    return res.data.data as {
      totalOrders: number;
      cancelledOrders: number;
      cancellationRate: number;
      refundedAmount: number;
    };
  }

  async getTopProducts() {
    const res = await apiClient.get('/admin/analytics/products');
    return res.data.data as any[];
  }

  async getCategoryAnalytics() {
    const res = await apiClient.get('/admin/analytics/categories');
    return res.data.data as any[];
  }

  // ─── Audit Trail Logs ──────────────────────────────────────────────────────
  async getAuditLogs(params: { page?: number; limit?: number }) {
    const res = await apiClient.get('/admin/audit-logs', { params });
    return res.data.data as { logs: AuditLogEntry[]; total: number };
  }

  // ─── Platform Background Jobs ──────────────────────────────────────────────
  async triggerJobs() {
    const res = await apiClient.post('/admin/jobs/trigger');
    return res.data.data;
  }
}

export const adminService = new AdminService();
export default adminService;

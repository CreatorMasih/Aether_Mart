import { adminRepository } from './admin.repository';
import { UserStatus, UserRole } from '@prisma/client';
import { NotFoundError, BadRequestError } from '../../common/middlewares/errorHandler.middleware';
import { createModuleLogger } from '../../utils/logger';

import notificationService from '../../common/services/notification.service';

const log = createModuleLogger('AdminService');

export class AdminService {
  // ─── User Management ────────────────────────────────────────────────────────

  public async getUsers(
    adminUserId: string,
    query: { page?: number; limit?: number; search?: string; role?: string }
  ): Promise<any> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    const search = query.search || undefined;
    const role = query.role ? (query.role as UserRole) : undefined;

    return adminRepository.findUsers({ page, limit, search, role });
  }

  public async updateUserStatus(
    adminUserId: string,
    targetUserId: string,
    status: UserStatus,
    ipAddress: string
  ): Promise<any> {
    const user = await adminRepository.findUserById(targetUserId);
    if (!user) throw new NotFoundError('User');

    if (user.id === adminUserId) {
      throw new BadRequestError('You cannot change your own status.');
    }

    const isActive = status === UserStatus.ACTIVE;
    const updated = await adminRepository.updateUserStatus(targetUserId, status, isActive);

    // Write Audit Log
    await adminRepository.logAction({
      userId: adminUserId,
      action: 'USER_STATUS_CHANGE',
      targetType: 'User',
      targetId: targetUserId,
      beforeValue: { status: user.status, isActive: user.isActive },
      afterValue: { status: updated.status, isActive: updated.isActive },
      ipAddress,
    });

    log.info(`Admin ${adminUserId} updated status of User ${targetUserId} to ${status}`);
    return updated;
  }

  // ─── Merchant Approvals ───────────────────────────────────────────────────

  public async getPendingMerchants(): Promise<any[]> {
    return adminRepository.findPendingMerchants();
  }

  public async approveMerchant(
    adminUserId: string,
    merchantId: string,
    approve: boolean,
    ipAddress: string
  ): Promise<any> {
    const merchant = await adminRepository.findMerchantById(merchantId);
    if (!merchant) throw new NotFoundError('Merchant profile');

    const updated = await adminRepository.updateMerchantApproval(merchantId, approve);

    // Audit log
    await adminRepository.logAction({
      userId: adminUserId,
      action: approve ? 'MERCHANT_APPROVE' : 'MERCHANT_REJECT',
      targetType: 'Merchant',
      targetId: merchantId,
      beforeValue: { isApproved: merchant.isApproved },
      afterValue: { isApproved: updated.isApproved },
      ipAddress,
    });

    log.info(`Admin ${adminUserId} set approval of Merchant ${merchantId} to ${approve}`);
    return updated;
  }

  // ─── Rider Approvals ──────────────────────────────────────────────────────

  public async getPendingRiders(): Promise<any[]> {
    return adminRepository.findPendingRiders();
  }

  public async approveRider(
    adminUserId: string,
    riderId: string,
    approve: boolean,
    ipAddress: string,
    rejectionReason?: string
  ): Promise<any> {
    const rider = await adminRepository.findRiderById(riderId);
    if (!rider) throw new NotFoundError('Rider profile');

    const updated = await adminRepository.updateRiderApproval(riderId, approve);

    // Audit log
    await adminRepository.logAction({
      userId: adminUserId,
      action: approve ? 'RIDER_APPROVE' : 'RIDER_REJECT',
      targetType: 'Rider',
      targetId: riderId,
      beforeValue: { isApproved: rider.isApproved },
      afterValue: { isApproved: updated.isApproved, rejectionReason },
      ipAddress,
    });

    // Create persisted notification for Rider
    await notificationService.createNotification({
      userId: rider.userId,
      title: approve ? 'Rider Verification Approved' : 'Rider Verification Rejected',
      body: approve
        ? 'Your rider account and verification documents have been approved by Admin. You are now authorized to go online and accept delivery jobs.'
        : `Your rider verification was rejected by Admin.${rejectionReason ? ` Reason: ${rejectionReason}` : ' Please check your profile and re-upload valid documents.'}`,
      type: 'RIDER_VERIFICATION_STATUS',
      data: { isApproved: approve, rejectionReason: rejectionReason || null },
    });

    log.info(`Admin ${adminUserId} set approval of Rider ${riderId} to ${approve}`);
    return updated;
  }

  // ─── Product Moderation ───────────────────────────────────────────────────

  public async moderateProduct(
    adminUserId: string,
    productId: string,
    isActive: boolean,
    ipAddress: string
  ): Promise<any> {
    const product = await adminRepository.findProductById(productId);
    if (!product) throw new NotFoundError('Product');

    const updated = await adminRepository.updateProductStatus(productId, isActive);

    // Audit log
    await adminRepository.logAction({
      userId: adminUserId,
      action: 'PRODUCT_MODERATE',
      targetType: 'Product',
      targetId: productId,
      beforeValue: { isActive: product.isActive },
      afterValue: { isActive: updated.isActive },
      ipAddress,
    });

    log.info(`Admin ${adminUserId} set product ${productId} active status to ${isActive}`);
    return updated;
  }

  // ─── Banner Management ─────────────────────────────────────────────────────

  public async getBanners(): Promise<any[]> {
    return adminRepository.findBanners();
  }

  public async createBanner(adminUserId: string, data: any, ipAddress: string): Promise<any> {
    const banner = await adminRepository.createBanner({
      title: data.title,
      imageUrl: data.imageUrl,
      linkType: data.linkType,
      linkTarget: data.linkTarget,
      isActive: data.isActive ?? true,
      displayOrder: data.displayOrder ?? 0,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    });

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'BANNER_CREATE',
      targetType: 'Banner',
      targetId: banner.id,
      afterValue: banner,
      ipAddress,
    });

    return banner;
  }

  public async updateBanner(adminUserId: string, bannerId: string, data: any, ipAddress: string): Promise<any> {
    const banner = await adminRepository.findBannerById(bannerId);
    if (!banner) throw new NotFoundError('Banner');

    const updateData: any = { ...data };
    if (data.startsAt !== undefined) updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;

    const updated = await adminRepository.updateBanner(bannerId, updateData);

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'BANNER_UPDATE',
      targetType: 'Banner',
      targetId: bannerId,
      beforeValue: banner,
      afterValue: updated,
      ipAddress,
    });

    return updated;
  }

  public async deleteBanner(adminUserId: string, bannerId: string, ipAddress: string): Promise<void> {
    const banner = await adminRepository.findBannerById(bannerId);
    if (!banner) throw new NotFoundError('Banner');

    await adminRepository.deleteBanner(bannerId);

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'BANNER_DELETE',
      targetType: 'Banner',
      targetId: bannerId,
      beforeValue: banner,
      ipAddress,
    });
  }

  // ─── Coupon Management ─────────────────────────────────────────────────────

  public async getCoupons(): Promise<any[]> {
    return adminRepository.findCoupons();
  }

  public async createCoupon(adminUserId: string, data: any, ipAddress: string): Promise<any> {
    const coupon = await adminRepository.createCoupon({
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue ?? 0.0,
      maxDiscount: data.maxDiscount ?? null,
      usageLimit: data.usageLimit ?? 1,
      expiry: new Date(data.expiry),
      isActive: data.isActive ?? true,
    });

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'COUPON_CREATE',
      targetType: 'Coupon',
      targetId: coupon.id,
      afterValue: coupon,
      ipAddress,
    });

    return coupon;
  }

  public async updateCoupon(adminUserId: string, couponId: string, data: any, ipAddress: string): Promise<any> {
    const coupon = await adminRepository.findCouponById(couponId);
    if (!coupon) throw new NotFoundError('Coupon');

    const updateData: any = { ...data };
    if (data.code) updateData.code = data.code.toUpperCase();
    if (data.expiry) updateData.expiry = new Date(data.expiry);

    const updated = await adminRepository.updateCoupon(couponId, updateData);

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'COUPON_UPDATE',
      targetType: 'Coupon',
      targetId: couponId,
      beforeValue: coupon,
      afterValue: updated,
      ipAddress,
    });

    return updated;
  }

  public async deleteCoupon(adminUserId: string, couponId: string, ipAddress: string): Promise<any> {
    const coupon = await adminRepository.findCouponById(couponId);
    if (!coupon) throw new NotFoundError('Coupon');

    const updated = await adminRepository.deleteCoupon(couponId);

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'COUPON_DISABLE',
      targetType: 'Coupon',
      targetId: couponId,
      beforeValue: { isActive: coupon.isActive },
      afterValue: { isActive: false },
      ipAddress,
    });

    return updated;
  }

  // ─── Settings Management ───────────────────────────────────────────────────

  public async getSettings(): Promise<any[]> {
    return adminRepository.findSettings();
  }

  public async bulkUpdateSettings(adminUserId: string, settings: any[], ipAddress: string): Promise<any[]> {
    const beforeValues = await adminRepository.findSettings();
    const updatedList = [];

    for (const item of settings) {
      const updated = await adminRepository.upsertSetting(item.key, item.value, item.description);
      updatedList.push(updated);
    }

    await adminRepository.logAction({
      userId: adminUserId,
      action: 'SETTINGS_BULK_UPDATE',
      targetType: 'AppSetting',
      beforeValue: beforeValues,
      afterValue: updatedList,
      ipAddress,
    });

    log.info(`Admin ${adminUserId} bulk updated ${settings.length} app settings`);
    return updatedList;
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  public async getKPIs(): Promise<any> {
    return adminRepository.calculateKPIs();
  }

  public async getStorePerformance(): Promise<any[]> {
    return adminRepository.calculateStorePerformance();
  }

  public async getRiderPerformance(): Promise<any[]> {
    return adminRepository.calculateRiderPerformance();
  }

  public async getOrderFunnel(): Promise<any> {
    return adminRepository.calculateOrderFunnel();
  }

  public async getCancellationAnalytics(): Promise<any> {
    return adminRepository.calculateCancellationAnalytics();
  }

  public async getTopProducts(): Promise<any[]> {
    return adminRepository.calculateTopProducts();
  }

  public async getCategoryAnalytics(): Promise<any[]> {
    return adminRepository.calculateCategoryAnalytics();
  }

  public async getAuditLogs(
    query: { page?: number; limit?: number }
  ): Promise<any> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 10)));
    return adminRepository.findAuditLogs({ page, limit });
  }

  public async updateMerchantCommission(
    adminUserId: string,
    merchantId: string,
    commissionRatePercentage: number,
    ipAddress: string
  ): Promise<any> {
    const merchant = await adminRepository.findMerchantById(merchantId);
    if (!merchant) throw new NotFoundError('Merchant profile');

    const updated = await adminRepository.updateStoreCommission(merchantId, commissionRatePercentage);

    // Audit log
    await adminRepository.logAction({
      userId: adminUserId,
      action: 'MERCHANT_COMMISSION_UPDATE',
      targetType: 'Merchant',
      targetId: merchantId,
      beforeValue: { commissionRate: merchant.store ? merchant.store.commissionRate : undefined },
      afterValue: { commissionRate: commissionRatePercentage / 100 },
      ipAddress,
    });

    log.info(`Admin ${adminUserId} adjusted commission rate for Merchant ${merchantId} to ${commissionRatePercentage}%`);
    return updated;
  }
}

export const adminService = new AdminService();
export default adminService;

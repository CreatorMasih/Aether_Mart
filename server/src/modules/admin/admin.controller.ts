import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { jobsService } from './jobs.service';
import { sendSuccess } from '../../utils/response.util';
import {
  updateUserStatusSchema,
  approveMerchantSchema,
  approveRiderSchema,
  moderateProductSchema,
  createBannerSchema,
  updateBannerSchema,
  createCouponSchema,
  updateCouponSchema,
  bulkSettingsSchema,
  updateCommissionSchema,
} from './admin.validator';

export class AdminController {
  // ─── User Management ────────────────────────────────────────────────────────

  public async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const query = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        role: typeof req.query.role === 'string' ? req.query.role : undefined,
      };

      const data = await adminService.getUsers(adminUserId, query);
      sendSuccess(res, data, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const userId = req.params.userId as string;
      const payload = updateUserStatusSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.updateUserStatus(adminUserId, userId, payload.status, ipAddress);
      sendSuccess(res, data, `User status updated to ${payload.status}`);
    } catch (error) {
      next(error);
    }
  }

  // ─── Merchant Approvals ───────────────────────────────────────────────────

  public async getPendingMerchants(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getPendingMerchants();
      sendSuccess(res, data, 'Pending merchants retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async approveMerchant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const merchantId = req.params.merchantId as string;
      const payload = approveMerchantSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.approveMerchant(adminUserId, merchantId, payload.approve, ipAddress);
      sendSuccess(res, data, `Merchant approval set to ${payload.approve}`);
    } catch (error) {
      next(error);
    }
  }

  // ─── Rider Approvals ──────────────────────────────────────────────────────

  public async getPendingRiders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getPendingRiders();
      sendSuccess(res, data, 'Pending riders retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async approveRider(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const riderId = req.params.riderId as string;
      const payload = approveRiderSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.approveRider(adminUserId, riderId, payload.approve, ipAddress);
      sendSuccess(res, data, `Rider approval set to ${payload.approve}`);
    } catch (error) {
      next(error);
    }
  }

  // ─── Product Moderation ───────────────────────────────────────────────────

  public async moderateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const productId = req.params.productId as string;
      const payload = moderateProductSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.moderateProduct(adminUserId, productId, payload.isActive, ipAddress);
      sendSuccess(res, data, `Product active state set to ${payload.isActive}`);
    } catch (error) {
      next(error);
    }
  }

  // ─── Banner Management ─────────────────────────────────────────────────────

  public async getBanners(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getBanners();
      sendSuccess(res, data, 'Banners retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async createBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const payload = createBannerSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.createBanner(adminUserId, payload, ipAddress);
      sendSuccess(res, data, 'Banner created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async updateBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const bannerId = req.params.bannerId as string;
      const payload = updateBannerSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.updateBanner(adminUserId, bannerId, payload, ipAddress);
      sendSuccess(res, data, 'Banner updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async deleteBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const bannerId = req.params.bannerId as string;
      const ipAddress = (req.ip || '127.0.0.1') as string;

      await adminService.deleteBanner(adminUserId, bannerId, ipAddress);
      sendSuccess(res, null, 'Banner deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Coupon Management ─────────────────────────────────────────────────────

  public async getCoupons(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getCoupons();
      sendSuccess(res, data, 'Coupons retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async createCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const payload = createCouponSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.createCoupon(adminUserId, payload, ipAddress);
      sendSuccess(res, data, 'Coupon created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public async updateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const couponId = req.params.couponId as string;
      const payload = updateCouponSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.updateCoupon(adminUserId, couponId, payload, ipAddress);
      sendSuccess(res, data, 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async deleteCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const couponId = req.params.couponId as string;
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.deleteCoupon(adminUserId, couponId, ipAddress);
      sendSuccess(res, data, 'Coupon deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Settings Management ───────────────────────────────────────────────────

  public async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getSettings();
      sendSuccess(res, data, 'Settings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async bulkUpdateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const payload = bulkSettingsSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.bulkUpdateSettings(adminUserId, payload.settings, ipAddress);
      sendSuccess(res, data, 'App settings updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  public async getKPIs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getKPIs();
      sendSuccess(res, data, 'Dashboard KPIs calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getStorePerformance(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getStorePerformance();
      sendSuccess(res, data, 'Store performances calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getRiderPerformance(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getRiderPerformance();
      sendSuccess(res, data, 'Rider performances calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getOrderFunnel(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getOrderFunnel();
      sendSuccess(res, data, 'Order status funnel calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getCancellationAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getCancellationAnalytics();
      sendSuccess(res, data, 'Cancellation metrics calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getTopProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getTopProducts();
      sendSuccess(res, data, 'Top-selling products calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getCategoryAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await adminService.getCategoryAnalytics();
      sendSuccess(res, data, 'Category statistics calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ─── Background Jobs ───────────────────────────────────────────────────────

  public async triggerJobs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await jobsService.runAllJobs();
      sendSuccess(res, report, 'Background jobs executed successfully');
    } catch (error) {
      next(error);
    }
  }

  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const data = await adminService.getAuditLogs(query);
      sendSuccess(res, data, 'Audit logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public async updateMerchantCommission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user!.userId;
      const merchantId = req.params.merchantId as string;
      const { commissionRate } = updateCommissionSchema.parse(req.body);
      const ipAddress = (req.ip || '127.0.0.1') as string;

      const data = await adminService.updateMerchantCommission(adminUserId, merchantId, commissionRate, ipAddress);
      sendSuccess(res, data, 'Merchant commission rate adjusted successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
export default adminController;

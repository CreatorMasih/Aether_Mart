import { prisma } from '../../config/database.config';
import { UserStatus, UserRole, OrderStatus, DeliveryStatus, CouponType, LinkType } from '@prisma/client';

export class AdminRepository {
  private db = prisma;

  // ─── User Management ────────────────────────────────────────────────────────

  public async findUsers(params: {
    page: number;
    limit: number;
    search?: string;
    role?: UserRole;
  }): Promise<{ users: any[]; total: number }> {
    const { page, limit, search, role } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              fullName: true,
              wallet: { select: { balance: true } },
              orders: { select: { id: true } },
            },
          },
          merchant: {
            select: {
              id: true,
              fullName: true,
              isApproved: true,
              store: {
                select: {
                  id: true,
                  name: true,
                  commissionRate: true,
                  rating: true,
                },
              },
            },
          },
          rider: {
            select: {
              id: true,
              fullName: true,
              vehicleType: true,
              isApproved: true,
              balance: true,
              rating: true,
            },
          },
        },
      }),
      this.db.user.count({ where }),
    ]);

    return { users, total };
  }

  public async findUserById(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
    });
  }

  public async updateUserStatus(userId: string, status: UserStatus, isActive: boolean) {
    return this.db.user.update({
      where: { id: userId },
      data: { status, isActive },
    });
  }

  // ─── Merchant Management ──────────────────────────────────────────────────

  public async findPendingMerchants() {
    return this.db.merchant.findMany({
      where: { isApproved: false },
      include: {
        user: {
          select: { email: true, phone: true },
        },
      },
    });
  }

  public async findMerchantById(merchantId: string) {
    return this.db.merchant.findUnique({
      where: { id: merchantId },
      include: { store: true },
    });
  }

  public async updateMerchantApproval(merchantId: string, isApproved: boolean) {
    return this.db.merchant.update({
      where: { id: merchantId },
      data: { isApproved },
    });
  }

  // ─── Rider Management ─────────────────────────────────────────────────────

  public async findPendingRiders() {
    return this.db.rider.findMany({
      where: { isApproved: false },
      include: {
        user: {
          select: { email: true, phone: true },
        },
      },
    });
  }

  public async findRiderById(riderId: string) {
    return this.db.rider.findUnique({
      where: { id: riderId },
    });
  }

  public async updateRiderApproval(riderId: string, isApproved: boolean) {
    return this.db.rider.update({
      where: { id: riderId },
      data: { isApproved },
    });
  }

  // ─── Product Moderation ───────────────────────────────────────────────────

  public async findProductById(productId: string) {
    return this.db.product.findUnique({
      where: { id: productId },
    });
  }

  public async updateProductStatus(productId: string, isActive: boolean) {
    return this.db.product.update({
      where: { id: productId },
      data: { isActive },
    });
  }

  // ─── Banner Management ─────────────────────────────────────────────────────

  public async findBanners() {
    return this.db.banner.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  public async findBannerById(bannerId: string) {
    return this.db.banner.findUnique({
      where: { id: bannerId },
    });
  }

  public async createBanner(data: {
    title: string;
    imageUrl: string;
    linkType: LinkType;
    linkTarget: string;
    isActive: boolean;
    displayOrder: number;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }) {
    return this.db.banner.create({ data });
  }

  public async updateBanner(bannerId: string, data: any) {
    return this.db.banner.update({
      where: { id: bannerId },
      data,
    });
  }

  public async deleteBanner(bannerId: string) {
    return this.db.banner.delete({
      where: { id: bannerId },
    });
  }

  // ─── Coupon Management ─────────────────────────────────────────────────────

  public async findCoupons() {
    return this.db.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findCouponById(couponId: string) {
    return this.db.coupon.findUnique({
      where: { id: couponId },
    });
  }

  public async createCoupon(data: {
    code: string;
    type: CouponType;
    value: number;
    minOrderValue: number;
    maxDiscount?: number | null;
    usageLimit: number;
    expiry: Date;
    isActive: boolean;
  }) {
    return this.db.coupon.create({ data });
  }

  public async updateCoupon(couponId: string, data: any) {
    return this.db.coupon.update({
      where: { id: couponId },
      data,
    });
  }

  public async deleteCoupon(couponId: string) {
    return this.db.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    });
  }

  // ─── Settings Management ───────────────────────────────────────────────────

  public async findSettings() {
    return this.db.appSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  public async upsertSetting(key: string, value: string, description?: string) {
    return this.db.appSetting.upsert({
      where: { key },
      update: { value, ...(description ? { description } : {}) },
      create: { key, value, description },
    });
  }

  // ─── Audit Logging ────────────────────────────────────────────────────────

  public async logAction(params: {
    userId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    beforeValue?: any;
    afterValue?: any;
    ipAddress?: string;
  }) {
    return this.db.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId || null,
        beforeValue: params.beforeValue ? JSON.stringify(params.beforeValue) : null,
        afterValue: params.afterValue ? JSON.stringify(params.afterValue) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  }

  // ─── Analytics Helpers ─────────────────────────────────────────────────────

  public async calculateKPIs(): Promise<any> {
    const deliveredOrders = await this.db.order.findMany({
      where: { status: OrderStatus.DELIVERED },
      include: { store: true },
    });

    const gmv = deliveredOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
    const revenue = deliveredOrders.reduce((sum: number, o: any) => sum + (o.subtotal * (o.store?.commissionRate || 0.1)), 0);

    const activeUsersCount = await this.db.order.groupBy({
      by: ['customerId'],
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const activeOrders = await this.db.order.count({
      where: {
        status: {
          in: [
            OrderStatus.PLACED,
            OrderStatus.CONFIRMED,
            OrderStatus.PACKING,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
    });

    return {
      gmv: parseFloat(gmv.toFixed(2)),
      revenue: parseFloat(revenue.toFixed(2)),
      activeUsers: activeUsersCount.length,
      activeOrders,
    };
  }

  public async calculateStorePerformance(): Promise<any[]> {
    const stores = await this.db.store.findMany({
      where: { deletedAt: null },
      include: {
        orders: {
          where: { status: OrderStatus.DELIVERED },
        },
        products: {
          where: { deletedAt: null },
        },
      },
    });

    return stores.map((store: any) => {
      const totalOrders = store.orders.length;
      const gmv = store.orders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
      const revenue = store.orders.reduce((sum: number, o: any) => sum + (o.subtotal * store.commissionRate), 0);

      return {
        storeId: store.id,
        name: store.name,
        totalOrders,
        gmv: parseFloat(gmv.toFixed(2)),
        revenue: parseFloat(revenue.toFixed(2)),
        productCount: store.products.length,
        rating: store.rating,
      };
    });
  }

  public async calculateRiderPerformance(): Promise<any[]> {
    const riders = await this.db.rider.findMany({
      include: {
        assignments: {
          include: {
            order: true,
          },
        },
      },
    });

    return riders.map((rider: any) => {
      const completed = rider.assignments.filter((a: any) => a.status === DeliveryStatus.DELIVERED);
      const total = rider.assignments.length;
      const totalEarnings = completed.reduce((sum: number, a: any) => sum + (a.order?.deliveryFee || 0), 0);

      return {
        riderId: rider.id,
        fullName: rider.fullName,
        vehicleType: rider.vehicleType,
        totalDeliveries: total,
        completedDeliveries: completed.length,
        earnings: parseFloat(totalEarnings.toFixed(2)),
        rating: rider.rating,
      };
    });
  }

  public async calculateOrderFunnel(): Promise<any> {
    const statuses = Object.values(OrderStatus);
    const funnel: any = {};

    for (const status of statuses) {
      funnel[status] = await this.db.order.count({ where: { status } });
    }

    return funnel;
  }

  public async calculateCancellationAnalytics(): Promise<any> {
    const totalOrders = await this.db.order.count();
    const cancelledOrders = await this.db.order.count({
      where: { status: OrderStatus.CANCELLED },
    });

    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    const refundedAmountObj = await this.db.payment.aggregate({
      where: {
        status: 'REFUNDED',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalOrders,
      cancelledOrders,
      cancellationRate: parseFloat(cancellationRate.toFixed(2)),
      refundedAmount: refundedAmountObj._sum.amount || 0.0,
    };
  }

  public async calculateTopProducts(): Promise<any[]> {
    const topItems = await this.db.orderItem.groupBy({
      by: ['productId', 'productName', 'variantLabel'],
      where: {
        order: {
          status: OrderStatus.DELIVERED,
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    return topItems.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      unitsSold: item._sum.quantity || 0,
    }));
  }

  public async calculateCategoryAnalytics(): Promise<any[]> {
    const categories = await this.db.category.findMany({
      include: {
        products: {
          where: { deletedAt: null },
          include: {
            orderItems: {
              where: {
                order: {
                  status: OrderStatus.DELIVERED,
                },
              },
            },
          },
        },
      },
    });

    return categories.map((cat: any) => {
      let unitsSold = 0;
      let gmv = 0;

      for (const prod of cat.products) {
        for (const item of prod.orderItems) {
          unitsSold += item.quantity;
          gmv += item.quantity * item.unitPrice;
        }
      }

      return {
        categoryId: cat.id,
        name: cat.name,
        productCount: cat.products.length,
        unitsSold,
        gmv: parseFloat(gmv.toFixed(2)),
      };
    });
  }

  public async findAuditLogs(params: {
    page: number;
    limit: number;
  }): Promise<{ logs: any[]; total: number }> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      }),
      this.db.auditLog.count(),
    ]);

    return { logs, total };
  }

  public async updateStoreCommission(merchantId: string, commissionRatePercentage: number) {
    const merchant = await this.db.merchant.findUnique({
      where: { id: merchantId },
      include: { store: true },
    });
    if (!merchant || !merchant.store) {
      throw new Error('Merchant or associated storefront not found.');
    }

    return this.db.store.update({
      where: { id: merchant.store.id },
      data: { commissionRate: commissionRatePercentage / 100 },
    });
  }
}

export const adminRepository = new AdminRepository();
export default adminRepository;

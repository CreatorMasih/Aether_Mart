import { merchantRepository } from './merchant.repository';
import { catalogRepository } from '../catalog/catalog.repository';
import { orderRepository } from '../order/order.repository';
import { haversineDistance } from '../../utils/geo.util';
import { orderEventEmitter, OrderEvent } from '../../common/events/order-event.emitter';
import { 
  BadRequestError, 
  ConflictError, 
  NotFoundError, 
  ForbiddenError 
} from '../../common/middlewares/errorHandler.middleware';
import { ErrorCodes } from '../../utils/response.util';
import { createModuleLogger } from '../../utils/logger';
import { OrderStatus, DeliveryStatus, UserRole } from '@prisma/client';

const log = createModuleLogger('MerchantService');

export class MerchantService {
  /**
   * Updates merchant profile details and store settings in a transaction.
   */
  public async updateMerchantProfile(
    userId: string,
    params: {
      fullName?: string;
      ownerName?: string;
      gstNumber?: string;
      panNumber?: string;
      fssaiNumber?: string;
      storeName?: string;
      name?: string;
      storeAddress?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      deliveryRadiusKm?: number;
      openingTime?: string;
      closingTime?: string;
      isOpen?: boolean;
      isPaused?: boolean;
      isHoliday?: boolean;
      minimumOrderValue?: number;
      deliveryFee?: number;
      bankAccount?: string;
      bankName?: string;
      logoUrl?: string;
      bannerUrl?: string;
      upiId?: string;
      contactPhone?: string;
      contactEmail?: string;
      businessType?: string;
      description?: string;
    }
  ): Promise<any> {
    let merchant = await merchantRepository.findMerchantByUserId(userId);

    // If merchant profile doesn't exist yet, create it dynamically
    if (!merchant) {
      const user = await merchantRepository.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundError('User account');
      }

      const createdMerchant = await merchantRepository.prisma.merchant.create({
        data: {
          userId,
          fullName: params.fullName || params.ownerName || user.email || user.phone || 'Store Manager',
          gstNumber: params.gstNumber || undefined,
          panNumber: params.panNumber || undefined,
          fssaiNumber: params.fssaiNumber || undefined,
          bankAccount: params.bankAccount || undefined,
          bankName: params.bankName || undefined,
        },
      });

      const createdStore = await merchantRepository.prisma.store.create({
        data: {
          merchantId: createdMerchant.id,
          name: params.storeName || params.name || 'Aether Mart Store',
          description: params.description || undefined,
          address: params.storeAddress || params.address || 'Store Location Address',
          latitude: params.latitude ?? 12.9716,
          longitude: params.longitude ?? 77.5946,
          deliveryRadiusKm: params.deliveryRadiusKm ?? 5.0,
          openingTime: params.openingTime || '08:00',
          closingTime: params.closingTime || '22:00',
          isOpen: params.isOpen ?? true,
          isPaused: params.isPaused ?? false,
          isHoliday: params.isHoliday ?? false,
          minimumOrderValue: params.minimumOrderValue ?? 0,
          deliveryFee: params.deliveryFee ?? 0,
          logoUrl: params.logoUrl || undefined,
          bannerUrl: params.bannerUrl || undefined,
          upiId: params.upiId || undefined,
          contactPhone: params.contactPhone || user.phone || undefined,
          contactEmail: params.contactEmail || user.email || undefined,
          businessType: params.businessType || undefined,
        },
      });

      return {
        merchant: createdMerchant,
        store: createdStore,
      };
    }

    const result = await merchantRepository.prisma.$transaction(async (tx) => {
      // 1. Update Merchant info
      const merchantData: any = {};
      if (params.fullName !== undefined || params.ownerName !== undefined) {
        merchantData.fullName = params.fullName ?? params.ownerName;
      }
      if (params.gstNumber !== undefined) merchantData.gstNumber = params.gstNumber;
      if (params.panNumber !== undefined) merchantData.panNumber = params.panNumber;
      if (params.fssaiNumber !== undefined) merchantData.fssaiNumber = params.fssaiNumber;
      if (params.bankAccount !== undefined) merchantData.bankAccount = params.bankAccount;
      if (params.bankName !== undefined) merchantData.bankName = params.bankName;

      const updatedMerchant = await tx.merchant.update({
        where: { id: merchant.id },
        data: merchantData,
      });

      // 2. Update or Create Store info
      let updatedStore = null;
      if (merchant.store) {
        const storeData: any = {};
        if (params.storeName !== undefined || params.name !== undefined) {
          storeData.name = params.storeName ?? params.name;
        }
        if (params.description !== undefined) storeData.description = params.description;
        if (params.storeAddress !== undefined || params.address !== undefined) {
          storeData.address = params.storeAddress ?? params.address;
        }
        if (params.latitude !== undefined) storeData.latitude = params.latitude;
        if (params.longitude !== undefined) storeData.longitude = params.longitude;
        if (params.deliveryRadiusKm !== undefined) storeData.deliveryRadiusKm = params.deliveryRadiusKm;
        if (params.openingTime !== undefined) storeData.openingTime = params.openingTime;
        if (params.closingTime !== undefined) storeData.closingTime = params.closingTime;
        if (params.isOpen !== undefined) storeData.isOpen = params.isOpen;
        if (params.isPaused !== undefined) storeData.isPaused = params.isPaused;
        if (params.isHoliday !== undefined) storeData.isHoliday = params.isHoliday;
        if (params.minimumOrderValue !== undefined) storeData.minimumOrderValue = params.minimumOrderValue;
        if (params.deliveryFee !== undefined) storeData.deliveryFee = params.deliveryFee;
        if (params.logoUrl !== undefined) storeData.logoUrl = params.logoUrl;
        if (params.bannerUrl !== undefined) storeData.bannerUrl = params.bannerUrl;
        if (params.upiId !== undefined) storeData.upiId = params.upiId;
        if (params.contactPhone !== undefined) storeData.contactPhone = params.contactPhone;
        if (params.contactEmail !== undefined) storeData.contactEmail = params.contactEmail;
        if (params.businessType !== undefined) storeData.businessType = params.businessType;

        updatedStore = await tx.store.update({
          where: { id: merchant.store.id },
          data: storeData,
        });
      } else {
        updatedStore = await tx.store.create({
          data: {
            merchantId: merchant.id,
            name: params.storeName || params.name || 'Aether Mart Store',
            description: params.description || undefined,
            address: params.storeAddress || params.address || 'Store Location Address',
            latitude: params.latitude ?? 12.9716,
            longitude: params.longitude ?? 77.5946,
            deliveryRadiusKm: params.deliveryRadiusKm ?? 5.0,
            openingTime: params.openingTime || '08:00',
            closingTime: params.closingTime || '22:00',
            isOpen: params.isOpen ?? true,
            isPaused: params.isPaused ?? false,
            isHoliday: params.isHoliday ?? false,
            minimumOrderValue: params.minimumOrderValue ?? 0,
            deliveryFee: params.deliveryFee ?? 0,
            logoUrl: params.logoUrl || undefined,
            bannerUrl: params.bannerUrl || undefined,
            upiId: params.upiId || undefined,
            contactPhone: params.contactPhone || undefined,
            contactEmail: params.contactEmail || undefined,
            businessType: params.businessType || undefined,
          },
        });
      }

      // Write audit log
      await merchantRepository.writeAuditLog(
        userId,
        'MERCHANT_PROFILE_UPDATE',
        'Merchant',
        merchant.id,
        { merchant, store: merchant.store },
        { merchant: updatedMerchant, store: updatedStore },
        tx
      );

      return { merchant: updatedMerchant, store: updatedStore };
    });

    return result;
  }

  /**
   * Soft deletes a merchant and their store profile.
   */
  public async softDeleteMerchant(userId: string, targetMerchantId: string, actorRole: UserRole): Promise<void> {
    const merchant = await merchantRepository.prisma.merchant.findUnique({
      where: { id: targetMerchantId },
    });

    if (!merchant) throw new NotFoundError('Merchant');

    // Authority check: Only admins or the merchant themselves can trigger
    if (actorRole !== 'ADMIN' && merchant.userId !== userId) {
      throw new ForbiddenError('You are not authorized to soft-delete this merchant.');
    }

    await merchantRepository.prisma.$transaction(async (tx) => {
      await merchantRepository.softDeleteMerchant(targetMerchantId, tx);
      await merchantRepository.writeAuditLog(userId, 'SOFT_DELETE', 'MERCHANT', targetMerchantId, null, null, tx);
    });
  }

  /**
   * Creates a product with multiple variants and inventory entries.
   */
  public async createProduct(
    userId: string,
    params: {
      name: string;
      description?: string;
      brand?: string;
      isVeg?: boolean;
      isOrganic?: boolean;
      categoryId: string;
      weightGrams?: number;
      images?: Array<{ url: string; isPrimary?: boolean }>;
      variants: Array<{
        name: string;
        price: number;
        sku: string;
        stock: number;
      }>;
    }
  ): Promise<any> {
    const store = await merchantRepository.findStoreByUserId(userId);
    if (!store) throw new NotFoundError('Associated Store');

    const category = await merchantRepository.prisma.category.findUnique({
      where: { id: params.categoryId },
    });
    if (!category) throw new NotFoundError('Category');

    const result = await merchantRepository.prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          storeId: store.id,
          categoryId: params.categoryId,
          name: params.name,
          description: params.description || '',
          brand: params.brand || 'Generic',
          isVegetarian: params.isVeg ?? true,
          isOrganic: params.isOrganic ?? false,
          price: params.variants[0]?.price || 0.0, // fallback base price
          weightGrams: params.weightGrams || 0,
          unit: params.variants[0]?.name || 'unit',
          sku: params.variants[0]?.sku || `SKU-${Date.now()}`,
        },
      });

      // Create Images
      if (params.images && params.images.length > 0) {
        await tx.productImage.createMany({
          data: params.images.map(img => ({
            productId: product.id,
            url: img.url,
            isPrimary: img.isPrimary ?? false,
          })),
        });
      }

      // Create Variants and link Inventory
      for (const varInput of params.variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            name: varInput.name,
            price: varInput.price,
            sku: varInput.sku,
            stock: varInput.stock,
            version: 0,
          },
        });

        // Insert into inventory mapping
        await tx.inventory.create({
          data: {
            productId: product.id,
            variantId: variant.id,
            storeId: store.id,
            stockQty: varInput.stock,
            lowStockThreshold: 5,
            version: 0,
          },
        });
      }

      // Read final output
      const finalProduct = await tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true, images: true },
      });

      await merchantRepository.writeAuditLog(userId, 'CREATE_PRODUCT', 'PRODUCT', product.id, null, finalProduct, tx);
      return finalProduct;
    });

    return result;
  }

  /**
   * Updates product metadata or variant stock with optimistic concurrency checks.
   */
  public async updateProduct(
    userId: string,
    productId: string,
    params: {
      name?: string;
      description?: string;
      brand?: string;
      isVeg?: boolean;
      isOrganic?: boolean;
      categoryId?: string;
      weightGrams?: number;
      images?: Array<{ url: string; isPrimary?: boolean }>;
      variants?: Array<{
        id?: string; // missing -> create, present -> update
        name?: string;
        price?: number;
        sku?: string;
        stock?: number;
        version?: number; // optimistic concurrency token
      }>;
    }
  ): Promise<any> {
    const store = await merchantRepository.findStoreByUserId(userId);
    if (!store) throw new NotFoundError('Associated Store');

    const product = await merchantRepository.prisma.product.findFirst({
      where: { id: productId, storeId: store.id, deletedAt: null },
      include: { variants: true, images: true },
    });
    if (!product) throw new NotFoundError('Product');

    try {
      const result = await merchantRepository.prisma.$transaction(async (tx) => {
        // 1. Update basic product settings
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: {
            name: params.name,
            description: params.description,
            brand: params.brand,
            isVegetarian: params.isVeg,
            isOrganic: params.isOrganic,
            categoryId: params.categoryId,
            weightGrams: params.weightGrams,
          },
        });

        // 2. Handle Variants updates with optimistic concurrency version checking
        if (params.variants && params.variants.length > 0) {
          for (const varInput of params.variants) {
            if (varInput.id) {
              // Existing variant update
              const existingVariant = product.variants.find(v => v.id === varInput.id);
              if (!existingVariant) throw new NotFoundError(`Variant ${varInput.id}`);

              const reqVersion = varInput.version ?? existingVariant.version;

              // If stock is modified, execute optimistic locking
              if (varInput.stock !== undefined) {
                // Throws if version mismatch
                await merchantRepository.optimisticUpdateVariantStock(varInput.id, reqVersion, varInput.stock, tx);

                // Also update inventory mapping
                const inv = await tx.inventory.findFirst({
                  where: { variantId: varInput.id },
                });
                if (inv) {
                  await merchantRepository.optimisticUpdateInventoryStock(inv.id, inv.version, varInput.stock, tx);
                }
              }

              // Update metadata
              await tx.productVariant.update({
                where: { id: varInput.id },
                data: {
                  name: varInput.name,
                  price: varInput.price,
                  sku: varInput.sku,
                },
              });
            } else {
              // Create new variant
              const newVariant = await tx.productVariant.create({
                data: {
                  productId: productId,
                  name: varInput.name || 'New Variant',
                  price: varInput.price || 0.0,
                  sku: varInput.sku || `SKU-${Date.now()}`,
                  stock: varInput.stock || 0,
                  version: 0,
                },
              });

              await tx.inventory.create({
                data: {
                  productId: productId,
                  variantId: newVariant.id,
                  storeId: store.id,
                  stockQty: varInput.stock || 0,
                  lowStockThreshold: 5,
                  version: 0,
                },
              });
            }
          }
        }

        // Clean images and insert new if provided
        if (params.images) {
          await tx.productImage.deleteMany({ where: { productId } });
          if (params.images.length > 0) {
            await tx.productImage.createMany({
              data: params.images.map(img => ({
                productId,
                url: img.url,
                isPrimary: img.isPrimary ?? false,
              })),
            });
          }
        }

        // Recalculate total product stock in catalog
        const allVariants = await tx.productVariant.findMany({ where: { productId } });
        await tx.product.update({
          where: { id: productId },
          data: { price: allVariants[0]?.price || 0.0 },
        });

        const finalProduct = await tx.product.findUnique({
          where: { id: productId },
          include: { variants: true, images: true },
        });

        await merchantRepository.writeAuditLog(userId, 'UPDATE_PRODUCT', 'PRODUCT', productId, product, finalProduct, tx);
        return finalProduct;
      });

      return result;
    } catch (err: any) {
      if (err.message.includes('CONCURRENCY_ERROR')) {
        throw new ConflictError(
          'Optimistic Concurrency Lock Conflict: Another operation has modified this variant stock. Please refresh and try again.',
          ErrorCodes.CONFLICT
        );
      }
      throw err;
    }
  }

  /**
   * Soft deletes a product (sets deletedAt timestamp).
   */
  public async softDeleteProduct(userId: string, productId: string): Promise<void> {
    const store = await merchantRepository.findStoreByUserId(userId);
    if (!store) throw new NotFoundError('Associated Store');

    const product = await merchantRepository.prisma.product.findFirst({
      where: { id: productId, storeId: store.id, deletedAt: null },
    });
    if (!product) throw new NotFoundError('Product');

    await merchantRepository.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: { deletedAt: new Date() },
      });

      await merchantRepository.writeAuditLog(userId, 'SOFT_DELETE_PRODUCT', 'PRODUCT', productId, null, null, tx);
    });
  }

  /**
   * Order assignment strategy dispatcher (Manual or Automatic).
   */
  public async assignRider(
    userId: string,
    orderId: string,
    params: {
      strategy: 'MANUAL' | 'AUTOMATIC';
      riderId?: string;
    }
  ): Promise<any> {
    const store = await merchantRepository.findStoreByUserId(userId);
    if (!store) throw new NotFoundError('Associated Store');

    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (order.storeId !== store.id) throw new ForbiddenError('You can only manage orders belonging to your store.');

    if (order.status !== OrderStatus.PLACED && order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PACKING && order.status !== OrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestError(`Cannot assign a rider to an order in status: ${order.status}`);
    }

    let selectedRiderId = params.riderId;

    // Strategy 1: Automatic assignment (Find closest online, approved, and idle rider)
    if (params.strategy === 'AUTOMATIC') {
      // Find all approved riders currently online
      const onlineRiders = await merchantRepository.prisma.rider.findMany({
        where: { isOnline: true, isApproved: true },
        include: { assignments: { where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP'] } } } },
      });

      // Filter to find idle riders (active assignments = 0)
      const idleRiders = onlineRiders.filter(r => r.assignments.length === 0);
      if (idleRiders.length === 0) {
        throw new BadRequestError('No online, idle riders are currently available nearby.', ErrorCodes.SERVICE_UNAVAILABLE);
      }

      // Sort by distance to the store
      let closestRider = null;
      let minDistance = Infinity;

      for (const rider of idleRiders) {
        if (rider.currentLatitude !== null && rider.currentLongitude !== null) {
          const distance = haversineDistance(
            { latitude: store.latitude, longitude: store.longitude },
            { latitude: rider.currentLatitude, longitude: rider.currentLongitude }
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestRider = rider;
          }
        }
      }

      // If no rider has valid coordinates, fallback to first idle rider
      if (!closestRider) {
        closestRider = idleRiders[0];
      }

      selectedRiderId = closestRider.id;
    }

    // Validate selected rider
    if (!selectedRiderId) {
      throw new BadRequestError('Rider ID is required for MANUAL assignment strategy.');
    }

    const rider = await merchantRepository.prisma.rider.findUnique({
      where: { id: selectedRiderId },
    });
    if (!rider || !rider.isApproved || !rider.isOnline) {
      throw new BadRequestError('The selected rider is either offline, unapproved, or invalid.');
    }

    // Create assignment and update Order status within a transaction
    const assignment = await merchantRepository.prisma.$transaction(async (tx) => {
      // Delete existing assignment for this order if any
      await tx.deliveryAssignment.deleteMany({ where: { orderId } });

      // Generate simulated OTPs
      const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

      const created = await tx.deliveryAssignment.create({
        data: {
          orderId,
          riderId: selectedRiderId!,
          status: DeliveryStatus.ASSIGNED,
          pickupOtp,
          deliveryOtp,
        },
        include: { rider: true },
      });

      // Transition order status to CONFIRMED or update timeline
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      // Write audit
      await merchantRepository.writeAuditLog(
        userId,
        `ASSIGN_RIDER_${params.strategy}`,
        'ORDER',
        orderId,
        null,
        { assignmentId: created.id, riderId: selectedRiderId },
        tx
      );

      return created;
    });

    // Dispatch event
    orderEventEmitter.emitEvent(OrderEvent.CONFIRMED, { 
      order: { ...order, status: OrderStatus.CONFIRMED },
      extra: { assignment }
    });

    return assignment;
  }

  /**
   * Retrieves dashboard statistics and analytics for a merchant.
   */
  public async getDashboardStats(userId: string): Promise<any> {
    const store = await merchantRepository.findStoreByUserId(userId);
    if (!store) throw new NotFoundError('Associated Store not found');

    const orders = await merchantRepository.prisma.order.findMany({
      where: { storeId: store.id },
      include: { items: true },
    });

    const products = await merchantRepository.prisma.product.findMany({
      where: { storeId: store.id, deletedAt: null },
      include: { variants: true },
    });

    // 1. Calculations
    const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
    const totalRevenue = deliveredOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const completedOrdersCount = deliveredOrders.length;
    const activeOrdersCount = orders.filter((o) => 
      ['PLACED', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP'].includes(o.status)
    ).length;

    // Calculate stock levels
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const prod of products) {
      const stock = prod.variants.reduce((acc, v) => acc + v.stock, 0);
      if (stock === 0) {
        outOfStockCount++;
      } else if (stock > 0 && stock <= 5) {
        lowStockCount++;
      }
    }

    // 2. Order Volume Chart data (group by hour ranges)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= startOfToday);

    const chartData = [
      { label: '08:00', val: todayOrders.filter((o) => {
        const hour = new Date(o.createdAt).getHours();
        return hour >= 5 && hour < 9;
      }).length },
      { label: '11:00', val: todayOrders.filter((o) => {
        const hour = new Date(o.createdAt).getHours();
        return hour >= 9 && hour < 12;
      }).length },
      { label: '14:00', val: todayOrders.filter((o) => {
        const hour = new Date(o.createdAt).getHours();
        return hour >= 12 && hour < 15;
      }).length },
      { label: '17:00', val: todayOrders.filter((o) => {
        const hour = new Date(o.createdAt).getHours();
        return hour >= 15 && hour < 18;
      }).length },
      { label: '20:00', val: todayOrders.filter((o) => {
        const hour = new Date(o.createdAt).getHours();
        return hour >= 18 && hour < 21;
      }).length },
      { label: '23:00', val: todayOrders.filter((o) => {
        const hour = new Date(o.createdAt).getHours();
        return hour >= 21 || hour < 5;
      }).length },
    ];

    return {
      totalRevenue,
      completedOrdersCount,
      activeOrdersCount,
      lowStockCount,
      outOfStockCount,
      chartData,
    };
  }

  /**
   * Retrieves payout settlement logs for a merchant.
   */
  public async getPayouts(userId: string): Promise<any[]> {
    const merchant = await merchantRepository.findMerchantByUserId(userId);
    if (!merchant) throw new NotFoundError('Merchant Profile');

    const payouts = await merchantRepository.prisma.payout.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: 'desc' },
    });

    return payouts.map((p) => ({
      id: p.id.substring(0, 8).toUpperCase(),
      date: p.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      amount: p.amount,
      status: p.status,
    }));
  }
}

export const merchantService = new MerchantService();
export default merchantService;

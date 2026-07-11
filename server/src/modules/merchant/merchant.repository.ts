import { BaseRepository } from '../../common/repositories/base.repository';
import { Merchant, Store, Product, Order, AuditLog, Prisma } from '@prisma/client';

export class MerchantRepository extends BaseRepository {
  public async findMerchantByUserId(userId: string): Promise<(Merchant & { store: Store | null }) | null> {
    return this.db.merchant.findUnique({
      where: { userId, deletedAt: null },
      include: { store: true },
    }) as any;
  }

  public async findStoreByMerchantId(merchantId: string): Promise<Store | null> {
    return this.db.store.findFirst({
      where: { merchantId, deletedAt: null },
    });
  }

  public async findStoreByUserId(userId: string): Promise<Store | null> {
    const merchant = await this.db.merchant.findFirst({
      where: { userId, deletedAt: null },
      include: { store: true },
    });
    return merchant?.store || null;
  }

  /**
   * soft deletes a merchant and their linked store in a transaction.
   */
  public async softDeleteMerchant(merchantId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || this.db;
    const now = new Date();

    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: { store: true },
    });

    if (!merchant) return;

    await db.merchant.update({
      where: { id: merchantId },
      data: { deletedAt: now },
    });

    if (merchant.store) {
      await db.store.update({
        where: { id: merchant.store.id },
        data: { deletedAt: now },
      });
      // Soft-delete all store products
      await db.product.updateMany({
        where: { storeId: merchant.store.id },
        data: { deletedAt: now },
      });
    }
  }

  /**
   * Logs a merchant action in the system audit trail.
   */
  public async writeAuditLog(
    userId: string,
    action: string,
    targetType: string,
    targetId: string | null,
    beforeValue?: any,
    afterValue?: any,
    tx?: Prisma.TransactionClient
  ): Promise<AuditLog> {
    const db = tx || this.db;
    return db.auditLog.create({
      data: {
        userId,
        action,
        targetType,
        targetId,
        beforeValue: beforeValue ? JSON.stringify(beforeValue) : null,
        afterValue: afterValue ? JSON.stringify(afterValue) : null,
      },
    });
  }

  /**
   * Optimistic concurrency update for ProductVariant.
   * Throws if version mismatch (0 rows updated).
   */
  public async optimisticUpdateVariantStock(
    variantId: string,
    currentVersion: number,
    newStock: number,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const db = tx || this.db;
    
    const result = await db.productVariant.updateMany({
      where: {
        id: variantId,
        version: currentVersion,
      },
      data: {
        stock: newStock,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error('CONCURRENCY_ERROR: Variant stock update failed due to conflict.');
    }

    return db.productVariant.findUnique({ where: { id: variantId } });
  }

  /**
   * Optimistic concurrency update for Inventory.
   */
  public async optimisticUpdateInventoryStock(
    inventoryId: string,
    currentVersion: number,
    newStock: number,
    tx?: Prisma.TransactionClient
  ): Promise<any> {
    const db = tx || this.db;

    const result = await db.inventory.updateMany({
      where: {
        id: inventoryId,
        version: currentVersion,
      },
      data: {
        stockQty: newStock,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new Error('CONCURRENCY_ERROR: Inventory stock update failed due to conflict.');
    }

    return db.inventory.findUnique({ where: { id: inventoryId } });
  }

  public async findStoreOrders(storeId: string): Promise<Order[]> {
    return this.db.order.findMany({
      where: { storeId },
      include: {
        items: true,
        customer: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }
}

export const merchantRepository = new MerchantRepository();
export default merchantRepository;

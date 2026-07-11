import { BaseRepository } from '../../common/repositories/base.repository';
import { Order, OrderItem, Payment, Transaction, OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderRepository extends BaseRepository {
  /**
   * Creates an order (supports transaction client).
   */
  public async createOrder(data: any, tx?: any): Promise<Order> {
    const client = tx || this.db;
    return client.order.create({
      data,
      include: {
        items: true,
        store: true,
      },
    });
  }

  /**
   * Creates order items in batch (supports transaction client).
   */
  public async createOrderItems(items: any[], tx?: any): Promise<any> {
    const client = tx || this.db;
    return client.orderItem.createMany({ data: items });
  }

  /**
   * Fetches an order by ID including details.
   */
  public async findOrderById(id: string): Promise<any | null> {
    return this.db.order.findUnique({
      where: { id },
      include: {
        items: true,
        store: true,
        customer: true,
        payment: true,
        deliveryAddress: true,
        deliveryAssignment: {
          include: {
            rider: true,
          },
        },
      },
    });
  }

  /**
   * Fetches order history for a customer.
   */
  public async findOrdersByCustomerId(customerId: string, limit = 20, skip = 0): Promise<Order[]> {
    return this.db.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
      include: {
        items: true,
        store: true,
        payment: true,
      },
    });
  }

  /**
   * Updates order status and logs the event (supports transaction client).
   */
  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentStatus?: PaymentStatus,
    tx?: any
  ): Promise<Order> {
    const client = tx || this.db;
    return client.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(paymentStatus ? { paymentStatus } : {}),
      },
      include: {
        items: true,
        store: true,
      },
    });
  }

  /**
   * Reserves stock in inventory (locks and decrements quantity).
   */
  public async reserveInventory(
    storeId: string,
    productId: string,
    variantId: string | null,
    qty: number,
    tx?: any
  ): Promise<void> {
    const client = tx || this.db;

    // Decrement store inventory
    const inventory = await client.inventory.findFirst({
      where: {
        storeId,
        productId,
        variantId: variantId || null,
      },
    });

    if (!inventory || inventory.stockQty < qty) {
      throw new Error(`Insufficient inventory for product ${productId}`);
    }

    await client.inventory.update({
      where: { id: inventory.id },
      data: { stockQty: { decrement: qty } },
    });

    // Decrement variant stock
    if (variantId) {
      await client.productVariant.update({
        where: { id: variantId },
        data: { stock: { decrement: qty } },
      });
    }
  }

  /**
   * Releases/restores stock in inventory (increment quantity).
   */
  public async releaseInventory(
    storeId: string,
    productId: string,
    variantId: string | null,
    qty: number,
    tx?: any
  ): Promise<void> {
    const client = tx || this.db;

    const inventory = await client.inventory.findFirst({
      where: {
        storeId,
        productId,
        variantId: variantId || null,
      },
    });

    if (inventory) {
      await client.inventory.update({
        where: { id: inventory.id },
        data: { stockQty: { increment: qty } },
      });
    }

    if (variantId) {
      await client.productVariant.update({
        where: { id: variantId },
        data: { stock: { increment: qty } },
      });
    }
  }

  /**
   * Fetches user wallet (supports transaction client).
   */
  public async findWalletByCustomerId(customerId: string, tx?: any): Promise<any | null> {
    const client = tx || this.db;
    return client.wallet.findUnique({
      where: { customerId },
    });
  }

  /**
   * Creates or updates wallet balance (supports transaction client).
   */
  public async updateWalletBalance(
    walletId: string,
    amount: number,
    tx?: any
  ): Promise<any> {
    const client = tx || this.db;
    return client.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } },
    });
  }

  /**
   * Creates a wallet transaction (supports transaction client).
   */
  public async createWalletTransaction(
    data: { walletId: string; amount: number; type: any; description: string; reference?: string },
    tx?: any
  ): Promise<any> {
    const client = tx || this.db;
    return client.walletTransaction.create({ data });
  }

  /**
   * Creates payment records (supports transaction client).
   */
  public async createPayment(
    data: { orderId: string; gatewayOrderId?: string; amount: number; method: any; status: any },
    tx?: any
  ): Promise<Payment> {
    const client = tx || this.db;
    return client.payment.create({ data });
  }

  /**
   * Updates payment status.
   */
  public async updatePaymentStatus(
    paymentId: string,
    status: any,
    gatewayPaymentId?: string,
    tx?: any
  ): Promise<Payment> {
    const client = tx || this.db;
    return client.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(gatewayPaymentId ? { gatewayPaymentId } : {}),
      },
    });
  }

  /**
   * Creates audit/ledger records (supports transaction client).
   */
  public async createTransaction(
    data: { paymentId: string; amount: number; type: any; status: any; gatewayRef?: string },
    tx?: any
  ): Promise<Transaction> {
    const client = tx || this.db;
    return client.transaction.create({ data });
  }
}

export const orderRepository = new OrderRepository();
export default orderRepository;

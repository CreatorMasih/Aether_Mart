import { orderRepository } from './order.repository';
import { cartService } from '../cart/cart.service';
import { cartRepository } from '../cart/cart.repository';
import { authRepository } from '../auth/auth.repository';
import { orderEventEmitter, OrderEvent } from '../../common/events/order-event.emitter';
import getCache from '../../config/redis.config';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../../common/middlewares/errorHandler.middleware';
import { ErrorCodes } from '../../utils/response.util';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('OrderService');

export class OrderService {
  /**
   * Places an order (ACID Transaction with Inventory Reservation).
   */
  public async placeOrder(
    customerId: string,
    params: {
      addressId: string;
      paymentMethod: PaymentMethod;
      couponCode?: string;
      driverTip?: number;
      ecoPackaging?: boolean;
      deliveryInstruction?: string;
      items?: Array<{ productId: string; variantId?: string; quantity: number }>;
      idempotencyKey?: string;
    }
  ): Promise<any> {
    const driverTip = params.driverTip || 0;
    const ecoPackaging = params.ecoPackaging || false;

    // 1. Idempotency Check
    if (params.idempotencyKey) {
      const cacheKey = `idempotency:order:${customerId}:${params.idempotencyKey}`;
      const cachedResult = await getCache().get<string>(cacheKey);
      if (cachedResult) {
        log.info(`Duplicate order blocked via idempotency key: ${params.idempotencyKey}`);
        return JSON.parse(cachedResult);
      }
    }

    // 2. Resolve items (from parameter list or persistent cart)
    let orderItemsInput = params.items;
    let clearCartAfterPlacement = false;

    if (!orderItemsInput || orderItemsInput.length === 0) {
      const cart = await cartRepository.findCartByCustomerId(customerId);
      log.info(
        `[PlaceOrder Cart Resolution] customerId=${customerId}, cartId=${cart?.id}, storeId=${cart?.storeId}, itemCount=${cart?.items?.length || 0}`
      );
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestError('Cannot place order. Your cart is empty.', ErrorCodes.CART_EMPTY);
      }
      orderItemsInput = cart.items.map((i: any) => ({
        productId: i.productId,
        variantId: i.variantId || undefined,
        quantity: i.quantity,
      }));
      clearCartAfterPlacement = true;
    }

    const itemsToProcess = orderItemsInput!;

    // 3. Resolve address
    const address = await this.db.address.findUnique({
      where: { id: params.addressId },
    });
    if (!address || address.userId !== (await this.getUserId(customerId))) {
      throw new NotFoundError('Delivery Address');
    }

    // 4. Group items by storeId (Split Orders architecture support)
    const storeItemsMap: Record<string, typeof itemsToProcess> = {};
    for (const item of itemsToProcess) {
      const product = await catalogRepository.findProductById(item.productId);
      if (!product) throw new NotFoundError(`Product ${item.productId}`);
      
      const storeId = product.storeId;
      if (!storeItemsMap[storeId]) {
        storeItemsMap[storeId] = [];
      }
      storeItemsMap[storeId].push(item);
    }

    const storeIds = Object.keys(storeItemsMap);
    const splitOrdersCount = storeIds.length;

    // 5. Run checkout within a strict database transaction block (ACID)
    const result = await this.db.$transaction(async (tx) => {
      const createdOrders: any[] = [];
      let combinedTotal = 0;

      // Check user wallet if WALLET is selected
      let wallet: any = null;
      if (params.paymentMethod === PaymentMethod.WALLET) {
        wallet = await orderRepository.findWalletByCustomerId(customerId, tx);
        if (!wallet) {
          throw new BadRequestError('Wallet not initialized for this user.', ErrorCodes.WALLET_INSUFFICIENT_BALANCE);
        }
      }

      // Process orders for each store
      for (const [index, storeId] of storeIds.entries()) {
        const storeItems = storeItemsMap[storeId] || [];

        // Verify Store Operating hours & holiday status
        const store = await tx.store.findUnique({ where: { id: storeId } });
        if (!store) throw new NotFoundError('Store');

        if (store.isHoliday || !store.isOpen || store.isPaused) {
          throw new BadRequestError(
            `Store '${store.name}' is currently closed or not accepting orders.`,
            ErrorCodes.STORE_CLOSED
          );
        }

        if (process.env.NODE_ENV !== 'test') {
          const now = new Date();
          const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          if (currentTimeStr < store.openingTime || currentTimeStr > store.closingTime) {
            throw new BadRequestError(
              `Store '${store.name}' is currently closed. Operating hours: ${store.openingTime} to ${store.closingTime}.`,
              ErrorCodes.STORE_CLOSED
            );
          }
        }
        
        // Recalculate pricing for this suborder
        const pricing = await cartService.recalculateCartPricing(
          customerId,
          storeItems,
          params.couponCode,
          splitOrdersCount === 1 ? driverTip : 0, // apply driver tip only once if split
          ecoPackaging,
          address.latitude,
          address.longitude
        );

        combinedTotal += pricing.totalAmount;

        // Generate unique order number
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
        const orderNumber = `ORD-${dateStr}-${randomStr}-${index + 1}`;

        // 6. Inventory Reservation
        for (const item of storeItems) {
          await orderRepository.reserveInventory(storeId, item.productId, item.variantId || null, item.quantity, tx);
        }

        // 7. Create Order Record
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            storeId,
            addressId: params.addressId,
            status: OrderStatus.PLACED,
            paymentMethod: params.paymentMethod,
            paymentStatus: params.paymentMethod === PaymentMethod.WALLET ? PaymentStatus.PAID : PaymentStatus.PENDING,
            subtotal: pricing.subtotal,
            tax: pricing.tax,
            deliveryFee: pricing.deliveryFee,
            handlingFee: pricing.handlingFee,
            discount: pricing.discount,
            totalAmount: pricing.totalAmount,
            driverTip: splitOrdersCount === 1 ? (params.driverTip || 0.0) : 0.0,
            couponId: pricing.coupon?.id || null,
            deliveryInstruction: params.deliveryInstruction || null,
          },
          include: {
            store: true,
          },
        });

        // 8. Create OrderItem Records
        const orderItemsData = pricing.items.map((i: any) => ({
          orderId: order.id,
          productId: i.productId,
          variantId: i.variantId,
          productName: i.name,
          quantity: i.quantity,
          unitPrice: i.price,
          variantLabel: i.variantName,
          imageUrl: i.imageUrl,
        }));

        await tx.orderItem.createMany({ data: orderItemsData });

        // Create Payment record
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: pricing.totalAmount,
            method: params.paymentMethod,
            status: params.paymentMethod === PaymentMethod.WALLET ? PaymentStatus.PAID : PaymentStatus.PENDING,
            gatewayOrderId: params.paymentMethod === PaymentMethod.RAZORPAY ? `rzp_order_${order.id}` : null,
          },
        });

        createdOrders.push({
          ...order,
          items: orderItemsData,
          payment: {
            id: payment.id,
            amount: payment.amount,
            method: payment.method,
            status: payment.status,
            gatewayOrderId: payment.gatewayOrderId,
          },
        });
      }

      // 9. Process Wallet deduction
      if (params.paymentMethod === PaymentMethod.WALLET) {
        if (wallet.balance < combinedTotal) {
          throw new BadRequestError(
            `Insufficient wallet balance. Total cost is Rs. ${combinedTotal}, but wallet balance is Rs. ${wallet.balance}.`,
            ErrorCodes.WALLET_INSUFFICIENT_BALANCE
          );
        }

        // Deduct
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: combinedTotal } },
        });

        // Create wallet transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: combinedTotal,
            type: 'DEBIT',
            description: `Payment for Order ${createdOrders.map(o => o.orderNumber).join(', ')}`,
          },
        });
      }

      return createdOrders;
    }, { maxWait: 15000, timeout: 15000 });

    // 10. Clear Customer Cart if checking out from DB cart
    if (clearCartAfterPlacement) {
      await cartService.clearCart(customerId);
    }

    // 11. Emit Domain Events
    for (const order of result) {
      orderEventEmitter.emitEvent(OrderEvent.PLACED, { order });
      if (params.paymentMethod === PaymentMethod.WALLET) {
        orderEventEmitter.emitEvent(OrderEvent.PAYMENT_SUCCESS, { order });
        // Award loyalty points (5% of subtotal) on instant payment
        await this.rewardLoyaltyPoints(customerId, order.id, order.subtotal);
      }
    }

    // Cache the result for idempotency (expires in 10 seconds)
    if (params.idempotencyKey) {
      const cacheKey = `idempotency:order:${customerId}:${params.idempotencyKey}`;
      await getCache().set(cacheKey, JSON.stringify(result), 10);
    }

    return result;
  }

  /**
   * Confirms Razorpay Online Payment Callback (Idempotent).
   */
  public async confirmPayment(
    paymentId: string,
    status: 'SUCCESS' | 'FAILED',
    gatewayPaymentId?: string
  ): Promise<any> {
    const payment = await this.db.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true, store: true } } },
    });

    if (!payment) throw new NotFoundError('Payment record');

    // Idempotency check: if payment status matches requested status, return existing order cleanly
    if (payment.status === PaymentStatus.PAID && status === 'SUCCESS') {
      const order = await this.db.order.findUnique({
        where: { id: payment.orderId },
        include: { store: true, items: true, deliveryAddress: true },
      });
      return { order, payment };
    }
    if (payment.status === PaymentStatus.FAILED && status === 'FAILED') {
      const order = await this.db.order.findUnique({
        where: { id: payment.orderId },
        include: { store: true, items: true, deliveryAddress: true },
      });
      return { order, payment };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestError('Payment has already been processed.', ErrorCodes.BAD_REQUEST);
    }

    const result = await this.db.$transaction(async (tx) => {
      if (status === 'SUCCESS') {
        // Update payment status
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.PAID,
            gatewayPaymentId: gatewayPaymentId || `pay_success_${payment.id}`,
          },
        });

        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: PaymentStatus.PAID },
          include: { store: true, items: true, deliveryAddress: true },
        });

        return { order: updatedOrder, payment: updatedPayment };
      } else {
        // Payment failed -> cancel order and release inventory
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: { status: PaymentStatus.FAILED },
        });

        const updatedOrder = await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.CANCELLED, paymentStatus: PaymentStatus.FAILED },
          include: { store: true, items: true, deliveryAddress: true },
        });

        // Release inventory atomically
        for (const item of payment.order.items) {
          await orderRepository.releaseInventory(
            payment.order.storeId,
            item.productId,
            item.variantId,
            item.quantity,
            tx
          );
        }

        return { order: updatedOrder, payment: updatedPayment };
      }
    }, { maxWait: 15000, timeout: 15000 });

    // Emit Events
    if (status === 'SUCCESS') {
      orderEventEmitter.emitEvent(OrderEvent.PAYMENT_SUCCESS, { order: result.order });
      await this.rewardLoyaltyPoints(result.order.customerId, result.order.id, result.order.subtotal);
    }

    return result;
  }

  /**
   * Retries payment for an existing pending or failed order.
   * Atomically re-verifies inventory and resets status to PENDING without creating a duplicate order.
   */
  public async retryPayment(customerId: string, orderId: string): Promise<any> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true, store: true },
    });

    if (!order || order.customerId !== customerId) {
      throw new NotFoundError('Order');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestError('This order has already been paid for.', ErrorCodes.BAD_REQUEST);
    }

    return this.db.$transaction(async (tx) => {
      // If order was cancelled due to previous payment failure, re-verify and re-reserve stock
      if (order.status === OrderStatus.CANCELLED) {
        if (order.store.isHoliday || !order.store.isOpen) {
          throw new BadRequestError(
            `Store '${order.store.name}' is currently unavailable for order retry.`,
            ErrorCodes.STORE_CLOSED
          );
        }
        for (const item of order.items) {
          await orderRepository.reserveInventory(
            order.storeId,
            item.productId,
            item.variantId || null,
            item.quantity,
            tx
          );
        }
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PLACED, paymentStatus: PaymentStatus.PENDING },
        include: { store: true, items: true, deliveryAddress: true },
      });

      let updatedPayment = order.payment;
      if (order.payment) {
        updatedPayment = await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: PaymentStatus.PENDING },
        });
      } else {
        updatedPayment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: order.totalAmount,
            method: order.paymentMethod,
            status: PaymentStatus.PENDING,
            gatewayOrderId: `rzp_test_order_${order.id}`,
          },
        });
      }

      return { order: updatedOrder, payment: updatedPayment };
    });
  }

  /**
   * Updates Order Status (placed -> packing -> delivered, etc.).
   */
  public async updateOrderStatus(
    orderId: string,
    status: OrderStatus
  ): Promise<Order> {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new NotFoundError('Order');

    // Prevent transitioning final states
    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError(`Cannot transition order from final state: ${order.status}`, ErrorCodes.BAD_REQUEST);
    }

    const updated = await this.db.$transaction(async (tx) => {
      let paymentStatus = order.paymentStatus;
      
      // If payment status was pending and order is delivered, COD order becomes PAID
      if (status === OrderStatus.DELIVERED && order.paymentMethod === PaymentMethod.COD) {
        paymentStatus = PaymentStatus.PAID;
        await tx.payment.updateMany({
          where: { orderId },
          data: { status: PaymentStatus.PAID },
        });
      }

      // If transition is CANCELLED:
      if (status === OrderStatus.CANCELLED) {
        // Release stock
        for (const item of order.items) {
          await orderRepository.releaseInventory(order.storeId, item.productId, item.variantId, item.quantity, tx);
        }

        // Process refund if paymentStatus is PAID
        if (order.paymentStatus === PaymentStatus.PAID) {
          paymentStatus = PaymentStatus.REFUNDED;
          
          await tx.payment.updateMany({
            where: { orderId },
            data: { status: PaymentStatus.REFUNDED },
          });

          // Refund to wallet
          const wallet = await orderRepository.findWalletByCustomerId(order.customerId, tx);
          if (wallet) {
            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: order.totalAmount } },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                amount: order.totalAmount,
                type: 'CREDIT',
                description: `Refund for Cancelled Order ${order.orderNumber}`,
              },
            });
          }
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status, paymentStatus },
        include: { store: true, items: true },
      });
    }, { maxWait: 15000, timeout: 15000 });

    // Emit event matching transition
    let eventName = OrderEvent.CONFIRMED;
    if (status === OrderStatus.CONFIRMED) eventName = OrderEvent.CONFIRMED;
    else if (status === OrderStatus.PACKING) eventName = OrderEvent.PACKING;
    else if (status === OrderStatus.READY_FOR_PICKUP) eventName = OrderEvent.READY_FOR_PICKUP;
    else if (status === OrderStatus.OUT_FOR_DELIVERY) eventName = OrderEvent.OUT_FOR_DELIVERY;
    else if (status === OrderStatus.DELIVERED) eventName = OrderEvent.DELIVERED;
    else if (status === OrderStatus.CANCELLED) eventName = OrderEvent.CANCELLED;

    orderEventEmitter.emitEvent(eventName, { order: updated });

    if (status === OrderStatus.DELIVERED && order.paymentMethod === PaymentMethod.COD) {
      // Award loyalty points for COD orders upon delivery confirmation
      await this.rewardLoyaltyPoints(order.customerId, order.id, order.subtotal);
    }

    return updated;
  }

  /**
   * Processes a refund request.
   */
  public async requestRefund(
    orderId: string,
    customerId: string,
    reason: string
  ): Promise<Order> {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (order.customerId !== customerId) throw new BadRequestError('Unauthorized', ErrorCodes.UNAUTHORIZED);

    if (order.status !== OrderStatus.DELIVERED || order.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestError('Refunds can only be requested on paid and delivered orders.', ErrorCodes.BAD_REQUEST);
    }

    const updated = await this.db.$transaction(async (tx) => {
      // Mark refunded
      const orderRef = await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: PaymentStatus.REFUNDED },
        include: { store: true, items: true },
      });

      await tx.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.REFUNDED },
      });

      // Credit wallet
      const wallet = await orderRepository.findWalletByCustomerId(customerId, tx);
      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: order.totalAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: order.totalAmount,
            type: 'CREDIT',
            description: `Refund for Order ${order.orderNumber}. Reason: ${reason}`,
          },
        });
      }

      return orderRef;
    }, { maxWait: 15000, timeout: 15000 });

    return updated;
  }

  /**
   * Helper to reward loyalty points (5% of order subtotal).
   */
  private async rewardLoyaltyPoints(customerId: string, orderId: string, subtotal: number): Promise<void> {
    try {
      const pointsEarned = Math.floor(subtotal * 0.05); // 5% point rewards
      if (pointsEarned <= 0) return;

      await this.db.$transaction(async (tx) => {
        const wallet = await orderRepository.findWalletByCustomerId(customerId, tx);
        if (wallet) {
          // Increment customer points in DB profile
          await tx.customer.update({
            where: { id: customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });

          // Credit cashback balance equivalent to points (1 point = 1 rupee cashback)
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: pointsEarned } },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: pointsEarned,
              type: 'CREDIT',
              description: `Loyalty points cashback reward for Order ID: ${orderId}`,
            },
          });
        }
      }, { maxWait: 15000, timeout: 15000 });

      log.info(`Awarded ${pointsEarned} loyalty points to customer ${customerId}`);
    } catch (error: any) {
      log.error(`Loyalty points reward error: ${error.message}`);
    }
  }

  // ─── Private Helper Routines ────────────────────────────────────────────────

  private async getUserId(customerId: string): Promise<string> {
    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundError('Customer');
    return customer.userId;
  }

  private get db() {
    return orderRepository.prisma;
  }
}

// Helper mock import for catalogRepository reference within service
import catalogRepository from '../catalog/catalog.repository';

export const orderService = new OrderService();
export default orderService;

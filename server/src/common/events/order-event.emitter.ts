import { EventEmitter } from 'events';
import { Order, OrderStatus } from '@prisma/client';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('OrderEventEmitter');

export enum OrderEvent {
  PLACED = 'order.placed',
  CONFIRMED = 'order.confirmed',
  PACKING = 'order.packing',
  READY_FOR_PICKUP = 'order.ready_for_pickup',
  OUT_FOR_DELIVERY = 'order.out_for_delivery',
  DELIVERED = 'order.delivered',
  CANCELLED = 'order.cancelled',
  PAYMENT_SUCCESS = 'order.payment.success',
  PAYMENT_FAILED = 'order.payment.failed',
}

class OrderEventEmitter extends EventEmitter {
  /**
   * Dispatches a domain event.
   */
  public emitEvent(event: OrderEvent, data: { order: any; extra?: any }): void {
    log.info(`Dispatching event: ${event} for order ${data.order.orderNumber}`);
    this.emit(event, data);
  }
}

export const orderEventEmitter = new OrderEventEmitter();
export default orderEventEmitter;

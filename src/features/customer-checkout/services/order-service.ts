import { BaseRepository } from '../../../core/network/base-repository';
import { mapOrderDto, mapOrderListDto } from './cart-mappers';
import type { OrderData, PaymentMethod } from '../../../types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PlaceOrderParams {
  addressId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  driverTip?: number;
  ecoPackaging?: boolean;
  deliveryInstruction?: string;
}

export class OrderService extends BaseRepository {
  /**
   * Places a new order.
   * The backend reads items from the persistent cart if no `items` array is provided.
   * Idempotency key prevents duplicate orders on double-click or retry.
   */
  public async placeOrder(
    params: PlaceOrderParams,
    idempotencyKey: string,
  ): Promise<OrderData[]> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown[]>>(
        '/customer/orders',
        params,
        { headers: { 'X-Idempotency-Key': idempotencyKey } },
      );
      const raw = response.data.data ?? [];
      return Array.isArray(raw)
        ? mapOrderListDto(raw)
        : [mapOrderDto(raw as Parameters<typeof mapOrderDto>[0])];
    });
  }

  /**
   * Fetches paginated order history for the authenticated customer.
   */
  public async getOrderHistory(page = 1, limit = 20): Promise<OrderData[]> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<unknown[]>>(
        '/customer/orders',
        { params: { page, limit } },
      );
      return mapOrderListDto(response.data.data ?? []);
    });
  }

  /**
   * Fetches details of a single order.
   */
  public async getOrderById(id: string): Promise<OrderData> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<unknown>>(
        `/customer/orders/${id}`,
      );
      return mapOrderDto(response.data.data as Parameters<typeof mapOrderDto>[0]);
    });
  }

  /**
   * Cancels a PLACED or CONFIRMED order.
   */
  public async cancelOrder(orderId: string, reason?: string): Promise<OrderData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown>>(
        `/customer/orders/${orderId}/cancel`,
        { reason },
      );
      return mapOrderDto(response.data.data as Parameters<typeof mapOrderDto>[0]);
    });
  }

  /**
   * Initiates a refund request for a delivered order.
   */
  public async requestRefund(orderId: string, reason: string): Promise<OrderData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown>>(
        `/customer/orders/${orderId}/refund`,
        { reason },
      );
      return mapOrderDto(response.data.data as Parameters<typeof mapOrderDto>[0]);
    });
  }

  /**
   * Confirms Razorpay payment status (Idempotent).
   */
  public async confirmPayment(
    paymentId: string,
    status: 'SUCCESS' | 'FAILED',
    razorpayPaymentId?: string,
  ): Promise<OrderData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<any>>(
        '/customer/orders/confirm-payment',
        { paymentId, status, razorpayPaymentId },
      );
      const data = response.data.data;
      const orderObj = data?.order || data;
      return mapOrderDto(orderObj as Parameters<typeof mapOrderDto>[0]);
    });
  }

  /**
   * Retries payment for a pending or failed order.
   */
  public async retryPayment(orderId: string): Promise<{ order: OrderData; payment: any }> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<{ order: unknown; payment: unknown }>>(
        `/customer/orders/${orderId}/retry-payment`,
      );
      const raw = response.data.data;
      return {
        order: mapOrderDto(raw.order as Parameters<typeof mapOrderDto>[0]),
        payment: raw.payment,
      };
    });
  }
  /**
   * Fetches the customer's wallet details.
   */
  public async getWallet(): Promise<{ id?: string; balance: number }> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<{ id?: string; balance: number }>>(
        '/customer/wallet',
      );
      return response.data.data ?? { balance: 0.0 };
    });
  }
}

export const orderService = new OrderService();
export default orderService;

import { BaseRepository } from '../../../core/network/base-repository';
import { mapCartDto, mapPricingDto, mapCouponDto } from './cart-mappers';
import type { CartData, PricingData, CouponValidation, PaymentMethod } from '../../../types';

// ─── Backend envelope ─────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Recalculate params ───────────────────────────────────────────────────────

export interface RecalculateParams {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
  driverTip?: number;
  ecoPackaging?: boolean;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
}

// ─── Place Order params ───────────────────────────────────────────────────────

export interface PlaceOrderParams {
  addressId: string;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  driverTip?: number;
  ecoPackaging?: boolean;
  deliveryInstruction?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CartService extends BaseRepository {
  /** Fetches the authenticated customer's server-side cart */
  public async getCart(): Promise<CartData> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<unknown>>('/cart');
      return mapCartDto(response.data.data as Parameters<typeof mapCartDto>[0]);
    });
  }

  /**
   * Adds a product to the backend cart.
   * Returns the updated full cart.
   */
  public async addItem(
    productId: string,
    variantId?: string,
    quantity = 1,
  ): Promise<CartData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown>>('/cart/add', {
        productId,
        variantId: variantId ?? undefined,
        quantity,
      });
      return mapCartDto(response.data.data as Parameters<typeof mapCartDto>[0]);
    });
  }

  /**
   * Updates quantity for an existing cart item.
   * Setting quantity to 0 removes the item.
   */
  public async updateItem(
    productId: string,
    quantity: number,
    variantId?: string,
  ): Promise<CartData> {
    return this.executeRequest(async () => {
      const response = await this.client.put<ApiEnvelope<unknown>>('/cart/update', {
        productId,
        variantId: variantId ?? undefined,
        quantity,
      });
      return mapCartDto(response.data.data as Parameters<typeof mapCartDto>[0]);
    });
  }

  /**
   * Removes an item completely from the cart.
   */
  public async removeItem(productId: string, variantId?: string): Promise<CartData> {
    return this.executeRequest(async () => {
      const params = variantId ? `?variantId=${variantId}` : '';
      const response = await this.client.delete<ApiEnvelope<unknown>>(
        `/cart/remove/${productId}${params}`,
      );
      return mapCartDto(response.data.data as Parameters<typeof mapCartDto>[0]);
    });
  }

  /**
   * Clears all items from the cart.
   */
  public async clearCart(): Promise<CartData> {
    return this.executeRequest(async () => {
      const response = await this.client.delete<ApiEnvelope<unknown>>('/cart/clear');
      return mapCartDto(response.data.data as Parameters<typeof mapCartDto>[0]);
    });
  }

  /**
   * Recalculates cart pricing with optional coupon, tip, eco packaging,
   * and delivery coordinates for dynamic distance-based delivery fees.
   * This is the source of truth for all checkout totals.
   */
  public async recalculate(params: RecalculateParams): Promise<PricingData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown>>(
        '/cart/recalculate',
        params,
      );
      return mapPricingDto(response.data.data as Parameters<typeof mapPricingDto>[0]);
    });
  }

  /**
   * Validates a coupon code against the backend.
   * Backend is the sole source of truth for coupon eligibility.
   */
  public async validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown>>(
        '/cart/coupon/validate',
        { code, subtotal },
      );
      return mapCouponDto(response.data.data as Parameters<typeof mapCouponDto>[0]);
    });
  }
}

export const cartService = new CartService();
export default cartService;

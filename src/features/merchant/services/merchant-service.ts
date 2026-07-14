import { BaseRepository } from '../../../core/network/base-repository';
import type { MerchantDashboardStats, PayoutData, OrderData, Product } from '../../../types';
import { mapOrderListDto, mapOrderDto } from '../../customer-checkout/services/cart-mappers';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export class MerchantService extends BaseRepository {
  /**
   * Fetches dashboard statistics and analytics for the merchant's store.
   */
  public async getDashboardStats(): Promise<MerchantDashboardStats> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<MerchantDashboardStats>>(
        '/merchant/dashboard'
      );
      return response.data.data;
    });
  }

  /**
   * Fetches payouts ledger logs for the merchant.
   */
  public async getPayouts(): Promise<PayoutData[]> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<PayoutData[]>>(
        '/merchant/payouts'
      );
      return response.data.data;
    });
  }

  /**
   * Fetches all orders belonging to the merchant's storefront.
   */
  public async getStoreOrders(): Promise<OrderData[]> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<unknown[]>>(
        '/merchant/orders'
      );
      return mapOrderListDto(response.data.data ?? []);
    });
  }

  /**
   * Updates merchant profile details and storefront settings.
   */
  public async updateProfile(params: {
    fullName?: string;
    storeName?: string;
    storeAddress?: string;
    deliveryRadiusKm?: number;
    openingTime?: string;
    closingTime?: string;
    isHoliday?: boolean;
    bankAccount?: string;
    bankName?: string;
    minimumOrderValue?: number;
    deliveryFee?: number;
  }): Promise<{ merchant: any; store: any }> {
    return this.executeRequest(async () => {
      const response = await this.client.put<ApiEnvelope<{ merchant: any; store: any }>>(
        '/merchant/profile',
        params
      );
      return response.data.data;
    });
  }

  /**
   * Updates an order status (Accept, Start Packing, Finish Packing, Cancel).
   */
  public async updateOrderStatus(orderId: string, status: string): Promise<OrderData> {
    return this.executeRequest(async () => {
      const response = await this.client.put<ApiEnvelope<unknown>>(
        `/customer/orders/${orderId}/status`,
        { status }
      );
      return mapOrderDto(response.data.data as Parameters<typeof mapOrderDto>[0]);
    });
  }

  /**
   * Creates a catalog product with its variants.
   */
  public async createProduct(params: {
    name: string;
    description?: string;
    brand?: string;
    isVeg?: boolean;
    isOrganic?: boolean;
    categoryId: string;
    weightGrams?: number;
    images?: Array<{ url: string; isPrimary?: boolean }>;
    variants: Array<{ name: string; price: number; sku: string; stock: number }>;
  }): Promise<Product> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<Product>>(
        '/merchant/products',
        params
      );
      return response.data.data;
    });
  }

  /**
   * Updates a product and its variants.
   */
  public async updateProduct(
    id: string,
    params: {
      name?: string;
      description?: string;
      brand?: string;
      isVeg?: boolean;
      isOrganic?: boolean;
      categoryId?: string;
      weightGrams?: number;
      images?: Array<{ url: string; isPrimary?: boolean }>;
      variants?: Array<{ id?: string; name?: string; price?: number; sku?: string; stock?: number }>;
    }
  ): Promise<Product> {
    return this.executeRequest(async () => {
      const response = await this.client.put<ApiEnvelope<Product>>(
        `/merchant/products/${id}`,
        params
      );
      return response.data.data;
    });
  }

  /**
   * Deletes a catalog product.
   */
  public async deleteProduct(id: string): Promise<boolean> {
    return this.executeRequest(async () => {
      const response = await this.client.delete<ApiEnvelope<{ success: boolean }>>(
        `/merchant/products/${id}`
      );
      return response.data.data.success;
    });
  }
}

export const merchantService = new MerchantService();
export default merchantService;

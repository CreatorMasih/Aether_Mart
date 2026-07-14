import { BaseRepository } from '../../../core/network/base-repository';
import { API_ENDPOINTS } from '../../../core/config/constants';
import type { Category, Store, ReviewRating } from '../../../types';
import {
  mapProductDto,
  mapCategoryDto,
  mapBannerDto,
  mapStoreDto,
  mapReviewDto,
} from './catalog-mappers';
import type { CatalogProduct, Banner } from './catalog-mappers';

// ─── Response envelope types ──────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ProductsPageDto {
  products: unknown[];
  total: number;
  page: number;
  pages: number;
}

interface HomeFeedDto {
  banners?: unknown[];
  flashDeals?: Array<{
    id?: string;
    label?: string;
    value?: string;
    startsAt?: string;
    endsAt?: string;
    product?: unknown;
  }>;
  nearbyStores?: unknown[];
  wishlistPicks?: unknown[];
  recentViews?: unknown[];
  continueShopping?: unknown[];
  recommendedProducts?: unknown[];
  seasonalOffers?: Array<{
    id?: string;
    title?: string;
    value?: string;
    imageUrl?: string;
  }>;
}

// ─── Public response models ───────────────────────────────────────────────────

export interface HomeFeedData {
  banners: Banner[];
  flashDeals: Array<{
    id: string;
    label: string;
    value: string;
    startsAt: string;
    endsAt: string;
    product: CatalogProduct;
  }>;
  nearbyStores: Store[];
  wishlistPicks: CatalogProduct[];
  recentViews: CatalogProduct[];
  continueShopping: CatalogProduct[];
  recommendedProducts: CatalogProduct[];
  seasonalOffers: Array<{
    id: string;
    title: string;
    value: string;
    imageUrl: string;
  }>;
}

export interface ProductsResponse {
  products: CatalogProduct[];
  total: number;
  page: number;
  pages: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class CatalogService extends BaseRepository {
  /** Fetches aggregated dashboard feed elements */
  public async getHomeFeed(lat?: number, lng?: number): Promise<HomeFeedData> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<HomeFeedDto>>(
        '/customer/home',
        { params: { latitude: lat, longitude: lng } },
      );
      const feed = response.data.data ?? {};

      return {
        banners: (feed.banners ?? []).map((b, idx) =>
          mapBannerDto(b as Parameters<typeof mapBannerDto>[0], idx),
        ),
        flashDeals: (feed.flashDeals ?? []).map((fd) => ({
          id: fd.id ?? '',
          label: fd.label ?? '',
          value: fd.value ?? '',
          startsAt: fd.startsAt ?? '',
          endsAt: fd.endsAt ?? '',
          product: mapProductDto(
            (fd.product ?? {}) as Parameters<typeof mapProductDto>[0],
          ),
        })),
        nearbyStores: (feed.nearbyStores ?? []).map((s) =>
          mapStoreDto(s as Parameters<typeof mapStoreDto>[0]),
        ),
        wishlistPicks: (feed.wishlistPicks ?? []).map((p) =>
          mapProductDto(p as Parameters<typeof mapProductDto>[0]),
        ),
        recentViews: (feed.recentViews ?? []).map((p) =>
          mapProductDto(p as Parameters<typeof mapProductDto>[0]),
        ),
        continueShopping: (feed.continueShopping ?? []).map((p) =>
          mapProductDto(p as Parameters<typeof mapProductDto>[0]),
        ),
        recommendedProducts: (feed.recommendedProducts ?? []).map((p) =>
          mapProductDto(p as Parameters<typeof mapProductDto>[0]),
        ),
        seasonalOffers: (feed.seasonalOffers ?? []).map((o) => ({
          id: o.id ?? '',
          title: o.title ?? '',
          value: o.value ?? '',
          imageUrl: o.imageUrl ?? '',
        })),
      };
    });
  }

  /** Returns list of category hierarchy nodes */
  public async getCategories(): Promise<Category[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown[]>>(
          API_ENDPOINTS.customer.categories,
        );
      return (response.data.data ?? []).map((c) =>
        mapCategoryDto(c as Parameters<typeof mapCategoryDto>[0]),
      );
    });
  }

  /** Returns paginated matching catalog items */
  public async getProducts(
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<ProductsResponse> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<ProductsPageDto>>(
          API_ENDPOINTS.customer.products,
          { params },
        );
      const result = response.data.data ?? {
        products: [],
        total: 0,
        page: 1,
        pages: 1,
      };
      return {
        products: (result.products ?? []).map((p) =>
          mapProductDto(p as Parameters<typeof mapProductDto>[0]),
        ),
        total: result.total ?? 0,
        page: result.page ?? 1,
        pages: result.pages ?? 1,
      };
    });
  }

  /** Returns full details for a single product */
  public async getProductById(id: string): Promise<CatalogProduct> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown>>(
          `/customer/products/${id}`,
        );
      return mapProductDto(
        response.data.data as Parameters<typeof mapProductDto>[0],
      );
    });
  }

  /** Returns similar recommended catalog items */
  public async getRelatedProducts(id: string): Promise<CatalogProduct[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown[]>>(
          `/customer/products/${id}/related`,
        );
      return (response.data.data ?? []).map((p) =>
        mapProductDto(p as Parameters<typeof mapProductDto>[0]),
      );
    });
  }

  /** Returns frequently bundled companion items */
  public async getFrequentlyBoughtTogether(
    id: string,
  ): Promise<CatalogProduct[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown[]>>(
          `/customer/products/${id}/frequently-bought-together`,
        );
      return (response.data.data ?? []).map((p) =>
        mapProductDto(p as Parameters<typeof mapProductDto>[0]),
      );
    });
  }

  /** Returns reviews written for a product */
  public async getProductReviews(
    id: string,
    page = 1,
    limit = 10,
  ): Promise<ReviewRating[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown[]>>(
          `/customer/products/${id}/reviews`,
          { params: { page, limit } },
        );
      return (response.data.data ?? []).map((r) =>
        mapReviewDto(r as Parameters<typeof mapReviewDto>[0]),
      );
    });
  }

  /** Autocomplete search suggestions matching a query prefix */
  public async getSearchSuggestions(query: string): Promise<string[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<string[]>>(
          '/customer/search/suggestions',
          { params: { q: query } },
        );
      return response.data.data ?? [];
    });
  }

  /** Returns the authenticated customer's wishlist */
  public async getWishlist(): Promise<CatalogProduct[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown[]>>('/customer/wishlist');
      return (response.data.data ?? []).map((p) =>
        mapProductDto(p as Parameters<typeof mapProductDto>[0]),
      );
    });
  }

  /** Adds a product to the wishlist */
  public async addToWishlist(productId: string): Promise<boolean> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<unknown>>(
        '/customer/wishlist',
        { productId },
      );
      return response.data.success;
    });
  }

  /** Removes a product from the wishlist */
  public async removeFromWishlist(productId: string): Promise<boolean> {
    return this.executeRequest(async () => {
      const response = await this.client.delete<ApiEnvelope<unknown>>(
        `/customer/wishlist/${productId}`,
      );
      return response.data.success;
    });
  }

  /** Returns recently viewed products for the authenticated customer */
  public async getRecentViews(): Promise<CatalogProduct[]> {
    return this.executeRequest(async () => {
      const response =
        await this.client.get<ApiEnvelope<unknown[]>>(
          '/customer/recently-viewed',
        );
      return (response.data.data ?? []).map((p) =>
        mapProductDto(p as Parameters<typeof mapProductDto>[0]),
      );
    });
  }
}

export const catalogService = new CatalogService();
export default catalogService;

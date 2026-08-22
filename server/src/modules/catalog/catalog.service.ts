import { catalogRepository } from './catalog.repository';
import { haversineDistance } from '../../utils/geo.util';
import { Product, Category, Store } from '@prisma/client';
import { NotFoundError } from '../../common/middlewares/errorHandler.middleware';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('CatalogService');

export class CatalogService {
  /**
   * Returns categories with child hierarchies.
   */
  public async getCategories(): Promise<Category[]> {
    return catalogRepository.findCategories(true);
  }

  /**
   * Fetches and formats products matching all search criteria.
   */
  public async getProducts(query: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    discount?: boolean;
    organic?: boolean;
    vegetarian?: boolean;
    inStock?: boolean;
    storeId?: string;
    latitude?: number;
    longitude?: number;
    maxDistanceKm?: number;
    sort?: string;
  }): Promise<{ products: any[]; total: number; page: number; pages: number }> {
    const where: any = { isActive: true };

    // 1. Text Search (Full-text contains)
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { brand: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // 2. Category filtering (slug or id)
    if (query.category) {
      where.category = {
        OR: [
          { slug: query.category },
          { id: query.category },
        ],
      };
    }

    // 3. Brand
    if (query.brand) {
      where.brand = { equals: query.brand, mode: 'insensitive' };
    }

    // 4. Price range
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    // 5. Attributes
    if (query.discount) {
      where.discountPrice = { not: null };
    }
    if (query.organic) {
      where.isOrganic = true;
    }
    if (query.vegetarian !== undefined) {
      where.isVegetarian = query.vegetarian;
    }

    // 6. Geolocation distance filtering via stores
    if (query.latitude !== undefined && query.longitude !== undefined) {
      const stores = await catalogRepository.findStores(true);
      let nearbyStoreIds = stores
        .filter((store) => {
          const dist = haversineDistance(
            { latitude: query.latitude!, longitude: query.longitude! },
            { latitude: store.latitude, longitude: store.longitude }
          );
          return dist <= Math.max(query.maxDistanceKm || 10, store.deliveryRadiusKm || 10) && !store.isPaused && !store.isHoliday;
        })
        .map((store) => store.id);

      if (nearbyStoreIds.length === 0 && stores.length > 0) {
        nearbyStoreIds = stores.map((s) => s.id);
      }

      if (query.storeId) {
        where.storeId = query.storeId;
      } else if (nearbyStoreIds.length > 0) {
        where.storeId = { in: nearbyStoreIds };
      }
    } else if (query.storeId) {
      where.storeId = query.storeId;
    }

    // 7. Dynamic Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (query.sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (query.sort === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (query.sort === 'discount') {
      orderBy = { discountPrice: 'asc' };
    }

    // 8. Pagination Math
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [products, total] = await Promise.all([
      catalogRepository.findProducts({ where, orderBy, skip, take }),
      catalogRepository.countProducts(where),
    ]);

    // 9. Format outputs to match frontend model keys
    const formattedProducts = products.map((prod) => this.formatProduct(prod, query.latitude, query.longitude));

    return {
      products: formattedProducts,
      total,
      page: query.page,
      pages: Math.ceil(total / query.limit),
    };
  }

  /**
   * Fetches product details and records the view in history.
   */
  public async getProductById(id: string, customerId?: string): Promise<any> {
    const product = await catalogRepository.findProductById(id);
    if (!product) throw new NotFoundError('Product');

    if (customerId) {
      await catalogRepository.recordRecentView(customerId, id);
      await catalogRepository.pruneRecentViews(customerId, 10); // keep history size limited to 10
    }

    return this.formatProduct(product);
  }

  /**
   * Fetches products related to a target product.
   */
  public async getRelatedProducts(id: string, limit = 5): Promise<any[]> {
    const product = await catalogRepository.findProductById(id);
    if (!product) throw new NotFoundError('Product');

    const related = await catalogRepository.findRelatedProducts({
      productId: id,
      categoryId: product.categoryId,
      brand: product.brand || undefined,
      limit,
    });

    return related.map((p) => this.formatProduct(p));
  }

  /**
   * Fetches cross-sell suggestions.
   */
  public async getFrequentlyBoughtTogether(id: string, limit = 3): Promise<any[]> {
    const product = await catalogRepository.findProductById(id);
    if (!product) throw new NotFoundError('Product');

    // Simple placeholder algorithm: returns top selling/featured products in same category
    const suggestions = await catalogRepository.findRelatedProducts({
      productId: id,
      categoryId: product.categoryId,
      limit,
    });

    return suggestions.map((p) => this.formatProduct(p));
  }

  /**
   * Fetches reviews for a product.
   */
  public async getProductReviews(productId: string, limit = 10, offset = 0): Promise<any[]> {
    const reviews = await catalogRepository.findProductReviews(productId, limit, offset);
    return reviews.map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      images: r.images ? JSON.parse(r.images) : [],
      customerName: r.customer?.fullName || 'Anonymous User',
      createdAt: r.createdAt,
    }));
  }

  /**
   * Autocomplete search suggestions.
   */
  public async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const products = await catalogRepository.findProducts({
      where: {
        name: { contains: query, mode: 'insensitive' },
        isActive: true,
      },
      orderBy: { price: 'asc' },
      skip: 0,
      take: 8,
    });

    return Array.from(new Set(products.map((p) => p.name)));
  }

  /**
   * Fetches home feed widgets matching user coordinates.
   */
  public async getHomeFeed(customerId?: string, lat?: number, lng?: number): Promise<any> {
    const stores = await catalogRepository.findStores(true);

    // Filter/sort stores by distance if coordinates provided
    let nearbyStores = stores;
    if (lat !== undefined && lng !== undefined) {
      const mapped = stores.map((store) => {
        const distance = haversineDistance(
          { latitude: lat, longitude: lng },
          { latitude: store.latitude, longitude: store.longitude }
        );
        return {
          ...store,
          distance,
          estimatedDeliveryTime: (store.deliveryTimeMins || 15) + Math.ceil(distance * 3), // 3 mins per km
          available: !store.isPaused && !store.isHoliday,
        };
      });

      const filtered = mapped.filter((s) => s.available).sort((a, b) => a.distance - b.distance);
      nearbyStores = filtered.length > 0 ? filtered : mapped;
    }

    const [banners, flashDeals, topRated] = await Promise.all([
      catalogRepository.findBanners(),
      catalogRepository.findFlashDeals(6),
      catalogRepository.findTopRatedProducts(8),
    ]);

    let wishlistPicks: any[] = [];
    let recentViews: any[] = [];

    if (customerId) {
      const wishlist = await catalogRepository.findWishlist(customerId);
      wishlistPicks = wishlist.slice(0, 4).map((w) => this.formatProduct(w.product));

      const views = await catalogRepository.findRecentViews(customerId, 6);
      recentViews = views.map((v) => this.formatProduct(v.product));
    }

    return {
      banners: banners.map((b) => ({
        id: b.id,
        title: b.title,
        imageUrl: b.imageUrl,
        linkType: b.linkType,
        linkTarget: b.linkTarget,
      })),
      flashDeals: flashDeals.map((fd) => ({
        id: fd.id,
        label: fd.label,
        value: fd.value,
        startsAt: fd.startsAt,
        endsAt: fd.endsAt,
        product: this.formatProduct(fd.product!),
      })),
      nearbyStores: nearbyStores.map((s: any) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        category: s.category,
        logoUrl: s.logoUrl,
        coverImageUrl: s.coverImageUrl,
        rating: s.rating,
        distance: s.distance !== undefined ? parseFloat(s.distance.toFixed(1)) : undefined,
        deliveryTime: s.estimatedDeliveryTime || s.deliveryTimeMins,
        deliveryFee: s.deliveryFee,
        minOrderValue: s.minOrderValue,
        isOpen: s.isOpen,
        isPaused: s.isPaused,
        isHoliday: s.isHoliday,
        available: s.available,
      })),
      wishlistPicks,
      recentViews,
      continueShopping: recentViews.slice(0, 3),
      recommendedProducts: topRated.slice(0, 6).map((p) => this.formatProduct(p)),
      seasonalOffers: flashDeals.slice(0, 2).map((fd) => ({
        id: fd.id,
        title: fd.label,
        value: fd.value,
        imageUrl: fd.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      })),
    };
  }

  /**
   * Fetches single store details by ID.
   */
  public async getStoreById(storeId: string, lat?: number, lng?: number): Promise<any> {
    const store = await catalogRepository.findStoreById(storeId);
    if (!store) throw new NotFoundError('Store');

    let distance: number | undefined;
    if (lat !== undefined && lng !== undefined) {
      distance = haversineDistance(
        { latitude: lat, longitude: lng },
        { latitude: store.latitude, longitude: store.longitude }
      );
    }

    const available = (distance === undefined || distance <= store.deliveryRadiusKm) &&
      store.isOpen && !store.isPaused && !store.isHoliday;

    return {
      id: store.id,
      name: store.name,
      address: store.address,
      category: store.category,
      logoUrl: store.logoUrl,
      coverImageUrl: store.coverImageUrl,
      rating: store.rating,
      deliveryRadiusKm: store.deliveryRadiusKm,
      deliveryTimeMins: store.deliveryTimeMins,
      minOrderValue: store.minOrderValue,
      deliveryFee: store.deliveryFee,
      openingTime: store.openingTime,
      closingTime: store.closingTime,
      isOpen: store.isOpen,
      isPaused: store.isPaused,
      isHoliday: store.isHoliday,
      available,
      distance: distance !== undefined ? parseFloat(distance.toFixed(1)) : undefined,
    };
  }

  /**
   * Fetches customer's wishlist items.
   */
  public async getWishlist(customerId: string): Promise<any[]> {
    const list = await catalogRepository.findWishlist(customerId);
    return list.map((item) => this.formatProduct(item.product));
  }

  /**
   * Adds product to wishlist.
   */
  public async addToWishlist(customerId: string, productId: string): Promise<boolean> {
    const product = await catalogRepository.findProductById(productId);
    if (!product) throw new NotFoundError('Product');

    await catalogRepository.addToWishlist(customerId, productId);
    return true;
  }

  /**
   * Removes product from wishlist.
   */
  public async removeFromWishlist(customerId: string, productId: string): Promise<boolean> {
    await catalogRepository.removeFromWishlist(customerId, productId);
    return true;
  }

  /**
   * Fetches recently viewed history.
   */
  public async getRecentViews(customerId: string): Promise<any[]> {
    const list = await catalogRepository.findRecentViews(customerId, 10);
    return list.map((item) => this.formatProduct(item.product));
  }

  // ─── Formatting Helpers ──────────────────────────────────────────────────────

  private formatProduct(product: any, lat?: number, lng?: number): any {
    const primaryImage = product.images?.find((img: any) => img.isPrimary)?.url 
      || product.images?.[0]?.url 
      || 'https://images.unsplash.com/photo-1542838132-92c53300491e';

    const secondaryImages = product.images
      ?.filter((img: any) => !img.isPrimary)
      ?.map((img: any) => img.url) || [];

    // Calculate store distance if user coordinates provided
    let storeDistance: number | undefined;
    if (lat !== undefined && lng !== undefined && product.store) {
      storeDistance = haversineDistance(
        { latitude: lat, longitude: lng },
        { latitude: product.store.latitude, longitude: product.store.longitude }
      );
    }

    // Determine stock status based on variant quantities
    const totalStock = product.variants?.reduce((acc: number, curr: any) => acc + curr.stock, 0) || 0;

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      brand: product.brand || undefined,
      fssaiCode: product.store?.merchant?.fssaiNumber || undefined,
      price: product.price,
      discountPrice: product.discountPrice || undefined,
      unit: product.unit,
      weightGrams: product.weightGrams || undefined,
      isOrganic: product.isOrganic,
      isVegetarian: product.isVegetarian,
      nutrition: {
        calories: product.calories || undefined,
        protein: product.proteinGrams || undefined,
        carbs: product.carbGrams || undefined,
        fat: product.fatGrams || undefined,
      },
      imageUrl: primaryImage,
      gallery: [primaryImage, ...secondaryImages],
      store: product.store ? {
        id: product.store.id,
        name: product.store.name,
        rating: product.store.rating,
        deliveryTime: product.store.deliveryTimeMins,
        distance: storeDistance ? parseFloat(storeDistance.toFixed(1)) : undefined,
      } : undefined,
      variants: product.variants?.map((v: any) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        stock: v.stock,
        sku: v.sku,
      })) || [],
      inStock: totalStock > 0,
      totalStock,
    };
  }
}

export const catalogService = new CatalogService();
export default catalogService;

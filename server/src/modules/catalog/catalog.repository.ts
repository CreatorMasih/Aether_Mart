import { BaseRepository } from '../../common/repositories/base.repository';
import { Category, Product, Wishlist, RecentlyViewed, Banner, Offer, Store, Review } from '@prisma/client';

export class CatalogRepository extends BaseRepository {
  /**
   * Fetches all active categories with parent/child hierarchies.
   */
  public async findCategories(activeOnly = true): Promise<any[]> {
    return this.db.category.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { displayOrder: 'asc' },
      include: {
        subcategories: {
          where: activeOnly ? { isActive: true } : {},
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Fetches products matching filters, sorting, and pagination.
   */
  public async findProducts(params: {
    where: any;
    orderBy: any;
    skip: number;
    take: number;
  }): Promise<any[]> {
    return this.db.product.findMany({
      where: {
        ...params.where,
        deletedAt: null,
        store: {
          NOT: {
            name: {
              contains: 'Test Store',
            },
          },
        },
      },
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
        store: true,
        category: true,
        inventories: true,
      },
    });
  }

  /**
   * Counts total products matching filters.
   */
  public async countProducts(where: any): Promise<number> {
    return this.db.product.count({
      where: {
        ...where,
        deletedAt: null,
      },
    });
  }

  /**
   * Fetches details of a single product.
   */
  public async findProductById(id: string): Promise<any | null> {
    return this.db.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { displayOrder: 'asc' },
        },
        variants: {
          orderBy: { price: 'asc' },
        },
        store: true,
        category: true,
        inventories: true,
      },
    });
  }

  /**
   * Fetches related products.
   */
  public async findRelatedProducts(params: {
    productId: string;
    categoryId: string;
    brand?: string;
    limit: number;
  }): Promise<any[]> {
    return this.db.product.findMany({
      where: {
        id: { not: params.productId },
        isActive: true,
        deletedAt: null,
        OR: [
          { categoryId: params.categoryId },
          params.brand ? { brand: params.brand } : {},
        ],
      },
      take: params.limit,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: { orderBy: { price: 'asc' } },
        store: true,
      },
    });
  }

  /**
   * Fetches reviews for a product.
   */
  public async findProductReviews(productId: string, limit = 10, offset = 0): Promise<any[]> {
    return this.db.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        customer: true,
      },
    });
  }

  /**
   * Adds a product to user's wishlist.
   */
  public async addToWishlist(customerId: string, productId: string): Promise<Wishlist> {
    return this.db.wishlist.upsert({
      where: {
        customerId_productId: { customerId, productId },
      },
      create: { customerId, productId },
      update: {}, // no-op if exists
    });
  }

  /**
   * Removes a product from wishlist.
   */
  public async removeFromWishlist(customerId: string, productId: string): Promise<void> {
    await this.db.wishlist.deleteMany({
      where: { customerId, productId },
    });
  }

  /**
   * Fetches user's wishlist.
   */
  public async findWishlist(customerId: string): Promise<any[]> {
    return this.db.wishlist.findMany({
      where: { customerId },
      include: {
        product: {
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
            variants: { orderBy: { price: 'asc' } },
            store: true,
          },
        },
      },
    });
  }

  /**
   * Records a product view in history.
   */
  public async recordRecentView(customerId: string, productId: string): Promise<RecentlyViewed> {
    return this.db.recentlyViewed.upsert({
      where: {
        customerId_productId: { customerId, productId },
      },
      create: { customerId, productId, viewedAt: new Date() },
      update: { viewedAt: new Date() },
    });
  }

  /**
   * Fetches user's recently viewed products.
   */
  public async findRecentViews(customerId: string, limit = 10): Promise<any[]> {
    return this.db.recentlyViewed.findMany({
      where: { customerId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      include: {
        product: {
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
            variants: { orderBy: { price: 'asc' } },
            store: true,
          },
        },
      },
    });
  }

  /**
   * Limits size of user recently viewed history.
   */
  public async pruneRecentViews(customerId: string, limit = 10): Promise<void> {
    const keepIds = await this.db.recentlyViewed.findMany({
      where: { customerId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      select: { id: true },
    });

    const keepIdsArray = keepIds.map(k => k.id);

    await this.db.recentlyViewed.deleteMany({
      where: {
        customerId,
        id: { notIn: keepIdsArray },
      },
    });
  }

  /**
   * Fetches active banners.
   */
  public async findBanners(): Promise<any[]> {
    return this.db.banner.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Fetches active flash deals.
   */
  public async findFlashDeals(limit = 10): Promise<any[]> {
    const now = new Date();
    return this.db.offer.findMany({
      where: {
        type: 'DISCOUNT', // Flash deal offers are flat/percentage discounts
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      take: limit,
      include: {
        product: {
          include: {
            images: { orderBy: { displayOrder: 'asc' } },
            variants: { orderBy: { price: 'asc' } },
            store: true,
          },
        },
      },
    });
  }

  /**
   * Fetches all stores to compute distance filtering.
   */
  public async findStores(activeOnly = true): Promise<any[]> {
    return this.db.store.findMany({
      where: activeOnly
        ? {
            isOpen: true,
            NOT: {
              name: {
                contains: 'Test Store',
              },
            },
          }
        : {},
    });
  }

  /**
   * Fetches a store by its unique ID.
   */
  public async findStoreById(id: string): Promise<any> {
    return this.db.store.findUnique({
      where: { id },
    });
  }

  /**
   * Finds stores including products for home feed.
   */
  public async findTopRatedProducts(limit = 10): Promise<any[]> {
    return this.db.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        price: 'desc', // Top rated logic: placeholder or join on ratings.
      },
      take: limit,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: { orderBy: { price: 'asc' } },
        store: true,
      },
    });
  }
}

export const catalogRepository = new CatalogRepository();
export default catalogRepository;

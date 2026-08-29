import { BaseRepository } from '../../common/repositories/base.repository';
import { Cart, CartItem, Coupon } from '@prisma/client';

export class CartRepository extends BaseRepository {
  /**
   * Fetches user cart with details of products, variants, and store.
   */
  public async findCartByCustomerId(customerId: string): Promise<any | null> {
    return this.db.cart.findUnique({
      where: { customerId },
      include: {
        store: true,
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { displayOrder: 'asc' } },
                variants: { orderBy: { price: 'asc' } },
              },
            },
            variant: true,
          },
        },
      },
    });
  }

  /**
   * Creates a fresh cart.
   */
  public async createCart(customerId: string, storeId?: string): Promise<Cart> {
    return this.db.cart.create({
      data: {
        customerId,
        storeId: storeId || null,
      },
    });
  }

  /**
   * Updates store linkage on cart.
   */
  public async updateCartStore(cartId: string, storeId: string | null): Promise<Cart> {
    return this.db.cart.update({
      where: { id: cartId },
      data: { storeId },
    });
  }

  /**
   * Cleans duplicate cart items for the same cart, product, and variant.
   * Merges quantities into a single primary item and deletes duplicate rows.
   */
  public async cleanCartDuplicates(cartId: string): Promise<void> {
    const items = await this.db.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: 'asc' },
    });

    const seenMap = new Map<string, string>(); // key -> primary item ID

    for (const item of items) {
      const vId = item.variantId && item.variantId.trim() !== '' ? item.variantId : 'NO_VARIANT';
      const key = `${item.productId}:${vId}`;

      if (seenMap.has(key)) {
        const primaryId = seenMap.get(key)!;
        // Increment quantity on primary item
        await this.db.cartItem.update({
          where: { id: primaryId },
          data: { quantity: { increment: item.quantity } },
        });
        // Delete duplicate row
        await this.db.cartItem.delete({
          where: { id: item.id },
        });
      } else {
        seenMap.set(key, item.id);
      }
    }
  }

  /**
   * Adds or updates a cart item.
   * If isIncrement is true (Add to Cart), increments existing item quantity.
   */
  public async upsertCartItem(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number,
    isIncrement: boolean = false
  ): Promise<CartItem> {
    const targetVariantId = variantId && variantId.trim() !== '' ? variantId : null;

    // Clean duplicate rows for this cart first
    await this.cleanCartDuplicates(cartId);

    // Search for existing item matching cartId, productId, and targetVariantId
    const existingItems = await this.db.cartItem.findMany({
      where: {
        cartId,
        productId,
      },
    });

    const existing = existingItems.find((item) => {
      const itemVId = item.variantId && item.variantId.trim() !== '' ? item.variantId : null;
      return itemVId === targetVariantId;
    });

    if (existing) {
      const newQuantity = isIncrement ? existing.quantity + quantity : quantity;
      return this.db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    }

    return this.db.cartItem.create({
      data: {
        cartId,
        productId,
        variantId: targetVariantId,
        quantity,
      },
    });
  }

  /**
   * Removes an item from the cart.
   */
  public async deleteCartItem(
    cartId: string,
    productId: string,
    variantId: string | null
  ): Promise<void> {
    const targetVariantId = variantId && variantId.trim() !== '' ? variantId : null;

    const existingItems = await this.db.cartItem.findMany({
      where: {
        cartId,
        productId,
      },
    });

    const matches = existingItems.filter((item) => {
      const itemVId = item.variantId && item.variantId.trim() !== '' ? item.variantId : null;
      return targetVariantId ? itemVId === targetVariantId : true;
    });

    for (const match of matches) {
      await this.db.cartItem.delete({
        where: { id: match.id },
      });
    }
  }

  /**
   * Clears all items in a cart and resets the store.
   */
  public async clearCart(cartId: string): Promise<void> {
    await this.db.cartItem.deleteMany({ where: { cartId } });
    await this.db.cart.update({
      where: { id: cartId },
      data: { storeId: null },
    });
  }

  /**
   * Fetches a coupon by code.
   */
  public async findCouponByCode(code: string): Promise<Coupon | null> {
    return this.db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  /**
   * Checks how many times a user has used a specific coupon.
   */
  public async countUserCouponUsage(customerId: string, couponId: string): Promise<number> {
    return this.db.order.count({
      where: {
        customerId,
        couponId,
        status: { not: 'CANCELLED' },
      },
    });
  }
}

export const cartRepository = new CartRepository();
export default cartRepository;

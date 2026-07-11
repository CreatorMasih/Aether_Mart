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
   * Adds or updates a cart item.
   */
  public async upsertCartItem(
    cartId: string,
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<CartItem> {
    // Unique key on cartId, productId, variantId
    const existing = await this.db.cartItem.findFirst({
      where: {
        cartId,
        productId,
        variantId: variantId || null,
      },
    });

    if (existing) {
      return this.db.cartItem.update({
        where: { id: existing.id },
        data: { quantity },
      });
    }

    return this.db.cartItem.create({
      data: {
        cartId,
        productId,
        variantId: variantId || null,
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
    await this.db.cartItem.deleteMany({
      where: {
        cartId,
        productId,
        variantId: variantId || null,
      },
    });
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
        paymentStatus: { in: ['PAID', 'REFUNDED'] },
      },
    });
  }
}

export const cartRepository = new CartRepository();
export default cartRepository;

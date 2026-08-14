import { cartRepository } from './cart.repository';
import { catalogRepository } from '../catalog/catalog.repository';
import { authRepository } from '../auth/auth.repository';
import { haversineDistance } from '../../utils/geo.util';
import { BadRequestError, NotFoundError } from '../../common/middlewares/errorHandler.middleware';
import { ErrorCodes } from '../../utils/response.util';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('CartService');

export class CartService {
  /**
   * Fetches the customer's cart, creating it if missing, and calculates pricing.
   */
  public async getCart(customerId: string): Promise<any> {
    let cart = await cartRepository.findCartByCustomerId(customerId);
    if (!cart) {
      cart = await cartRepository.createCart(customerId);
      // reload
      cart = await cartRepository.findCartByCustomerId(customerId);
    }

    return this.compileCartDetails(cart);
  }

  /**
   * Adds an item to the cart, enforcing single-store cart constraints.
   */
  public async addItem(
    customerId: string,
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<any> {
    const product = await catalogRepository.findProductById(productId);
    if (!product) throw new NotFoundError('Product');

    // Default to the first variant if none is specified but the product has variants
    let targetVariantId = variantId;
    if (!targetVariantId && product.variants && product.variants.length > 0) {
      targetVariantId = product.variants[0].id;
    }

    const variant = targetVariantId
      ? product.variants.find((v: any) => v.id === targetVariantId)
      : null;

    if (targetVariantId && !variant) {
      throw new NotFoundError('Product Variant');
    }

    // 0. Verify Store Operating Hours and Holiday Mode
    const store = await this.db.store.findUnique({ where: { id: product.storeId } });
    if (!store) throw new NotFoundError('Store');

    if (store.isHoliday) {
      throw new BadRequestError(
        `Store '${store.name}' is currently closed on holiday mode.`,
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

    // 1. Verify Inventory Stock
    const availableStock = variant ? variant.stock : (product.variants?.[0]?.stock || 0);
    if (availableStock < quantity) {
      throw new BadRequestError(
        `Insufficient inventory. Only ${availableStock} units available.`,
        ErrorCodes.OUT_OF_STOCK
      );
    }

    // Get customer's cart
    let cart = await cartRepository.findCartByCustomerId(customerId);
    if (!cart) {
      cart = await cartRepository.createCart(customerId, product.storeId);
    }

    // 2. Single-Store cart constraint:
    if (cart.storeId && cart.storeId !== product.storeId && cart.items.length > 0) {
      throw new BadRequestError(
        `Your cart contains items from another store (${cart.store?.name || 'Another Store'}). Please clear your cart first.`,
        ErrorCodes.STORE_CONFLICT
      );
    }

    // If cart storeId is null or empty, link it to the product's store
    if (cart.storeId !== product.storeId) {
      await cartRepository.updateCartStore(cart.id, product.storeId);
    }

    // Upsert item with increment=true for Add to Cart
    await cartRepository.upsertCartItem(cart.id, productId, targetVariantId, quantity, true);

    // Reload and return details
    const updated = await cartRepository.findCartByCustomerId(customerId);
    return this.compileCartDetails(updated);
  }

  /**
   * Updates product quantity in the cart.
   */
  public async updateItem(
    customerId: string,
    productId: string,
    variantId: string | null,
    quantity: number
  ): Promise<any> {
    const cart = await cartRepository.findCartByCustomerId(customerId);
    if (!cart) throw new NotFoundError('Cart');

    if (quantity <= 0) {
      await cartRepository.deleteCartItem(cart.id, productId, variantId);
    } else {
      // Check inventory
      const product = await catalogRepository.findProductById(productId);
      if (!product) throw new NotFoundError('Product');

      const variant = variantId ? product.variants.find((v: any) => v.id === variantId) : null;
      const availableStock = variant ? variant.stock : (product.variants?.[0]?.stock || 0);

      if (availableStock < quantity) {
        throw new BadRequestError(
          `Insufficient inventory. Only ${availableStock} units available.`,
          ErrorCodes.OUT_OF_STOCK
        );
      }

      await cartRepository.upsertCartItem(cart.id, productId, variantId, quantity);
    }

    // Reload
    let reloaded = await cartRepository.findCartByCustomerId(customerId);

    // If cart is empty, clean up the storeId
    if (reloaded && reloaded.items.length === 0) {
      await cartRepository.updateCartStore(reloaded.id, null);
      reloaded = await cartRepository.findCartByCustomerId(customerId);
    }

    return this.compileCartDetails(reloaded);
  }

  /**
   * Removes an item from the cart.
   */
  public async removeItem(
    customerId: string,
    productId: string,
    variantId: string | null
  ): Promise<any> {
    return this.updateItem(customerId, productId, variantId, 0);
  }

  /**
   * Clears the cart.
   */
  public async clearCart(customerId: string): Promise<any> {
    const cart = await cartRepository.findCartByCustomerId(customerId);
    if (!cart) throw new NotFoundError('Cart');

    await cartRepository.clearCart(cart.id);
    const updated = await cartRepository.findCartByCustomerId(customerId);
    return this.compileCartDetails(updated);
  }

  /**
   * Merges guest cart items into customer's persistent cart.
   */
  public async mergeCart(customerId: string, guestItems: any[]): Promise<any> {
    let cart = await cartRepository.findCartByCustomerId(customerId);
    if (!cart) {
      cart = await cartRepository.createCart(customerId);
      cart = await cartRepository.findCartByCustomerId(customerId);
    }

    for (const item of guestItems) {
      try {
        await this.addItem(customerId, item.productId, item.variantId || null, item.quantity);
      } catch (error: any) {
        // Log error and ignore specific conflicts during batch merge
        log.warn(`Skipped merging item ${item.productId}: ${error.message}`);
      }
    }

    const updated = await cartRepository.findCartByCustomerId(customerId);
    return this.compileCartDetails(updated);
  }

  /**
   * Recalculates cart values with coupons, tipping, eco packaging, and geolocation.
   */
  public async recalculateCartPricing(
    customerId: string | undefined,
    items: Array<{ productId: string; variantId?: string; quantity: number }>,
    couponCode?: string,
    driverTip = 0,
    ecoPackaging = false,
    deliveryLat?: number,
    deliveryLng?: number
  ): Promise<any> {
    let subtotal = 0;
    let totalWeightGrams = 0;
    let storeId: string | null = null;
    const itemDetails: any[] = [];

    // 1. Map and validate items
    for (const item of items) {
      const product = await catalogRepository.findProductById(item.productId);
      if (!product) throw new NotFoundError(`Product ${item.productId}`);

      if (storeId && storeId !== product.storeId) {
        throw new BadRequestError(
          'All cart items must belong to the same store.',
          ErrorCodes.STORE_CONFLICT
        );
      }
      storeId = product.storeId;

      const variant = item.variantId
        ? product.variants.find((v: any) => v.id === item.variantId)
        : null;

      if (item.variantId && !variant) {
        throw new NotFoundError(`Variant ${item.variantId}`);
      }

      // Check stock
      const availableStock = variant ? variant.stock : (product.variants?.[0]?.stock || 0);
      if (availableStock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for item: ${product.name}. Only ${availableStock} left.`,
          ErrorCodes.OUT_OF_STOCK
        );
      }

      const itemPrice = variant ? variant.price : (product.discountPrice || product.price);
      const lineCost = itemPrice * item.quantity;
      subtotal += lineCost;

      const weight = product.weightGrams || 0;
      totalWeightGrams += weight * item.quantity;

      const primaryImage = product.images?.find((img: any) => img.isPrimary)?.url 
        || product.images?.[0]?.url 
        || 'https://images.unsplash.com/photo-1542838132-92c53300491e';

      itemDetails.push({
        productId: product.id,
        name: product.name,
        imageUrl: primaryImage,
        variantId: variant?.id || null,
        variantName: variant?.name || null,
        price: itemPrice,
        quantity: item.quantity,
        total: lineCost,
      });
    }

    // 2. Fetch store details for shipping logic
    const store = storeId ? await this.db.store.findUnique({ where: { id: storeId } }) : null;

    // 3. Dynamic Delivery Fee
    let deliveryFee = 15.0; // base delivery fee
    if (subtotal >= 199.0) {
      deliveryFee = 0.0; // Free delivery threshold
    } else if (deliveryLat !== undefined && deliveryLng !== undefined && store) {
      const distance = haversineDistance(
        { latitude: deliveryLat, longitude: deliveryLng },
        { latitude: store.latitude, longitude: store.longitude }
      );
      if (distance > 3.0) {
        // Add 5 rupees per km beyond 3km
        deliveryFee += Math.ceil((distance - 3.0) * 5.0);
      }
    }

    // 4. Packaging Charges (Eco choice reduces packaging fee)
    const packagingFee = ecoPackaging ? 5.0 : 10.0;

    // 5. Platform handling fee
    const handlingFee = 5.0;

    // 6. Surge fee (Peak hours or extreme load, mock support)
    const surgeFee = 0.0;

    // 7. Coupon Discount Math
    let discount = 0.0;
    let couponDetails = null;

    if (couponCode && customerId) {
      try {
        const coupon = await this.validateCoupon(couponCode, customerId, subtotal);
        if (coupon.type === 'FLAT') {
          discount = coupon.value;
        } else if (coupon.type === 'PERCENTAGE') {
          discount = (subtotal * coupon.value) / 100;
          if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
          }
        }
        couponDetails = {
          id: coupon.id,
          code: coupon.code,
          discount,
        };
      } catch (error: any) {
        // Return coupon error details but don't crash the cart calculations
        log.warn(`Coupon validation failed: ${error.message}`);
      }
    }

    // 8. Tax calculations (5% tax rate on subtotal post-discount)
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = parseFloat((taxableAmount * 0.05).toFixed(2));

    // 9. Total amount combining everything
    const totalAmount = parseFloat(
      (taxableAmount + tax + packagingFee + handlingFee + deliveryFee + surgeFee + driverTip).toFixed(2)
    );

    return {
      store: store ? {
        id: store.id,
        name: store.name,
        rating: store.rating,
      } : null,
      items: itemDetails,
      subtotal,
      discount,
      coupon: couponDetails,
      tax,
      packagingFee,
      handlingFee,
      deliveryFee,
      surgeFee,
      driverTip,
      ecoPackaging,
      totalWeightGrams,
      totalAmount,
    };
  }

  /**
   * Validates a coupon code against constraints.
   */
  public async validateCoupon(code: string, customerId: string, subtotal: number) {
    const coupon = await cartRepository.findCouponByCode(code);
    if (!coupon) {
      throw new BadRequestError('Invalid coupon code.', ErrorCodes.COUPON_INVALID);
    }

    if (!coupon.isActive) {
      throw new BadRequestError('Coupon is no longer active.', ErrorCodes.COUPON_INVALID);
    }

    const now = new Date();
    if (coupon.expiry < now) {
      throw new BadRequestError('Coupon has expired.', ErrorCodes.COUPON_EXPIRED);
    }

    if (subtotal < coupon.minOrderValue) {
      throw new BadRequestError(
        `Minimum order value of Rs. ${coupon.minOrderValue} required for this coupon.`,
        ErrorCodes.COUPON_MIN_ORDER
      );
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached.', ErrorCodes.COUPON_LIMIT_REACHED);
    }

    // Check user-specific usage limit (per-user check)
    const userUsageCount = await cartRepository.countUserCouponUsage(customerId, coupon.id);
    if (userUsageCount >= 1) {
      // default: max 1 usage per customer for promotional coupon
      throw new BadRequestError('You have already used this coupon.', ErrorCodes.COUPON_LIMIT_REACHED);
    }

    return coupon;
  }

  // ─── Private Helper methods ──────────────────────────────────────────────────

  private async compileCartDetails(cart: any): Promise<any> {
    if (!cart || cart.items.length === 0) {
      return {
        id: cart?.id || null,
        store: null,
        items: [],
        subtotal: 0,
        discount: 0,
        tax: 0,
        packagingFee: 0,
        handlingFee: 0,
        deliveryFee: 0,
        surgeFee: 0,
        driverTip: 0,
        ecoPackaging: false,
        totalAmount: 0,
      };
    }

    // Format cart items
    const items = cart.items.map((item: any) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    return this.recalculateCartPricing(cart.customerId, items);
  }

  // Hook db access directly for simpler helper routines
  private get db() {
    return cartRepository.prisma;
  }
}

export const cartService = new CartService();
export default cartService;

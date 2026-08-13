import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { authRepository } from '../auth/auth.repository';
import { prisma } from '../../config/database.config';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { cartItemAddSchema, cartItemUpdateSchema, applyCouponSchema, recalculateCartSchema } from './cart.validator';

export class CartController {
  /**
   * Ensures that a Customer profile exists for the given user.
   */
  private async ensureCustomerId(userId: string): Promise<string> {
    const profile = await authRepository.findUserWithProfile(userId);
    if (profile?.customer?.id) {
      return profile.customer.id;
    }
    const user = profile || (await prisma.user.findUnique({ where: { id: userId } }));
    const name = user?.email?.split('@')[0] || user?.phone || 'Customer';
    const customer = await authRepository.createCustomerProfile(userId, name);
    return customer.id;
  }

  /**
   * Returns current user cart.
   * If user is unauthenticated (guest), returns an empty cart payload cleanly.
   */
  public getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendSuccess(
          res,
          {
            id: null,
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
            coupon: null,
          },
          'Guest cart'
        );
        return;
      }

      const customerId = await this.ensureCustomerId(userId);
      const cart = await cartService.getCart(customerId);
      sendSuccess(res, cart, 'Cart retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Adds an item to the cart.
   */
  public addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required to modify cart', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const customerId = await this.ensureCustomerId(userId);
      const { productId, variantId, quantity } = cartItemAddSchema.parse(req.body);
      const cart = await cartService.addItem(customerId, productId, variantId || null, quantity);

      sendSuccess(res, cart, 'Item added to cart successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates an item's quantity.
   */
  public updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required to modify cart', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const customerId = await this.ensureCustomerId(userId);
      const { productId, variantId, quantity } = cartItemUpdateSchema.parse(req.body);
      const cart = await cartService.updateItem(customerId, productId, variantId || null, quantity);

      sendSuccess(res, cart, 'Cart updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Removes an item completely.
   */
  public removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required to modify cart', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const customerId = await this.ensureCustomerId(userId);
      const productId = req.params.productId as string;
      const variantId = (req.query.variantId as string) || null;

      const cart = await cartService.removeItem(customerId, productId, variantId);
      sendSuccess(res, cart, 'Item removed from cart successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Clears the cart.
   */
  public clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required to modify cart', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const customerId = await this.ensureCustomerId(userId);
      const cart = await cartService.clearCart(customerId);
      sendSuccess(res, cart, 'Cart cleared successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recalculates cart values (for checkout pricing or guest checkouts).
   */
  public recalculateCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let customerId: string | undefined;
      if (req.user?.userId) {
        customerId = await this.ensureCustomerId(req.user.userId);
      }

      const { items, couponCode, driverTip, ecoPackaging, deliveryLatitude, deliveryLongitude } =
        recalculateCartSchema.parse(req.body);

      const pricing = await cartService.recalculateCartPricing(
        customerId,
        items,
        couponCode,
        driverTip,
        ecoPackaging,
        deliveryLatitude,
        deliveryLongitude
      );

      sendSuccess(res, pricing, 'Cart prices recalculated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validates and returns details of a coupon.
   */
  public validateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const customerId = await this.ensureCustomerId(userId);
      const { code } = applyCouponSchema.parse(req.body);
      const subtotal = req.body.subtotal ? parseFloat(req.body.subtotal) : 0;

      const coupon = await cartService.validateCoupon(code, customerId, subtotal);
      sendSuccess(
        res,
        {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          maxDiscount: coupon.maxDiscount,
        },
        'Coupon is valid'
      );
    } catch (error) {
      next(error);
    }
  };
}

export const cartController = new CartController();
export default cartController;

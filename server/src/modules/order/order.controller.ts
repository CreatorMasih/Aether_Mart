import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { orderRepository } from './order.repository';
import { authRepository } from '../auth/auth.repository';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { placeOrderSchema, confirmPaymentSchema, updateOrderStatusSchema, refundRequestSchema } from './order.validator';
import { PaymentMethod } from '@prisma/client';

export class OrderController {
  /**
   * Places a new order (supports single/split stores).
   */
  public placeOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      let profile = await authRepository.findUserWithProfile(userId);
      if (!profile?.customer) {
        await authRepository.createCustomerProfile(userId, profile?.fullName || 'Customer', profile?.email || undefined);
        profile = await authRepository.findUserWithProfile(userId);
      }
      const customerId = profile.customer!.id;

      const parsedBody = placeOrderSchema.parse(req.body);
      const idempotencyKey = req.headers['x-idempotency-key'] as string || undefined;

      const orders = await orderService.placeOrder(customerId, {
        ...parsedBody,
        paymentMethod: parsedBody.paymentMethod as PaymentMethod,
        idempotencyKey,
      });

      sendSuccess(res, orders, 'Order placed successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Confirms payment via Razorpay callback hook.
   */
  public confirmPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { paymentId, status } = confirmPaymentSchema.parse(req.body);
      const order = await orderService.confirmPayment(paymentId, status);
      sendSuccess(res, order, 'Payment process finalized');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Fetches details of a specific order.
   */
  public getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.id as string;
      const order = await orderRepository.findOrderById(orderId);
      if (!order) {
        sendError(res, 'Order not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
        return;
      }

      sendSuccess(res, order, 'Order details fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns order history for customer.
   */
  public getOrderHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authRepository.findUserWithProfile(userId);
      const customerId = profile?.customer?.id;
      if (!customerId) {
        sendError(res, 'Customer profile required', HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const skip = (page - 1) * limit;

      const history = await orderRepository.findOrdersByCustomerId(customerId, limit, skip);
      sendSuccess(res, history, 'Order history retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Updates an order's status (Merchant/Admin trigger).
   */
  public updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = req.params.id as string;
      const { status } = updateOrderStatusSchema.parse(req.body);

      const order = await orderService.updateOrderStatus(orderId, status);
      sendSuccess(res, order, `Order status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Initiates a refund request for customer.
   */
  public requestRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authRepository.findUserWithProfile(userId);
      const customerId = profile?.customer?.id;
      if (!customerId) {
        sendError(res, 'Customer profile required', HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
        return;
      }

      const orderId = req.params.id as string;
      const { reason } = refundRequestSchema.parse(req.body);

      const order = await orderService.requestRefund(orderId, customerId, reason);
      sendSuccess(res, order, 'Refund processed successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const orderController = new OrderController();
export default orderController;

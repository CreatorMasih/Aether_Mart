import { Router } from 'express';
import { orderController } from './order.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requireMerchantOrAdmin } from '../../common/middlewares/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Customer specific operations
router.post('/', authenticate, orderController.placeOrder);
router.get('/', authenticate, orderController.getOrderHistory);
router.get('/:id', authenticate, orderController.getOrderById);
router.post('/:id/refund', authenticate, orderController.requestRefund);
router.post('/:id/retry-payment', authenticate, orderController.retryPayment);

// Payment confirmation (Online Razorpay callback simulated webhook)
router.post('/confirm-payment', orderController.confirmPayment);

// Merchant / Admin management operations
router.put('/:id/status', authenticate, requireMerchantOrAdmin, orderController.updateOrderStatus);

export default router;

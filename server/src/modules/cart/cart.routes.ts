import { Router } from 'express';
import { cartController } from './cart.controller';
import { authenticate, optionalAuthenticate } from '../../common/middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, cartController.getCart);
router.post('/add', authenticate, cartController.addItem);
router.put('/update', authenticate, cartController.updateItem);
router.delete('/remove/:productId', authenticate, cartController.removeItem);
router.delete('/clear', authenticate, cartController.clearCart);
router.post('/recalculate', optionalAuthenticate, cartController.recalculateCart);
router.post('/coupon/validate', authenticate, cartController.validateCoupon);

export default router;

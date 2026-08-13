import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';

const router = Router();

router.get('/addresses', authenticate, customerController.getAddresses);
router.post('/addresses', authenticate, customerController.createAddress);
router.put('/addresses/:id', authenticate, customerController.updateAddress);
router.delete('/addresses/:id', authenticate, customerController.deleteAddress);
router.get('/wallet', authenticate, customerController.getWallet);

export default router;

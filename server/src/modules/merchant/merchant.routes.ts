import { Router } from 'express';
import { merchantController } from './merchant.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requireMerchant, requireMerchantOrAdmin } from '../../common/middlewares/role.middleware';

const router = Router();

// Apply auth + shopkeeper role guards globally to all merchant endpoints
router.use(authenticate);

// Profile
router.get('/profile', requireMerchant, merchantController.getProfile);
router.put('/profile', requireMerchant, merchantController.updateProfile);
router.patch('/profile', requireMerchant, merchantController.updateProfile);
router.delete('/profile/:id', requireMerchantOrAdmin, merchantController.softDeleteMerchant);

// Dashboard & Analytics
router.get('/dashboard', requireMerchant, merchantController.getDashboardStats);
router.get('/payouts', requireMerchant, merchantController.getPayouts);

// Products CRUD
router.get('/products', requireMerchant, merchantController.getProducts);
router.post('/products', requireMerchant, merchantController.createProduct);
router.put('/products/:id', requireMerchant, merchantController.updateProduct);
router.delete('/products/:id', requireMerchant, merchantController.softDeleteProduct);

// Orders & Dispatch management
router.get('/orders', requireMerchant, merchantController.getStoreOrders);
router.post('/orders/:orderId/assign-rider', requireMerchant, merchantController.assignRider);

export default router;

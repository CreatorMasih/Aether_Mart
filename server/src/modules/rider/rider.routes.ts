import { Router } from 'express';
import { riderController } from './rider.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requireRider } from '../../common/middlewares/role.middleware';

const router = Router();

// Apply auth + rider role guards globally to all rider endpoints
router.use(authenticate);
router.use(requireRider);

// Heartbeat & Profile
router.put('/profile', riderController.updateProfile);
router.post('/heartbeat', riderController.heartbeat);

// Job Discovery & Assignments
router.get('/deliveries/available', riderController.getAvailableDeliveries);
router.get('/assignments', riderController.getAssignments);

// Delivery Actions
router.post('/deliveries/:orderId/accept', riderController.acceptDelivery);
router.post('/deliveries/:orderId/pickup', riderController.confirmPickup);
router.post('/deliveries/:orderId/complete', riderController.confirmDelivery);

export default router;

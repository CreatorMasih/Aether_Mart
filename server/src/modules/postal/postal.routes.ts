import { Router } from 'express';
import { postalController } from './postal.controller';

const router = Router();

router.get('/pincode/:pincode', postalController.getPincodeDetails);
router.get('/city/:city', postalController.getCityDetails);

export default router;

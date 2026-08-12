import { Router } from 'express';
import { locationController } from './location.controller';

const router = Router();

/**
 * @swagger
 * /location/reverse-geocode:
 *   post:
 *     tags: [Location]
 *     summary: Reverse geocode coordinates to address details and check serviceability
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitude, longitude]
 *             properties:
 *               latitude:
 *                 type: number
 *                 example: 21.1085
 *               longitude:
 *                 type: number
 *                 example: 82.0965
 *     responses:
 *       200:
 *         description: Reverse geocode successful
 */
router.post('/reverse-geocode', locationController.reverseGeocode);

/**
 * @swagger
 * /location/serviceability:
 *   get:
 *     tags: [Location]
 *     summary: Check serviceability status for a city, pincode, or coordinates
 *     parameters:
 *       - in: query
 *         name: pincode
 *         schema:
 *           type: string
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Serviceability response retrieved
 */
router.get('/serviceability', locationController.checkServiceability);

export default router;

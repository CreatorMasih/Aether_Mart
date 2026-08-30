import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middlewares/validate.middleware';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authRateLimiter, otpRateLimiter } from '../../common/middlewares/rateLimit.middleware';
import { sendOtpSchema, verifyOtpSchema, completeProfileSchema, googleLoginSchema } from './auth.validator';

const router = Router();

/**
 * @swagger
 * /auth/config:
 *   get:
 *     tags: [Auth]
 *     summary: Retrieve safe auth configuration (OTP mode)
 *     responses:
 *       200:
 *         description: Auth configuration retrieved
 */
router.get('/config', authController.getConfig);

/**
 * @swagger
 * /auth/send-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Trigger OTP login/registration
 *     description: Generates a 6-digit OTP and sends it via Email or SMS.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, type, role]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: customer1@gmail.com
 *               type:
 *                 type: string
 *                 enum: [SMS, EMAIL]
 *                 example: EMAIL
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, SHOPKEEPER, RIDER, ADMIN]
 *                 example: CUSTOMER
 *     responses:
 *       200:
 *         description: OTP dispatched successfully
 *       400:
 *         description: Invalid payload configuration
 *       429:
 *         description: Too many verification attempts
 */
router.post('/send-otp', otpRateLimiter, validate(sendOtpSchema), authController.sendOtp);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and Login/Register
 *     description: Verifies 6-digit OTP code. Establishes session and returns access token.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, code, role, method]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: customer1@gmail.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, SHOPKEEPER, RIDER, ADMIN]
 *                 example: CUSTOMER
 *               method:
 *                 type: string
 *                 enum: [PHONE, EMAIL, GOOGLE, APPLE, WHATSAPP]
 *                 example: EMAIL
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: OTP invalid or expired
 */
router.post('/verify-otp', authRateLimiter, validate(verifyOtpSchema), authController.verifyOtp);

router.post('/google-login', authRateLimiter, validate(googleLoginSchema), authController.googleLogin);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate token sessions
 *     description: Uses HTTP-only cookie refresh token to rotate access and refresh tokens.
 *     security: []
 *     responses:
 *       200:
 *         description: Session rotated successfully
 *       401:
 *         description: Invalid refresh session
 */
router.post('/refresh', authController.refresh);
router.post('/refresh-token', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     description: Revokes active refresh token and clears cookie session.
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Logout all sessions
 *     description: Revokes all active refresh tokens for the authenticated user across all devices.
 *     responses:
 *       200:
 *         description: Logged out all devices successfully
 *       401:
 *         description: Authentication required
 */
router.post('/logout-all', authenticate, authController.logoutAll);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get profile overview
 *     description: Returns profile details of the active authenticated user.
 *     responses:
 *       200:
 *         description: Profile details retrieved
 *       401:
 *         description: Authentication required
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @swagger
 * /auth/complete-profile:
 *   post:
 *     tags: [Auth]
 *     summary: Finish account profile registration
 *     description: Configures custom profiles for Customer, Shopkeeper, or Riders.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, SHOPKEEPER, RIDER]
 *               customerDetails:
 *                 type: object
 *               merchantDetails:
 *                 type: object
 *               riderDetails:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile registration completed
 */
router.post('/complete-profile', authenticate, validate(completeProfileSchema), authController.completeProfile);

export default router;

import { Router } from 'express';
import adminController from './admin.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { requireAdmin } from '../../common/middlewares/role.middleware';

const router = Router();

// Protect all routes with JWT authenticate and Admin guard
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Retrieve list of users
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [CUSTOMER, SHOPKEEPER, RIDER, ADMIN]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/users', adminController.getUsers);

/**
 * @swagger
 * /admin/users/{userId}/status:
 *   put:
 *     summary: Update status of a user (Block/Suspended)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, BLOCKED, SUSPENDED]
 *     responses:
 *       200:
 *         description: User status updated successfully
 */
router.put('/users/:userId/status', adminController.updateUserStatus);

/**
 * @swagger
 * /admin/merchants/pending:
 *   get:
 *     summary: Get pending merchants list
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending merchants retrieved successfully
 */
router.get('/merchants/pending', adminController.getPendingMerchants);

/**
 * @swagger
 * /admin/merchants/{merchantId}/approve:
 *   put:
 *     summary: Approve or reject a merchant profile
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approve]
 *             properties:
 *               approve:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Merchant status updated successfully
 */
router.put('/merchants/:merchantId/approve', adminController.approveMerchant);

/**
 * @swagger
 * /admin/riders/pending:
 *   get:
 *     summary: Get pending riders list
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending riders retrieved successfully
 */
router.get('/riders/pending', adminController.getPendingRiders);

/**
 * @swagger
 * /admin/riders/{riderId}/approve:
 *   put:
 *     summary: Approve or reject a rider profile
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: riderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [approve]
 *             properties:
 *               approve:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Rider status updated successfully
 */
router.put('/riders/:riderId/approve', adminController.approveRider);

/**
 * @swagger
 * /admin/products/{productId}/moderate:
 *   put:
 *     summary: Activate/Deactivate a product listing
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Product status updated successfully
 */
router.put('/products/:productId/moderate', adminController.moderateProduct);

/**
 * @swagger
 * /admin/banners:
 *   get:
 *     summary: Get all banners
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of banners
 *   post:
 *     summary: Create a new promotional banner
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, imageUrl, linkType, linkTarget]
 *             properties:
 *               title:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               linkType:
 *                 type: string
 *                 enum: [CATEGORY, PRODUCT, STORE, EXTERNAL]
 *               linkTarget:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               displayOrder:
 *                 type: integer
 *                 default: 0
 *               startsAt:
 *                 type: string
 *                 format: date-time
 *               endsAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Banner created successfully
 */
router.get('/banners', adminController.getBanners);
router.post('/banners', adminController.createBanner);

/**
 * @swagger
 * /admin/banners/{bannerId}:
 *   put:
 *     summary: Update an existing banner
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bannerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Banner updated successfully
 *   delete:
 *     summary: Delete a banner
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bannerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Banner deleted successfully
 */
router.put('/banners/:bannerId', adminController.updateBanner);
router.delete('/banners/:bannerId', adminController.deleteBanner);

/**
 * @swagger
 * /admin/coupons:
 *   get:
 *     summary: Get all coupons
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of coupons
 *   post:
 *     summary: Create a discount coupon
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, type, value, expiry]
 *             properties:
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [FLAT, PERCENTAGE]
 *               value:
 *                 type: number
 *               minOrderValue:
 *                 type: number
 *                 default: 0.0
 *               maxDiscount:
 *                 type: number
 *               usageLimit:
 *                 type: integer
 *                 default: 1
 *               expiry:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Coupon created successfully
 */
router.get('/coupons', adminController.getCoupons);
router.post('/coupons', adminController.createCoupon);

/**
 * @swagger
 * /admin/coupons/{couponId}:
 *   put:
 *     summary: Update an existing coupon
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Coupon updated successfully
 *   delete:
 *     summary: Deactivate a coupon
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: couponId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon deactivated successfully
 */
router.put('/coupons/:couponId', adminController.updateCoupon);
router.delete('/coupons/:couponId', adminController.deleteCoupon);

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Retrieve platform settings and feature flags
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: App settings list
 *   put:
 *     summary: Bulk update/create settings or feature flags
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [settings]
 *             properties:
 *               settings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [key, value]
 *                   properties:
 *                     key:
 *                       type: string
 *                     value:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.bulkUpdateSettings);

/**
 * @swagger
 * /admin/analytics/kpis:
 *   get:
 *     summary: Calculate dashboard KPIs (GMV, Revenue, Active Users/Orders)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Calculated dashboard stats
 */
router.get('/analytics/kpis', adminController.getKPIs);

/**
 * @swagger
 * /admin/analytics/stores:
 *   get:
 *     summary: Get performance metrics by store
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Store sales and GMV rankings
 */
router.get('/analytics/stores', adminController.getStorePerformance);

/**
 * @swagger
 * /admin/analytics/riders:
 *   get:
 *     summary: Get performance metrics by rider
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Rider job metrics and earnings stats
 */
router.get('/analytics/riders', adminController.getRiderPerformance);

/**
 * @swagger
 * /admin/analytics/funnel:
 *   get:
 *     summary: Get order status counts funnel
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Funnel metrics list
 */
router.get('/analytics/funnel', adminController.getOrderFunnel);

/**
 * @swagger
 * /admin/analytics/cancellations:
 *   get:
 *     summary: Get order cancellations and refunds report
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cancellation analytics calculated report
 */
router.get('/analytics/cancellations', adminController.getCancellationAnalytics);

/**
 * @swagger
 * /admin/analytics/products:
 *   get:
 *     summary: Get top 10 best-selling products list
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Top selling products sorted rankings
 */
router.get('/analytics/products', adminController.getTopProducts);

/**
 * @swagger
 * /admin/analytics/categories:
 *   get:
 *     summary: Get category-wise sales volumes and GMV
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Category metrics list
 */
router.get('/analytics/categories', adminController.getCategoryAnalytics);

/**
 * @swagger
 * /admin/jobs/trigger:
 *   post:
 *     summary: Manually trigger maintenance background cleanups
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Execution maintenance report completed successfully
 */
router.post('/jobs/trigger', adminController.triggerJobs);

export default router;

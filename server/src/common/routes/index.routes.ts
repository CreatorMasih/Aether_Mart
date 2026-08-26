import { Router } from 'express';
import healthRouter from './health.routes';

// ─── Route Aggregator ─────────────────────────────────────────────────────────
// Module routes are registered here as they are implemented in subsequent phases.
// This keeps app.config.ts clean and single-responsibility.

const router = Router();

// ── System ────────────────────────────────────────────────────────────────────
router.use('/', healthRouter);

// ── SEO Public Infrastructure Endpoints ─────────────────────────────────────
router.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /mahasamund-delivery
Allow: /categories
Allow: /food-delivery-mahasamund
Allow: /grocery-delivery-mahasamund
Allow: /medicine-delivery-mahasamund
Allow: /daily-essentials-mahasamund
Disallow: /auth/
Disallow: /c/checkout
Disallow: /c/cart
Disallow: /m/
Disallow: /r/
Disallow: /a/

Sitemap: https://aether-mart-six.vercel.app/sitemap.xml`);
});

router.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://aether-mart-six.vercel.app/</loc><priority>1.0</priority></url>
  <url><loc>https://aether-mart-six.vercel.app/mahasamund-delivery</loc><priority>0.9</priority></url>
  <url><loc>https://aether-mart-six.vercel.app/categories</loc><priority>0.8</priority></url>
  <url><loc>https://aether-mart-six.vercel.app/food-delivery-mahasamund</loc><priority>0.8</priority></url>
  <url><loc>https://aether-mart-six.vercel.app/grocery-delivery-mahasamund</loc><priority>0.8</priority></url>
  <url><loc>https://aether-mart-six.vercel.app/medicine-delivery-mahasamund</loc><priority>0.8</priority></url>
</urlset>`);
});

// ── Auth (Phase 3) ────────────────────────────────────────────────────────────
import authRoutes from '../../modules/auth/auth.routes';
import { authController } from '../../modules/auth/auth.controller';
router.use('/auth', authRoutes);
router.get('/config', authController.getConfig);

// ── Customer (Phase 3-5) ──────────────────────────────────────────────────────
import customerRoutes from '../../modules/customer/customer.routes';
router.use('/customer', customerRoutes);

// ── Catalog (Phase 4) ─────────────────────────────────────────────────────────
import catalogRoutes from '../../modules/catalog/catalog.routes';
router.use('/customer', catalogRoutes);
router.use('/', catalogRoutes);

// ── Cart (Phase 5) ────────────────────────────────────────────────────────────
import cartRoutes from '../../modules/cart/cart.routes';
router.use('/customer/cart', cartRoutes);
router.use('/cart', cartRoutes);

// ── Wishlist (Phase 4) ────────────────────────────────────────────────────────
// import wishlistRoutes from '../../modules/wishlist/wishlist.routes';
// router.use('/customer/wishlist', wishlistRoutes);

// ── Orders (Phase 5) ──────────────────────────────────────────────────────────
import orderRoutes from '../../modules/order/order.routes';
router.use('/customer/orders', orderRoutes);
router.use('/orders', orderRoutes);

// ── Payments (Phase 5) ────────────────────────────────────────────────────────
// import paymentRoutes from '../../modules/payments/payments.routes';
// router.use('/payments', paymentRoutes);

// ── Merchant (Phase 6) ────────────────────────────────────────────────────────
import merchantRoutes from '../../modules/merchant/merchant.routes';
router.use('/merchant', merchantRoutes);

// ── Rider (Phase 6) ───────────────────────────────────────────────────────────
import riderRoutes from '../../modules/rider/rider.routes';
router.use('/rider', riderRoutes);

// ── Admin (Phase 8) ───────────────────────────────────────────────────────────
import adminRoutes from '../../modules/admin/admin.routes';
router.use('/admin', adminRoutes);

// ── Postal Autocomplete / Lookup ──────────────────────────────────────────────
import postalRoutes from '../../modules/postal/postal.routes';
router.use('/postal', postalRoutes);

// ── Location & Serviceability ──────────────────────────────────────────────────
import locationRoutes from '../../modules/location/location.routes';
router.use('/location', locationRoutes);

export default router;

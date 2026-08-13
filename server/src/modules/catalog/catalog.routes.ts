import { Router } from 'express';
import { catalogController } from './catalog.controller';
import { authenticate, optionalAuthenticate } from '../../common/middlewares/auth.middleware';

const router = Router();

// ── Categories ───────────────────────────────────────────────────────────────
router.get('/categories', catalogController.getCategories);

// ── Products Search & Details ───────────────────────────────────────────────
router.get('/products', optionalAuthenticate, catalogController.getProducts);
router.get('/products/:id', optionalAuthenticate, catalogController.getProductById);
router.get('/products/:id/related', catalogController.getRelatedProducts);
router.get('/products/:id/frequently-bought-together', catalogController.getFrequentlyBoughtTogether);
router.get('/products/:id/reviews', catalogController.getProductReviews);

// ── Search suggestions & feeds ──────────────────────────────────────────────
router.get('/search/suggestions', catalogController.getSearchSuggestions);
router.get('/home', optionalAuthenticate, catalogController.getHomeFeed);
router.get('/stores/:id', optionalAuthenticate, catalogController.getStoreById);

// ── Wishlist (Private) ───────────────────────────────────────────────────────
router.get('/wishlist', authenticate, catalogController.getWishlist);
router.post('/wishlist', authenticate, catalogController.addToWishlist);
router.delete('/wishlist/:id', authenticate, catalogController.removeFromWishlist);

// ── Recently Viewed (Private) ────────────────────────────────────────────────
router.get('/recently-viewed', authenticate, catalogController.getRecentViews);

export default router;

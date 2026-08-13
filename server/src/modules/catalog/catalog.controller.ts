import { Request, Response, NextFunction } from 'express';
import { catalogService } from './catalog.service';
import { authRepository } from '../auth/auth.repository';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { productsQuerySchema, wishlistAddSchema } from './catalog.validator';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('CatalogController');

export class CatalogController {
  /**
   * Returns nesting-aware categories list.
   */
  public getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await catalogService.getCategories();
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns list of matching products based on query criteria.
   */
  public getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query string options using Zod
      const parsedQuery = productsQuerySchema.parse(req.query);
      
      const result = await catalogService.getProducts(parsedQuery);
      sendSuccess(res, result, 'Products fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns details of a specific product.
   */
  public getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      
      // Attempt to resolve customerId if token present to log recently viewed
      let customerId: string | undefined;
      if (req.user?.userId) {
        const profile = await authRepository.findUserWithProfile(req.user.userId);
        customerId = profile?.customer?.id;
      }

      const product = await catalogService.getProductById(id, customerId);
      sendSuccess(res, product, 'Product details fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns list of related items.
   */
  public getRelatedProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const products = await catalogService.getRelatedProducts(id);
      sendSuccess(res, products, 'Related products fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns frequently bought together items.
   */
  public getFrequentlyBoughtTogether = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const products = await catalogService.getFrequentlyBoughtTogether(id);
      sendSuccess(res, products, 'Frequently bought together products fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns product reviews list.
   */
  public getProductReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const offset = (page - 1) * limit;

      const reviews = await catalogService.getProductReviews(id, limit, offset);
      sendSuccess(res, reviews, 'Product reviews fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Auto-complete suggestions for search bar.
   */
  public getSearchSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query.q as string || '';
      const suggestions = await catalogService.getSearchSuggestions(query);
      sendSuccess(res, suggestions, 'Search suggestions fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Home API aggregating multiple widgets.
   */
  public getHomeFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let customerId: string | undefined;
      if (req.user?.userId) {
        const profile = await authRepository.findUserWithProfile(req.user.userId);
        customerId = profile?.customer?.id;
      }

      // Check geo coordinates in query params
      const lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      const lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;

      const feed = await catalogService.getHomeFeed(customerId, lat, lng);
      sendSuccess(res, feed, 'Home feed data fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns details of a specific store.
   */
  public getStoreById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id as string;
      const lat = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined;
      const lng = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined;

      const store = await catalogService.getStoreById(id, lat, lng);
      sendSuccess(res, store, 'Store details fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Wishlist: get all items.
   */
  public getWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authorization required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authRepository.findUserWithProfile(userId);
      const customerId = profile?.customer?.id;

      if (!customerId) {
        sendError(res, 'Customer profile is required to manage wishlist', HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
        return;
      }

      const wishlist = await catalogService.getWishlist(customerId);
      sendSuccess(res, wishlist, 'Wishlist retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Wishlist: add item.
   */
  public addToWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authorization required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authRepository.findUserWithProfile(userId);
      const customerId = profile?.customer?.id;

      if (!customerId) {
        sendError(res, 'Customer profile is required to manage wishlist', HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
        return;
      }

      const { productId } = wishlistAddSchema.parse(req.body);
      await catalogService.addToWishlist(customerId, productId);

      sendSuccess(res, { success: true }, 'Product added to wishlist successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Wishlist: remove item.
   */
  public removeFromWishlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authorization required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authRepository.findUserWithProfile(userId);
      const customerId = profile?.customer?.id;

      if (!customerId) {
        sendError(res, 'Customer profile is required to manage wishlist', HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
        return;
      }

      const productId = req.params.id as string;
      await catalogService.removeFromWishlist(customerId, productId);

      sendSuccess(res, { success: true }, 'Product removed from wishlist successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Recently Viewed list.
   */
  public getRecentViews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authorization required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authRepository.findUserWithProfile(userId);
      const customerId = profile?.customer?.id;

      if (!customerId) {
        sendError(res, 'Customer profile required', HttpStatus.FORBIDDEN, ErrorCodes.FORBIDDEN);
        return;
      }

      const history = await catalogService.getRecentViews(customerId);
      sendSuccess(res, history, 'Recent views history fetched successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const catalogController = new CatalogController();
export default catalogController;

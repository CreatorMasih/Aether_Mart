import { Request, Response, NextFunction } from 'express';
import { merchantService } from './merchant.service';
import { merchantRepository } from './merchant.repository';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { 
  updateMerchantProfileSchema, 
  createProductSchema, 
  updateProductSchema, 
  assignRiderSchema 
} from './merchant.validator';

export class MerchantController {
  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const result = await merchantService.getStoreProfile(userId);
      sendSuccess(res, result, 'Merchant store profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const products = await merchantService.getMerchantProducts(userId);
      sendSuccess(res, products, 'Merchant products retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const parsedBody = updateMerchantProfileSchema.parse(req.body);
      const result = await merchantService.updateMerchantProfile(userId, parsedBody);

      sendSuccess(res, result, 'Merchant profile and store settings updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public softDeleteMerchant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      if (!userId || !role) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const targetMerchantId = req.params.id as string;
      await merchantService.softDeleteMerchant(userId, targetMerchantId, role);

      sendSuccess(res, null, 'Merchant profile soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const parsedBody = createProductSchema.parse(req.body);
      const result = await merchantService.createProduct(userId, parsedBody);

      sendSuccess(res, result, 'Product and variants created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  };

  public updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const productId = req.params.id as string;
      const parsedBody = updateProductSchema.parse(req.body);
      const result = await merchantService.updateProduct(userId, productId, parsedBody);

      sendSuccess(res, result, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public softDeleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const productId = req.params.id as string;
      await merchantService.softDeleteProduct(userId, productId);

      sendSuccess(res, null, 'Product soft-deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  public getStoreOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const store = await merchantRepository.findStoreByUserId(userId);
      if (!store) {
        sendError(res, 'Associated Store not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
        return;
      }

      const orders = await merchantRepository.findStoreOrders(store.id);
      sendSuccess(res, orders, 'Store orders retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public assignRider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const orderId = req.params.orderId as string;
      const parsedBody = assignRiderSchema.parse(req.body);
      const assignment = await merchantService.assignRider(userId, orderId, parsedBody);

      sendSuccess(res, assignment, 'Rider assignment process initiated successfully');
    } catch (error) {
      next(error);
    }
  };

  public getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const stats = await merchantService.getDashboardStats(userId);
      sendSuccess(res, stats, 'Merchant dashboard analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getPayouts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const payouts = await merchantService.getPayouts(userId);
      sendSuccess(res, payouts, 'Merchant settlement payouts retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const merchantController = new MerchantController();
export default merchantController;

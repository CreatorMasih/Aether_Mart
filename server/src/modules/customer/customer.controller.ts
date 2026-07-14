import { Request, Response, NextFunction } from 'express';
import { customerService } from './customer.service';
import { addressSchema } from './customer.validator';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';

export class CustomerController {
  public getAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const addresses = await customerService.getAddresses(userId);
      sendSuccess(res, addresses, 'Addresses fetched successfully');
    } catch (error) {
      next(error);
    }
  };

  public createAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const parsedData = addressSchema.parse(req.body);
      const address = await customerService.createAddress(userId, parsedData);
      sendSuccess(res, address, 'Address created successfully', HttpStatus.CREATED);
    } catch (error) {
      next(error);
    }
  };

  public updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const addressId = req.params.id as string;
      const parsedData = addressSchema.parse(req.body);
      const address = await customerService.updateAddress(userId, addressId, parsedData);
      sendSuccess(res, address, 'Address updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const addressId = req.params.id as string;
      await customerService.deleteAddress(userId, addressId);
      sendSuccess(res, null, 'Address deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const customerController = new CustomerController();
export default customerController;

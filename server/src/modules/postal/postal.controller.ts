import { Request, Response, NextFunction } from 'express';
import { postalService } from './postal.service';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';

export class PostalController {
  /**
   * GET /api/postal/pincode/:pincode
   */
  public getPincodeDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pincode = String(req.params.pincode || '').trim();
      
      // Validation: Indian PINCODE is 6 digits
      if (!/^\d{6}$/.test(pincode)) {
        sendError(res, 'Invalid pincode format. Pincode must be a 6-digit number.', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PAYLOAD);
        return;
      }

      const data = await postalService.lookupPincode(pincode);
      if (!data) {
        sendError(res, `No details found for pincode ${pincode}`, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
        return;
      }

      sendSuccess(res, data, 'Pincode details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/postal/city/:city
   */
  public getCityDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const city = String(req.params.city || '').trim();

      if (!city || city.length < 2) {
        sendError(res, 'Invalid city name. Please enter at least 2 characters.', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PAYLOAD);
        return;
      }

      const data = await postalService.lookupCity(city);
      if (!data) {
        sendError(res, `No details found for city ${city}`, HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
        return;
      }

      sendSuccess(res, data, 'City details retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const postalController = new PostalController();
export default postalController;

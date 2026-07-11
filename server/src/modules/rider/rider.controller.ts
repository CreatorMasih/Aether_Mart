import { Request, Response, NextFunction } from 'express';
import { riderService } from './rider.service';
import { riderRepository } from './rider.repository';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { 
  updateRiderProfileSchema, 
  riderHeartbeatSchema, 
  confirmPickupSchema, 
  confirmDeliverySchema 
} from './rider.validator';

export class RiderController {
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const parsedBody = updateRiderProfileSchema.parse(req.body);
      const result = await riderService.updateRiderProfile(userId, parsedBody);

      sendSuccess(res, result, 'Rider profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  public heartbeat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const parsedBody = riderHeartbeatSchema.parse(req.body);
      const result = await riderService.saveHeartbeat(userId, parsedBody);

      sendSuccess(res, result, 'Heartbeat and coordinates logged successfully');
    } catch (error) {
      next(error);
    }
  };

  public getAvailableDeliveries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
      const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

      const deliveries = await riderService.findAvailableDeliveries(userId, lat, lng);
      sendSuccess(res, deliveries, 'Available delivery shipments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public getAssignments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const rider = await riderRepository.findRiderByUserId(userId);
      if (!rider) {
        sendError(res, 'Rider profile not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
        return;
      }

      const history = await riderRepository.findRiderAssignments(rider.id);
      sendSuccess(res, history, 'Rider delivery assignments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  public acceptDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const orderId = req.params.orderId as string;
      const assignment = await riderService.acceptDelivery(userId, orderId);

      sendSuccess(res, assignment, 'Delivery assignment accepted');
    } catch (error) {
      next(error);
    }
  };

  public confirmPickup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const orderId = req.params.orderId as string;
      const { pickupOtp } = confirmPickupSchema.parse(req.body);
      const assignment = await riderService.confirmPickup(userId, orderId, pickupOtp);

      sendSuccess(res, assignment, 'Pickup confirmed. Shipment out for delivery');
    } catch (error) {
      next(error);
    }
  };

  public confirmDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const orderId = req.params.orderId as string;
      const { deliveryOtp } = confirmDeliverySchema.parse(req.body);
      const assignment = await riderService.confirmDelivery(userId, orderId, deliveryOtp);

      sendSuccess(res, assignment, 'Delivery confirmed successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const riderController = new RiderController();
export default riderController;

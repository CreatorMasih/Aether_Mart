import { Request, Response } from 'express';
import { locationService } from './location.service';
import { BadRequestError } from '../../common/middlewares/errorHandler.middleware';

export class LocationController {
  /**
   * Reverse Geocode GPS coordinates
   */
  public reverseGeocode = async (req: Request, res: Response): Promise<void> => {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestError('Latitude and longitude are required.');
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestError('Valid numeric latitude and longitude coordinates are required.');
    }

    const result = await locationService.reverseGeocode(lat, lng);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  };

  /**
   * Check Serviceability by query
   */
  public checkServiceability = async (req: Request, res: Response): Promise<void> => {
    const { city, pincode, latitude, longitude } = req.query;

    const result = locationService.checkServiceability({
      city: city ? String(city) : undefined,
      pincode: pincode ? String(pincode) : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  };
}

export const locationController = new LocationController();

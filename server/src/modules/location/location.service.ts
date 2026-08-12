import { checkServerServiceability, MAHASAMUND_CONFIG } from '../../config/serviceability.config';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('LocationService');

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  formattedAddress: string;
  isServiceable: boolean;
  serviceArea: string;
  message: string;
}

class LocationService {
  /**
   * Reverse Geocodes coordinates to Address fields and checks Mahasamund serviceability
   */
  public async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    log.info(`Reverse geocoding coordinates: ${latitude}, ${longitude}`);

    try {
      // 1. Call OpenStreetMap Nominatim reverse geocode with timeout
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        headers: { 'User-Agent': 'AetherMart/1.0 (support@aethermart.com)' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (response.ok) {
        const data: any = await response.json();
        const addr = data.address || {};

        const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Mahasamund';
        const district = addr.county || addr.state_district || addr.district || 'Mahasamund';
        const state = addr.state || 'Chhattisgarh';
        const country = addr.country || 'India';
        const pincode = addr.postcode || '493445';
        const formattedAddress = data.display_name || `${city}, ${district}, ${state}, ${country}`;

        const serviceability = checkServerServiceability({
          city,
          district,
          pincode,
          latitude,
          longitude,
        });

        return {
          latitude,
          longitude,
          city,
          district,
          state,
          country,
          pincode,
          formattedAddress,
          isServiceable: serviceability.isServiceable,
          serviceArea: serviceability.serviceArea,
          message: serviceability.message,
        };
      }
    } catch (error) {
      log.warn(`External reverse geocode failed or timed out. Falling back to mathematical bounding box evaluation.`, { error });
    }

    // 2. Fallback: Evaluate mathematically based on Mahasamund coordinates
    const serviceability = checkServerServiceability({ latitude, longitude });

    const isMahasamundArea = serviceability.isServiceable;
    return {
      latitude,
      longitude,
      city: isMahasamundArea ? MAHASAMUND_CONFIG.name : 'Unknown Location',
      district: isMahasamundArea ? MAHASAMUND_CONFIG.district : 'Outside Service Area',
      state: MAHASAMUND_CONFIG.state,
      country: MAHASAMUND_CONFIG.country,
      pincode: isMahasamundArea ? '493445' : '000000',
      formattedAddress: isMahasamundArea
        ? 'Station Road, Mahasamund, Chhattisgarh, India'
        : 'Outside Service Area, Chhattisgarh, India',
      isServiceable: serviceability.isServiceable,
      serviceArea: serviceability.serviceArea,
      message: serviceability.message,
    };
  }

  /**
   * Checks location serviceability based on query criteria
   */
  public checkServiceability(query: {
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  }) {
    return checkServerServiceability(query);
  }
}

export const locationService = new LocationService();
export default locationService;

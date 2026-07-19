import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('PostalService');

interface PincodeData {
  pincode: string;
  city: string;
  district: string;
  state: string;
  country: string;
  postOffices: string[];
}

interface CityData {
  city: string;
  district: string;
  state: string;
  country: string;
  pincodes: string[];
}

class PostalService {
  // Simple in-memory cache
  private pincodeCache = new Map<string, PincodeData>();
  private cityCache = new Map<string, CityData>();

  /**
   * Look up address details by PINCODE
   */
  public async lookupPincode(pincode: string): Promise<PincodeData | null> {
    const cleanPincode = pincode.trim();
    if (this.pincodeCache.has(cleanPincode)) {
      log.info(`Pincode cache hit for: ${cleanPincode}`);
      return this.pincodeCache.get(cleanPincode)!;
    }

    log.info(`Fetching pincode details from postal API for: ${cleanPincode}`);
    const url = `https://api.postalpincode.in/pincode/${cleanPincode}`;

    const fetchWithRetry = async (retries = 2): Promise<any> => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Postal API responded with status ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        if (retries > 0) {
          log.warn(`Retrying postal API request for pincode ${cleanPincode}. Retries left: ${retries}`);
          await new Promise((res) => setTimeout(res, 1000));
          return fetchWithRetry(retries - 1);
        }
        throw err;
      }
    };

    try {
      const data = await fetchWithRetry();
      if (!Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
        log.warn(`No valid data returned for pincode: ${cleanPincode}`);
        return null;
      }

      const postOffices = data[0].PostOffice;
      if (!Array.isArray(postOffices) || postOffices.length === 0) {
        return null;
      }

      // Format response using the first matching PostOffice record
      const first = postOffices[0];
      const result: PincodeData = {
        pincode: cleanPincode,
        city: first.District || first.Division || 'Unknown',
        district: first.District || 'Unknown',
        state: first.State || 'Unknown',
        country: first.Country || 'India',
        postOffices: postOffices.map((po: any) => po.Name).filter(Boolean),
      };

      // Store in cache
      this.pincodeCache.set(cleanPincode, result);
      return result;
    } catch (error) {
      log.error(`Error looking up pincode ${cleanPincode}`, { error });
      throw error;
    }
  }

  /**
   * Look up pincodes and region details by CITY name
   */
  public async lookupCity(city: string): Promise<CityData | null> {
    const cleanCity = city.trim();
    const cacheKey = cleanCity.toLowerCase();
    if (this.cityCache.has(cacheKey)) {
      log.info(`City cache hit for: ${cleanCity}`);
      return this.cityCache.get(cacheKey)!;
    }

    log.info(`Fetching city details from postal API for: ${cleanCity}`);
    const url = `https://api.postalpincode.in/postoffice/${encodeURIComponent(cleanCity)}`;

    const fetchWithRetry = async (retries = 2): Promise<any> => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Postal API responded with status ${response.status}`);
        }
        return await response.json();
      } catch (err) {
        if (retries > 0) {
          log.warn(`Retrying postal API request for city ${cleanCity}. Retries left: ${retries}`);
          await new Promise((res) => setTimeout(res, 1000));
          return fetchWithRetry(retries - 1);
        }
        throw err;
      }
    };

    try {
      const data = await fetchWithRetry();
      if (!Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
        log.warn(`No valid data returned for city: ${cleanCity}`);
        return null;
      }

      const postOffices = data[0].PostOffice;
      if (!Array.isArray(postOffices) || postOffices.length === 0) {
        return null;
      }

      const first = postOffices[0];
      const uniquePincodes = Array.from(
        new Set(postOffices.map((po: any) => po.Pincode).filter(Boolean))
      ) as string[];

      const result: CityData = {
        city: cleanCity,
        district: first.District || 'Unknown',
        state: first.State || 'Unknown',
        country: first.Country || 'India',
        pincodes: uniquePincodes,
      };

      // Store in cache
      this.cityCache.set(cacheKey, result);
      return result;
    } catch (error) {
      log.error(`Error looking up city ${cleanCity}`, { error });
      throw error;
    }
  }
}

export const postalService = new PostalService();
export default postalService;

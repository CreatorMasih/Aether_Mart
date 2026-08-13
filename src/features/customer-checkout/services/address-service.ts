import { apiClient } from '../../../core/network/api-client';
import type { Address } from '../../../types';

export interface CreateAddressInput {
  label: 'Home' | 'Work' | 'Other';
  receiverName?: string;
  receiverPhone?: string;
  streetAddress: string;
  apartmentSuite?: string;
  houseNumber?: string;
  landmark?: string;
  postalCode: string;
  city: string;
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export const addressService = {
  /**
   * Fetches all persistent delivery addresses for the authenticated customer from PostgreSQL.
   */
  async getAddresses(): Promise<Address[]> {
    const response = await apiClient.get('/customer/addresses');
    return response.data.data;
  },

  /**
   * Creates a new delivery address in PostgreSQL.
   */
  async createAddress(input: CreateAddressInput): Promise<Address> {
    const response = await apiClient.post('/customer/addresses', input);
    return response.data.data;
  },

  /**
   * Updates an existing delivery address in PostgreSQL.
   */
  async updateAddress(id: string, input: Partial<CreateAddressInput>): Promise<Address> {
    const response = await apiClient.put(`/customer/addresses/${id}`, input);
    return response.data.data;
  },

  /**
   * Deletes a delivery address from PostgreSQL.
   */
  async deleteAddress(id: string): Promise<void> {
    await apiClient.delete(`/customer/addresses/${id}`);
  },

  /**
   * Auto-fills city, district, and state using the postal pincode API.
   */
  async getPincodeDetails(pincode: string): Promise<{ city: string; district: string; state: string } | null> {
    try {
      const response = await apiClient.get(`/postal/pincode/${pincode}`);
      if (response.data?.success && response.data?.data) {
        return {
          city: response.data.data.city || response.data.data.district || 'Mahasamund',
          district: response.data.data.district || 'Mahasamund',
          state: response.data.data.state || 'Chhattisgarh',
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Reverse geocodes coordinates via location API for [ Use Current Location ].
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<any> {
    try {
      const response = await apiClient.post('/location/reverse-geocode', { latitude, longitude });
      return response.data?.data ?? null;
    } catch {
      return null;
    }
  },
};

import { BaseRepository } from '../../../core/network/base-repository';
import { API_ENDPOINTS } from '../../../core/config/constants';
import type { 
  OtpSendRequest, 
  OtpVerifyRequest, 
  ProfileCompletionRequest 
} from '../types/auth';
import type { User } from '../../../types';

interface AuthResponseDTO {
  token: string;
  user: User;
}

export class AuthService extends BaseRepository {
  /**
   * Triggers OTP delivery to SMS/Email
   */
  public async sendOtp(request: OtpSendRequest): Promise<boolean> {
    return this.executeRequest(async () => {
      interface SendOtpResponse {
        success: boolean;
        data: null;
        message: string;
      }
      const response = await this.client.post<SendOtpResponse>(
        API_ENDPOINTS.auth.login, 
        request
      );
      return response.data.success;
    });
  }

  /**
   * Validates OTP and sets up active user session
   */
  public async verifyOtp(request: OtpVerifyRequest): Promise<AuthResponseDTO> {
    return this.executeRequest(async () => {
      interface BackendResponse<T> {
        success: boolean;
        data: T;
        message: string;
      }
      const response = await this.client.post<BackendResponse<AuthResponseDTO>>(
        API_ENDPOINTS.auth.verifyOtp, 
        request
      );
      return response.data.data;
    });
  }

  /**
   * Retrieves active authenticated user details
   */
  public async getCurrentUser(): Promise<User> {
    return this.executeRequest(async () => {
      interface BackendResponse<T> {
        success: boolean;
        data: T;
        message: string;
      }
      const response = await this.client.get<BackendResponse<User>>(
        API_ENDPOINTS.auth.me
      );
      return response.data.data;
    });
  }

  /**
   * Finalizes user details completion flow
   */
  public async completeProfile(request: ProfileCompletionRequest, _userId: string, _phone: string, _email?: string): Promise<User> {
    return this.executeRequest(async () => {
      interface BackendResponse<T> {
        success: boolean;
        data: T;
        message: string;
      }

      // Translate coordinates to flat fields for backend schema mapping
      const payload: any = { role: request.role };
      if (request.role === 'CUSTOMER' && request.customerDetails) {
        payload.customerDetails = {
          fullName: request.customerDetails.fullName,
          email: request.customerDetails.email,
        };
        if (request.customerDetails.defaultAddress) {
          const { coordinates, ...rest } = request.customerDetails.defaultAddress;
          payload.customerDetails.defaultAddress = {
            ...rest,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          };
        }
      } else if (request.role === 'SHOPKEEPER' && request.merchantDetails) {
        const { coordinates, ...rest } = request.merchantDetails;
        payload.merchantDetails = {
          ...rest,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        };
      } else if (request.role === 'RIDER' && request.riderDetails) {
        payload.riderDetails = request.riderDetails;
      }

      const response = await this.client.post<BackendResponse<User>>(
        API_ENDPOINTS.auth.completeProfile, 
        payload
      );
      return response.data.data;
    });
  }

  /**
   * Revokes token session
   */
  public async logout(): Promise<boolean> {
    return this.executeRequest(async () => {
      interface BackendResponse<T> {
        success: boolean;
        data: T;
        message: string;
      }
      const response = await this.client.post<BackendResponse<any>>(
        API_ENDPOINTS.auth.logout
      );
      return response.data.success;
    });
  }

  /**
   * Revokes all active tokens/sessions across all devices
   */
  public async logoutAll(): Promise<boolean> {
    return this.executeRequest(async () => {
      interface BackendResponse<T> {
        success: boolean;
        data: T;
        message: string;
      }
      const response = await this.client.post<BackendResponse<any>>(
        '/auth/logout-all'
      );
      return response.data.success;
    });
  }
}

export const authService = new AuthService();
export default authService;

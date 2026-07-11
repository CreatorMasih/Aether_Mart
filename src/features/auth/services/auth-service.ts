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
      // Simulate real HTTP endpoint trigger
      if (import.meta.env.VITE_APP_ENV === 'development') {
        await new Promise((resolve) => setTimeout(resolve, 800));
        console.log(`[Mock SMS/Email Provider] OTP delivered to: ${request.identifier}`);
        return true;
      }
      
      const response = await this.client.post<{ success: boolean }>(
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
      if (import.meta.env.VITE_APP_ENV === 'development') {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Mock User Profile details
        const mockUser: User = {
          id: `usr-${Math.random().toString(36).substring(2, 9)}`,
          phone: request.method === 'PHONE' ? request.identifier : '+91 99999 99999',
          email: request.method === 'EMAIL' ? request.identifier : undefined,
          fullName: undefined, // Enforces profile completion setup flow
          role: request.role,
          walletBalance: 0,
          savedAddresses: [],
        };
        
        return {
          token: 'mock-jwt-access-token-string',
          user: mockUser,
        };
      }

      const response = await this.client.post<AuthResponseDTO>(
        API_ENDPOINTS.auth.verifyOtp, 
        request
      );
      return response.data;
    });
  }

  /**
   * Finalizes user details completion flow
   */
  public async completeProfile(request: ProfileCompletionRequest, userId: string, phone: string, email?: string): Promise<User> {
    return this.executeRequest(async () => {
      if (import.meta.env.VITE_APP_ENV === 'development') {
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        // Construct complete User profile
        const completedUser: User = {
          id: userId,
          phone,
          email: email || (request.role === 'CUSTOMER' ? request.customerDetails?.email : request.role === 'SHOPKEEPER' ? request.merchantDetails?.email : request.riderDetails?.email),
          fullName: request.role === 'CUSTOMER' ? request.customerDetails?.fullName : request.role === 'SHOPKEEPER' ? request.merchantDetails?.fullName : request.riderDetails?.fullName,
          role: request.role,
          walletBalance: 50, // Initial sign-up bonus!
          savedAddresses: request.role === 'CUSTOMER' && request.customerDetails?.defaultAddress ? [
            {
              id: 'addr-default',
              ...request.customerDetails.defaultAddress,
            }
          ] : [],
        };
        
        return completedUser;
      }

      const response = await this.client.post<User>(
        API_ENDPOINTS.customer.profile, 
        request
      );
      return response.data;
    });
  }

  /**
   * Revokes token session
   */
  public async logout(): Promise<boolean> {
    return this.executeRequest(async () => {
      if (import.meta.env.VITE_APP_ENV === 'development') {
        return true;
      }
      
      const response = await this.client.post<{ success: boolean }>(
        API_ENDPOINTS.auth.logout
      );
      return response.data.success;
    });
  }
}

export const authService = new AuthService();
export default authService;

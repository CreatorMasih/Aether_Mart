import type { UserRole } from '../../../core/config/constants';
import type { Address, GeoCoordinates } from '../../../types';

export type AuthMethod = 'PHONE' | 'EMAIL' | 'GOOGLE' | 'APPLE' | 'WHATSAPP';

export interface OtpSendRequest {
  identifier: string; // Phone number or Email address
  type: 'SMS' | 'EMAIL';
  role: UserRole;
}

export interface OtpVerifyRequest {
  identifier: string;
  code: string;
  role: UserRole;
  method: AuthMethod;
}

export interface CustomerProfileCompletion {
  fullName: string;
  email: string;
  defaultAddress: Omit<Address, 'id'>;
}

export interface MerchantProfileCompletion {
  fullName: string;
  email: string;
  storeName: string;
  storeAddress: string;
  coordinates: GeoCoordinates;
  deliveryRadiusKm: number;
}

export interface RiderProfileCompletion {
  fullName: string;
  email: string;
  vehicleType: 'BICYCLE' | 'MOTORBIKE';
  vehiclePlateNumber?: string;
}

export interface ProfileCompletionRequest {
  role: UserRole;
  customerDetails?: CustomerProfileCompletion;
  merchantDetails?: MerchantProfileCompletion;
  riderDetails?: RiderProfileCompletion;
}

export interface GoogleLoginRequest {
  token: string;
  role: UserRole;
}

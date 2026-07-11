/**
 * Auth module shared types.
 * Placed here so they can be imported by other modules (e.g., express.d.ts, middlewares).
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'SHOPKEEPER' | 'RIDER' | 'ADMIN';

export type AuthMethod = 'PHONE' | 'EMAIL' | 'GOOGLE' | 'APPLE' | 'WHATSAPP';

export type OtpChannel = 'SMS' | 'EMAIL';

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'VERIFY_PHONE' | 'VERIFY_EMAIL';

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface SendOtpDto {
  identifier: string; // Phone number or email address
  type: OtpChannel;
  role: UserRole;
  purpose?: OtpPurpose;
}

export interface VerifyOtpDto {
  identifier: string;
  code: string;
  role: UserRole;
  method: AuthMethod;
}

export interface RefreshTokenDto {
  // Refresh token comes from HTTP-only cookie, not request body
}

export interface CompleteProfileDto {
  role: UserRole;
  customerDetails?: CustomerProfileDto;
  merchantDetails?: MerchantProfileDto;
  riderDetails?: RiderProfileDto;
}

export interface CustomerProfileDto {
  fullName: string;
  email?: string;
  defaultAddress?: AddressDto;
}

export interface MerchantProfileDto {
  fullName: string;
  email: string;
  storeName: string;
  storeAddress: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
}

export interface RiderProfileDto {
  fullName: string;
  email?: string;
  vehicleType: 'BICYCLE' | 'MOTORBIKE';
  vehiclePlateNumber?: string;
}

export interface AddressDto {
  label: 'Home' | 'Work' | 'Other';
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  apartmentSuite?: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ForgotPasswordDto {
  identifier: string; // Email
  type: OtpChannel;
}

export interface ResetPasswordDto {
  identifier: string;
  code: string;
  newPassword: string;
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface AuthTokensDto {
  accessToken: string;
  expiresIn: number; // seconds
}

export interface UserSessionDto {
  id: string;
  phone?: string;
  email?: string;
  fullName?: string;
  role: UserRole;
  isProfileComplete: boolean;
  walletBalance: number;
  avatarUrl?: string;
}

export interface AuthResponseDto {
  token: string; // accessToken (named 'token' to match frontend contract)
  user: UserSessionDto;
}

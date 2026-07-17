import { authRepository } from './auth.repository';
import { otpService } from '../../common/services/otp.service';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.util';
import { UserRole, OtpChannel, AuthMethod, UserStatus } from '@prisma/client';
import { AppError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../common/middlewares/errorHandler.middleware';
import { HttpStatus, ErrorCodes } from '../../utils/response.util';
import { createModuleLogger } from '../../utils/logger';
import emailService from '../../common/services/email.service';
import { v4 as uuidv4 } from 'uuid';
import { googleAuthService } from './google.service';

const log = createModuleLogger('AuthService');

export class AuthService {
  /**
   * Triggers OTP generation and delivery.
   */
  public async sendOtp(identifier: string, type: OtpChannel, role: UserRole): Promise<boolean> {
    // Check if account is suspended/blocked first if user exists
    const user = await authRepository.findUserByIdentifier(identifier);
    if (user && (user.status === UserStatus.BLOCKED || user.status === UserStatus.SUSPENDED)) {
      throw new AppError(
        `This account is ${user.status.toLowerCase()}. Please contact support.`,
        HttpStatus.FORBIDDEN,
        ErrorCodes.ACCOUNT_SUSPENDED
      );
    }

    // Delegate to OTP service (hashing, expiry, send logic)
    return otpService.generateAndSendOtp(identifier, type, role, 'LOGIN');
  }

  /**
   * Verifies the OTP and signs a new token session.
   * Performs dynamic user creation if the user does not exist.
   */
  public async verifyOtpAndLogin(params: {
    identifier: string;
    code: string;
    role: UserRole;
    method: AuthMethod;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ tokens: any; user: any }> {
    // 1. Verify OTP
    await otpService.verifyOtp(params.identifier, params.code, params.role, 'LOGIN');

    // 2. Find or dynamically create user
    let user = await authRepository.findUserByIdentifier(params.identifier);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const isEmail = params.identifier.includes('@');
      user = await authRepository.createUser({
        email: isEmail ? params.identifier : undefined,
        phone: !isEmail ? params.identifier : undefined,
        role: params.role,
        isVerified: true,
      });
      log.info(`New user registered dynamically: ${user.id} (${params.role})`);
    } else {
      // If user exists, verify role matches
      if (user.role !== params.role) {
        throw new AppError(
          `Incorrect role. This account is registered as ${user.role}.`,
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // 3. Check account status
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        `This account is ${user.status.toLowerCase()}. Please contact support.`,
        HttpStatus.FORBIDDEN,
        ErrorCodes.ACCOUNT_SUSPENDED
      );
    }

    // 4. Generate token pair
    const tokenFamily = uuidv4();
    const payload = {
      userId: user.id,
      role: user.role,
      email: user.email || undefined,
      phone: user.phone || undefined,
    };

    const tokens = generateTokenPair(payload);
    
    // Calculate refresh token expiry date (7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token in DB
    await authRepository.createRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
      deviceId: params.deviceId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      family: tokenFamily,
    });

    // 5. Gather profile status
    const fullUser = await authRepository.findUserWithProfile(user.id);
    const isProfileComplete = this.checkProfileCompletion(fullUser);

    const savedAddresses = (fullUser.addresses || []).map((addr: any) => ({
      id: addr.id,
      label: addr.label,
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      streetAddress: addr.streetAddress,
      apartmentSuite: addr.apartmentSuite || undefined,
      postalCode: addr.postalCode,
      city: addr.city,
      coordinates: {
        latitude: addr.latitude,
        longitude: addr.longitude,
      },
    }));

    const userSession = {
      id: user.id,
      phone: user.phone || undefined,
      email: user.email || undefined,
      fullName: isProfileComplete ? this.extractFullName(fullUser) : undefined,
      role: user.role,
      isProfileComplete,
      walletBalance: fullUser.customer?.wallet?.balance || 0,
      avatarUrl: undefined,
      savedAddresses,
    };

    return {
      tokens,
      user: userSession,
    };
  }

  /**
   * Validates Google ID Token and logs in or registers the user.
   */
  public async googleLogin(params: {
    token: string;
    role: UserRole;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ tokens: any; user: any }> {
    // 1. Verify Google Token
    const profile = await googleAuthService.verifyToken(params.token);

    // 2. Find or dynamically create user using email from profile
    let user = await authRepository.findUserByIdentifier(profile.email);

    if (!user) {
      user = await authRepository.createUser({
        email: profile.email,
        role: params.role,
        isVerified: true,
      });
      log.info(`New user registered via Google: ${user.id} (${params.role})`);
    } else {
      // If user exists, verify role matches
      if (user.role !== params.role) {
        let portalName = 'Customer';
        if (user.role === 'SHOPKEEPER') portalName = 'Merchant';
        else if (user.role === 'RIDER') portalName = 'Rider';
        else if (user.role === 'ADMIN') portalName = 'Super Admin';

        const roleDisplay = user.role === 'SHOPKEEPER' ? 'Rider' : user.role === 'RIDER' ? 'Rider' : user.role === 'CUSTOMER' ? 'Customer' : 'Super Admin';
        // Note: The prompt asks for: "This Google account is registered as a Rider. Please login using the Rider Portal."
        // We will output: "This Google account is registered as a <Role>. Please login using the <Portal> Portal."
        const finalRoleDisplay = user.role === 'SHOPKEEPER' ? 'Rider' : user.role === 'RIDER' ? 'Rider' : user.role === 'CUSTOMER' ? 'Customer' : 'Super Admin';
        // Wait, let's look at the example:
        // "This Google account is registered as a Rider. Please login using the Rider Portal."
        // If role is SHOPKEEPER, is it registered as a Merchant? Wait! The prompt enum uses SHOPKEEPER but the user refers to it as Merchant/Shopkeeper. Let's make it match:
        const promptRoleDisplay = user.role === 'SHOPKEEPER' ? 'Merchant' : user.role === 'RIDER' ? 'Rider' : user.role === 'CUSTOMER' ? 'Customer' : 'Super Admin';

        throw new AppError(
          `This Google account is registered as a ${promptRoleDisplay}. Please login using the ${portalName} Portal.`,
          HttpStatus.FORBIDDEN,
          ErrorCodes.FORBIDDEN
        );
      }
    }

    // 3. Check account status
    if (user.status === UserStatus.BLOCKED || user.status === UserStatus.SUSPENDED) {
      throw new AppError(
        `This account is ${user.status.toLowerCase()}. Please contact support.`,
        HttpStatus.FORBIDDEN,
        ErrorCodes.ACCOUNT_SUSPENDED
      );
    }

    // 4. Generate token pair
    const tokenFamily = uuidv4();
    const payload = {
      userId: user.id,
      role: user.role,
      email: user.email || undefined,
      phone: user.phone || undefined,
    };

    const tokens = generateTokenPair(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token in DB
    await authRepository.createRefreshToken({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
      deviceId: params.deviceId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      family: tokenFamily,
    });

    // 5. Gather profile status
    const fullUser = await authRepository.findUserWithProfile(user.id);
    const isProfileComplete = this.checkProfileCompletion(fullUser);

    const savedAddresses = (fullUser.addresses || []).map((addr: any) => ({
      id: addr.id,
      label: addr.label,
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      streetAddress: addr.streetAddress,
      apartmentSuite: addr.apartmentSuite || undefined,
      postalCode: addr.postalCode,
      city: addr.city,
      coordinates: {
        latitude: addr.latitude,
        longitude: addr.longitude,
      },
    }));

    const userSession = {
      id: user.id,
      phone: user.phone || undefined,
      email: user.email || undefined,
      fullName: isProfileComplete ? this.extractFullName(fullUser) : (profile.name || undefined),
      role: user.role,
      isProfileComplete,
      walletBalance: fullUser.customer?.wallet?.balance || 0,
      avatarUrl: profile.picture || undefined,
      savedAddresses,
    };

    return {
      tokens,
      user: userSession,
    };
  }

  /**
   * Refreshes access tokens using Refresh Token Rotation (RTR).
   * Mitigates replay attacks by revoking the whole family if a token is reused.
   */
  public async rotateTokens(params: {
    refreshToken: string;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<any> {
    // 1. Verify token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(params.refreshToken);
    } catch (e) {
      throw new UnauthorizedError('Invalid or expired refresh session', ErrorCodes.REFRESH_TOKEN_INVALID);
    }

    // 2. Lookup token in DB
    const dbToken = await authRepository.findRefreshToken(params.refreshToken);

    if (!dbToken) {
      throw new UnauthorizedError('Refresh session not found', ErrorCodes.REFRESH_TOKEN_INVALID);
    }

    // If token is already revoked, we detect a potential reuse attack!
    if (dbToken.isRevoked) {
      log.error(`POTENTIAL REPLAY ATTACK: Revoked token family reuse detected for user ${dbToken.userId}`);
      if (dbToken.family) {
        await authRepository.revokeRefreshTokenFamily(dbToken.family);
      }
      throw new UnauthorizedError('Session hijacked. Please login again.', ErrorCodes.REFRESH_TOKEN_INVALID);
    }

    // Check if token has expired
    if (new Date() > dbToken.expiresAt) {
      await authRepository.revokeRefreshToken(dbToken.id);
      throw new UnauthorizedError('Session expired. Please login again.', ErrorCodes.REFRESH_TOKEN_INVALID);
    }

    // 3. Mark old token as revoked
    await authRepository.revokeRefreshToken(dbToken.id);

    // 4. Generate new pair
    const payload = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      phone: decoded.phone,
    };

    const tokens = generateTokenPair(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save new token in DB under the same family
    await authRepository.createRefreshToken({
      userId: decoded.userId,
      token: tokens.refreshToken,
      expiresAt,
      deviceId: params.deviceId,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
      family: dbToken.family || uuidv4(),
    });

    return tokens;
  }

  /**
   * Revokes a refresh token session (Logout).
   */
  public async logout(token: string): Promise<void> {
    const dbToken = await authRepository.findRefreshToken(token);
    if (dbToken) {
      await authRepository.revokeRefreshToken(dbToken.id);
    }
  }

  /**
   * Revokes all refresh token sessions for a user (Logout All).
   */
  public async logoutAllDevices(userId: string): Promise<void> {
    await authRepository.revokeAllRefreshTokensForUser(userId);
  }

  /**
   * Validates profile completion inputs and configures relations.
   */
  public async completeProfile(userId: string, data: any): Promise<any> {
    const user = await authRepository.findUserWithProfile(userId);
    if (!user) throw new NotFoundError('User');

    if (user.role !== data.role) {
      throw new AppError('Role mismatch during profile completion', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PAYLOAD);
    }

    if (data.role === UserRole.CUSTOMER && data.customerDetails) {
      const details = data.customerDetails;
      await authRepository.createCustomerProfile(user.id, details.fullName, details.email);
      
      if (details.defaultAddress) {
        await authRepository.createAddress(user.id, {
          ...details.defaultAddress,
          isDefault: true,
        });
      }
      
      // Send Welcome Email
      if (details.email) {
        await emailService.sendWelcomeEmail(details.email, details.fullName);
      }
    } 
    else if (data.role === UserRole.SHOPKEEPER && data.merchantDetails) {
      const details = data.merchantDetails;
      const merchant = await authRepository.createMerchantProfile(user.id, details.fullName, details.email);
      
      await authRepository.createStore(merchant.id, {
        name: details.storeName,
        address: details.storeAddress,
        latitude: details.latitude,
        longitude: details.longitude,
        deliveryRadiusKm: details.deliveryRadiusKm,
      });

      // Update merchant optional details if present
      const merchantData: any = {};
      if (details.gstNumber) merchantData.gstNumber = details.gstNumber;
      if (details.fssaiNumber) merchantData.fssaiNumber = details.fssaiNumber;
      if (Object.keys(merchantData).length > 0) {
        await authRepository.updateMerchantProfile(merchant.id, merchantData);
      }

      await emailService.sendWelcomeEmail(details.email, details.fullName);
    } 
    else if (data.role === UserRole.RIDER && data.riderDetails) {
      const details = data.riderDetails;
      await authRepository.createRiderProfile(
        user.id,
        details.fullName,
        details.vehicleType,
        details.vehiclePlateNumber,
        details.licenseNumber,
        details.email
      );

      if (details.email) {
        await emailService.sendWelcomeEmail(details.email, details.fullName);
      }
    }

    // Return the updated session details
    const updatedUser = await authRepository.findUserWithProfile(user.id);
    const updatedAddresses = (updatedUser.addresses || []).map((addr: any) => ({
      id: addr.id,
      label: addr.label,
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      streetAddress: addr.streetAddress,
      apartmentSuite: addr.apartmentSuite || undefined,
      postalCode: addr.postalCode,
      city: addr.city,
      coordinates: {
        latitude: addr.latitude,
        longitude: addr.longitude,
      },
    }));

    return {
      id: updatedUser.id,
      phone: updatedUser.phone || undefined,
      email: updatedUser.email || undefined,
      fullName: this.extractFullName(updatedUser),
      role: updatedUser.role,
      isProfileComplete: true,
      walletBalance: updatedUser.customer?.wallet?.balance || 0,
      avatarUrl: undefined,
      savedAddresses: updatedAddresses,
    };
  }

  /**
   * Retrieves profile details of the active user.
   */
  public async getProfile(userId: string): Promise<any> {
    const user = await authRepository.findUserWithProfile(userId);
    if (!user) throw new NotFoundError('User');

    const isProfileComplete = this.checkProfileCompletion(user);
    const savedAddresses = (user.addresses || []).map((addr: any) => ({
      id: addr.id,
      label: addr.label,
      receiverName: addr.receiverName,
      receiverPhone: addr.receiverPhone,
      streetAddress: addr.streetAddress,
      apartmentSuite: addr.apartmentSuite || undefined,
      postalCode: addr.postalCode,
      city: addr.city,
      coordinates: {
        latitude: addr.latitude,
        longitude: addr.longitude,
      },
    }));

    return {
      id: user.id,
      phone: user.phone || undefined,
      email: user.email || undefined,
      fullName: isProfileComplete ? this.extractFullName(user) : undefined,
      role: user.role,
      isProfileComplete,
      walletBalance: user.customer?.wallet?.balance || 0,
      avatarUrl: undefined,
      profile: user.customer || user.merchant || user.rider || null,
      savedAddresses,
    };
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  private checkProfileCompletion(user: any): boolean {
    if (user.role === UserRole.CUSTOMER) return !!user.customer;
    if (user.role === UserRole.SHOPKEEPER) return !!user.merchant;
    if (user.role === UserRole.RIDER) return !!user.rider;
    return true; // Admin is always "complete"
  }

  private extractFullName(user: any): string | undefined {
    return user.customer?.fullName || user.merchant?.fullName || user.rider?.fullName || 'Admin';
  }
}

export const authService = new AuthService();
export default authService;

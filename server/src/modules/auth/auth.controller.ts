import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { refreshTokenCookieOptions, clearRefreshTokenCookieOptions } from '../../utils/jwt.util';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('AuthController');

export class AuthController {
  /**
   * Triggers OTP sending flow.
   */
  public sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier, type, role } = req.body;
      const success = await authService.sendOtp(identifier, type, role);
      
      if (success) {
        sendSuccess(res, { success: true }, 'OTP sent successfully', HttpStatus.OK);
      } else {
        sendError(res, 'Failed to dispatch verification code', HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verifies OTP, registers or signs-in the user, and sets session cookies.
   */
  public verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { identifier, code, role, method } = req.body;
      
      const deviceId = req.headers['x-device-id'] as string || undefined;
      const userAgent = req.headers['user-agent'] || undefined;
      const ipAddress = req.ip || undefined;

      const { tokens, user } = await authService.verifyOtpAndLogin({
        identifier,
        code,
        role,
        method,
        deviceId,
        userAgent,
        ipAddress,
      });

      // Set Refresh Token as HTTP-only secure cookie
      res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions);

      // Return accessToken in payload to match frontend Axios wrapper contract
      sendSuccess(res, { token: tokens.accessToken, user }, 'Login successful', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Rotates JWT access and refresh token sessions.
   */
  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const oldRefreshToken = req.cookies.refreshToken;
      
      if (!oldRefreshToken) {
        sendError(res, 'Refresh token session is missing', HttpStatus.UNAUTHORIZED, ErrorCodes.REFRESH_TOKEN_INVALID);
        return;
      }

      const deviceId = req.headers['x-device-id'] as string || undefined;
      const userAgent = req.headers['user-agent'] || undefined;
      const ipAddress = req.ip || undefined;

      const tokens = await authService.rotateTokens({
        refreshToken: oldRefreshToken,
        deviceId,
        userAgent,
        ipAddress,
      });

      // Set new rotated Refresh Token in cookie
      res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions);

      sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revokes current active session (Logout).
   */
  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear cookie
      res.clearCookie('refreshToken', clearRefreshTokenCookieOptions);

      sendSuccess(res, { success: true }, 'Logged out successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Revokes all active user sessions (Logout all devices).
   */
  public logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      await authService.logoutAllDevices(userId);

      // Clear cookie
      res.clearCookie('refreshToken', clearRefreshTokenCookieOptions);

      sendSuccess(res, { success: true }, 'Logged out from all devices successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Retrieves profile details of the currently authenticated user.
   */
  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authService.getProfile(userId);
      sendSuccess(res, profile, 'Profile retrieved successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Finishes registration flow by completing profile configurations.
   */
  public completeProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        sendError(res, 'Authentication required', HttpStatus.UNAUTHORIZED, ErrorCodes.TOKEN_MISSING);
        return;
      }

      const profile = await authService.completeProfile(userId, req.body);
      sendSuccess(res, profile, 'Profile registration completed successfully', HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export default authController;

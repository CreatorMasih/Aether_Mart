import { prisma } from '../../config/database.config';
import { OtpChannel, UserRole } from '@prisma/client';
import { generateOtp, hashValue, compareValue } from '../../utils/hash.util';
import emailService from './email.service';
import smsService from './sms.service';
import { createModuleLogger } from '../../utils/logger';
import { AppError } from '../middlewares/errorHandler.middleware';
import { HttpStatus, ErrorCodes } from '../../utils/response.util';

const log = createModuleLogger('OtpService');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10);

export function getOtpMode(): 'dev' | 'production' {
  if (process.env.OTP_MODE === 'production') return 'production';
  if (process.env.OTP_MODE === 'dev') return 'dev';
  return process.env.NODE_ENV === 'production' ? 'production' : 'dev';
}

export class OtpService {
  /**
   * Generates a new 6-digit OTP, stores its hash, and dispatches it via Email or SMS.
   * Ensures only one active OTP exists per identifier.
   */
  public async generateAndSendOtp(
    identifier: string,
    channel: OtpChannel,
    role: UserRole,
    purpose: string = 'LOGIN'
  ): Promise<boolean> {
    log.info(`Generating OTP for ${identifier} via ${channel}`);

    // Clean up any existing active/unused OTPs for this user to enforce single active OTP
    await prisma.oTPVerification.updateMany({
      where: {
        identifier,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true }, // Mark older OTPs as used/invalidated
    });

    const mode = getOtpMode();
    const isDevMode = mode === 'dev';
    const rawOtp = isDevMode ? '123456' : generateOtp(6);
    
    // Hash it before storing for security
    const otpHash = await hashValue(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save in database
    await prisma.oTPVerification.create({
      data: {
        identifier,
        otpHash,
        type: channel,
        role,
        purpose,
        expiresAt,
        attempts: 0,
        isUsed: false,
      },
    });

    if (isDevMode) {
      log.info(`[DevMode/UAT] Verification code generated for ${identifier}: ${rawOtp}`);
      return true; // Bypass real SMS/Email provider calls in dev/UAT mode
    }

    log.info(`[Production] Verification code generated for ${identifier} via ${channel}`);

    // Send OTP in production mode
    if (channel === OtpChannel.EMAIL) {
      return emailService.sendOtpEmail(identifier, rawOtp, OTP_EXPIRY_MINUTES);
    } else {
      const smsResult = await smsService.sendOtp(identifier, rawOtp);
      if (!smsResult.success) {
        throw new AppError(
          smsResult.error || 'SMS service provider is unconfigured or unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
          ErrorCodes.INTERNAL_ERROR,
          { provider: smsResult.provider }
        );
      }
      return true;
    }
  }

  /**
   * Validates an OTP entered by the user.
   * Implements brute-force limit checks and invalidates OTP upon successful verification.
   */
  public async verifyOtp(
    identifier: string,
    code: string,
    role: UserRole,
    purpose: string = 'LOGIN'
  ): Promise<boolean> {
    // Find latest active OTP verification record
    const record = await prisma.oTPVerification.findFirst({
      where: {
        identifier,
        role,
        purpose,
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new AppError('No verification request found or OTP expired', HttpStatus.BAD_REQUEST, ErrorCodes.OTP_INVALID);
    }

    // Check if expired
    if (new Date() > record.expiresAt) {
      await prisma.oTPVerification.update({
        where: { id: record.id },
        data: { isUsed: true },
      });
      throw new AppError('Verification code has expired', HttpStatus.BAD_REQUEST, ErrorCodes.OTP_EXPIRED);
    }

    // Check brute-force attempts limit
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.oTPVerification.update({
        where: { id: record.id },
        data: { isUsed: true },
      });
      throw new AppError('Too many failed verification attempts. Please request a new code.', HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.OTP_MAX_ATTEMPTS);
    }

    // Compare values
    const isMatched = await compareValue(code, record.otpHash);

    if (!isMatched) {
      // Increment attempt counter for brute-force protection
      await prisma.oTPVerification.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      
      const attemptsRemaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
      throw new AppError(
        `Invalid verification code. ${attemptsRemaining} attempts remaining.`,
        HttpStatus.BAD_REQUEST,
        ErrorCodes.OTP_INVALID,
        { attemptsRemaining }
      );
    }

    // Invalidate the OTP now that it has been successfully verified
    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    return true;
  }
}

export const otpService = new OtpService();
export default otpService;

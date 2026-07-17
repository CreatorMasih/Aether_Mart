import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../../common/middlewares/errorHandler.middleware';
import { HttpStatus, ErrorCodes } from '../../utils/response.util';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('GoogleAuthService');

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export class GoogleAuthService {
  private client: OAuth2Client | null = null;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      this.client = new OAuth2Client(clientId);
    }
  }

  /**
   * Verifies Google ID Token securely.
   */
  public async verifyToken(idToken: string): Promise<GoogleProfile> {
    const isProd = process.env.NODE_ENV === 'production';

    // 1. Check development mock token
    if (!isProd && idToken.startsWith('mock-google-token-')) {
      const email = idToken.replace('mock-google-token-', '').trim();
      if (!email.includes('@')) {
        throw new AppError('Invalid mock email payload', HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_PAYLOAD);
      }
      log.info(`[DevMode] Verification bypassed using mock token for email: ${email}`);
      return {
        sub: `mock-google-sub-${email}`,
        email,
        email_verified: true,
        name: email.split('@')[0],
        given_name: email.split('@')[0],
        family_name: 'MockUser',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
      };
    }

    // 2. Reject mock tokens in production
    if (isProd && idToken.startsWith('mock-google-token-')) {
      log.error('SECURITY WARNING: Mock token login attempt blocked in production environment.');
      throw new AppError('Invalid Google authentication credentials.', HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);
    }

    // 3. Validate Google JWT format
    if (!idToken || typeof idToken !== 'string' || idToken.split('.').length !== 3) {
      throw new AppError('Invalid Google token format.', HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      log.error('GOOGLE_CLIENT_ID environment variable is missing.');
      throw new AppError('Google authentication is not configured on this server.', HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR);
    }

    if (!this.client) {
      this.client = new OAuth2Client(clientId);
    }

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new AppError('Google verification returned empty payload.', HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);
      }

      const { sub, email, email_verified, name, given_name, family_name, picture } = payload;

      if (!email) {
        throw new AppError('Email address missing in Google ID token.', HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);
      }

      if (!email_verified) {
        throw new AppError('Google email address must be verified.', HttpStatus.UNAUTHORIZED, ErrorCodes.UNAUTHORIZED);
      }

      return {
        sub,
        email,
        email_verified: !!email_verified,
        name: name || email.split('@')[0],
        given_name,
        family_name,
        picture,
      };
    } catch (error: any) {
      log.error('Google ID token verification failed:', error);
      throw new AppError(
        error.message || 'Google token validation failed.',
        HttpStatus.UNAUTHORIZED,
        ErrorCodes.UNAUTHORIZED
      );
    }
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;

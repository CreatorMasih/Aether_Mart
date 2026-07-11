import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('SmsService');

export interface SmsSendOptions {
  to: string; // Mobile number
  message: string;
}

export interface ISmsProvider {
  sendSms(options: SmsSendOptions): Promise<boolean>;
  sendOtp(to: string, otp: string): Promise<boolean>;
}

// ─── Twilio Provider ──────────────────────────────────────────────────────────

class TwilioProvider implements ISmsProvider {
  private client: any;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      try {
        // Dynamic require to prevent importing twilio if not configured
        const twilio = require('twilio');
        this.client = twilio(accountSid, authToken);
        log.info('Twilio SMS provider initialized');
      } catch (e) {
        log.error('Failed to initialize Twilio client', { error: e });
      }
    }
  }

  async sendSms(options: SmsSendOptions): Promise<boolean> {
    if (!this.client) {
      log.warn('Twilio client is not initialized');
      return false;
    }
    try {
      await this.client.messages.create({
        body: options.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: options.to,
      });
      return true;
    } catch (error) {
      log.error('Twilio SMS send failed', { error });
      return false;
    }
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    return this.sendSms({
      to,
      message: `${otp} is your Aether Mart login verification code. It is valid for 5 minutes.`,
    });
  }
}

// ─── MSG91 Provider ───────────────────────────────────────────────────────────

class Msg91Provider implements ISmsProvider {
  constructor() {
    if (process.env.MSG91_API_KEY) {
      log.info('MSG91 SMS provider initialized');
    }
  }

  async sendSms(options: SmsSendOptions): Promise<boolean> {
    log.info(`[MSG91 SMS Provider Mock] Sending SMS to ${options.to}: ${options.message}`);
    // Future implementation will make HTTP request to MSG91 API
    return true;
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    return this.sendSms({
      to,
      message: `${otp} is your verification code.`,
    });
  }
}

// ─── Disabled Provider (Fallback) ─────────────────────────────────────────────

class DisabledProvider implements ISmsProvider {
  async sendSms(options: SmsSendOptions): Promise<boolean> {
    log.info(`[SMS Provider Disabled] Mock SMS logged:
      TO: ${options.to}
      MESSAGE: ${options.message}
    `);
    return true;
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    log.info(`[SMS OTP Provider Disabled] Code ${otp} delivered mock-style to ${to}`);
    return true;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

class SmsService implements ISmsProvider {
  private provider: ISmsProvider;

  constructor() {
    const providerName = process.env.SMS_PROVIDER || 'disabled';
    
    if (providerName === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
      this.provider = new TwilioProvider();
    } else if (providerName === 'msg91') {
      this.provider = new Msg91Provider();
    } else {
      log.info('SMS OTP provider is currently disabled (mock logs only).');
      this.provider = new DisabledProvider();
    }
  }

  async sendSms(options: SmsSendOptions): Promise<boolean> {
    return this.provider.sendSms(options);
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    return this.provider.sendOtp(to, otp);
  }
}

export const smsService = new SmsService();
export default smsService;

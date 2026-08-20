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
      const res = await this.client.messages.create({
        body: options.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: options.to,
      });
      log.info(`[Twilio SMS Sent] SID: ${res.sid} to ${options.to}`);
      return true;
    } catch (error) {
      log.error('Twilio SMS send failed', { error });
      return false;
    }
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    return this.sendSms({
      to,
      message: `${otp} is your Aether Mart login verification code. Valid for 5 minutes.`,
    });
  }
}

// ─── MSG91 Provider ───────────────────────────────────────────────────────────

class Msg91Provider implements ISmsProvider {
  private apiKey: string;
  private templateId: string;
  private senderId: string;

  constructor() {
    this.apiKey = process.env.MSG91_API_KEY || '';
    this.templateId = process.env.MSG91_TEMPLATE_ID || '';
    this.senderId = process.env.MSG91_SENDER_ID || 'AETHER';
    if (this.apiKey) {
      log.info('MSG91 SMS provider initialized');
    }
  }

  async sendSms(options: SmsSendOptions): Promise<boolean> {
    if (!this.apiKey) {
      log.warn('MSG91 API key is not configured');
      return false;
    }
    try {
      const mobile = options.to.replace(/^\+/, '');
      if (this.templateId) {
        const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=${mobile}`, {
          method: 'POST',
          headers: {
            'authkey': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ Param1: options.message }),
        });
        const data: any = await response.json();
        log.info(`[MSG91 SMS Sent] Status: ${data?.type || 'success'}`);
        return data?.type === 'success' || response.ok;
      } else {
        const response = await fetch('https://api.msg91.com/api/v2/sendsms', {
          method: 'POST',
          headers: {
            'authkey': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: this.senderId,
            route: '4',
            country: '91',
            sms: [{ message: options.message, to: [mobile] }],
          }),
        });
        const data: any = await response.json();
        log.info(`[MSG91 SMS Sent] Response: ${data?.type || 'success'}`);
        return data?.type === 'success' || response.ok;
      }
    } catch (error) {
      log.error('MSG91 SMS send failed', { error });
      return false;
    }
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    return this.sendSms({
      to,
      message: `${otp} is your Aether Mart verification code. Valid for 5 minutes.`,
    });
  }
}

// ─── Disabled Provider (Fallback) ─────────────────────────────────────────────

class DisabledProvider implements ISmsProvider {
  async sendSms(options: SmsSendOptions): Promise<boolean> {
    log.info(`[SMS Provider Disabled] Mock SMS trigger to ${options.to}`);
    return true;
  }

  async sendOtp(to: string, otp: string): Promise<boolean> {
    log.info(`[SMS OTP Provider Disabled] Code triggered for ${to}`);
    return true;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

class SmsService implements ISmsProvider {
  private provider: ISmsProvider;

  constructor() {
    const providerName = (process.env.SMS_PROVIDER || 'disabled').toLowerCase();
    
    if (providerName === 'twilio' && process.env.TWILIO_ACCOUNT_SID) {
      this.provider = new TwilioProvider();
    } else if (providerName === 'msg91' && process.env.MSG91_API_KEY) {
      this.provider = new Msg91Provider();
    } else {
      if (process.env.NODE_ENV === 'production' && process.env.SMS_OTP_ENABLED === 'true') {
        log.warn('SMS_OTP_ENABLED is true in production but valid SMS_PROVIDER credentials (TWILIO / MSG91) are not present. Operating in mock mode.');
      } else {
        log.info('SMS OTP provider is set to disabled (mock mode).');
      }
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

import { createModuleLogger } from '../../utils/logger';
import { getOtpMode } from './otp.service';

const log = createModuleLogger('SmsService');

export interface SmsSendOptions {
  to: string; // Mobile number
  message: string;
}

export interface SmsResult {
  success: boolean;
  provider: string;
  response?: any;
  error?: string;
}

export interface ISmsProvider {
  sendSms(options: SmsSendOptions): Promise<SmsResult>;
  sendOtp(to: string, otp: string): Promise<SmsResult>;
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

  async sendSms(options: SmsSendOptions): Promise<SmsResult> {
    if (!this.client) {
      const msg = 'Twilio client is not initialized. Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in Render.';
      log.warn(msg);
      return { success: false, provider: 'twilio', error: msg };
    }
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) {
      const msg = 'TWILIO_PHONE_NUMBER environment variable is missing in Render.';
      log.warn(msg);
      return { success: false, provider: 'twilio', error: msg };
    }
    try {
      const res = await this.client.messages.create({
        body: options.message,
        from,
        to: options.to,
      });
      log.info(`[Twilio SMS Sent] SID: ${res.sid}, Status: ${res.status} to ${options.to}`);
      const isOk = res.status !== 'failed' && res.status !== 'undelivered';
      return {
        success: isOk,
        provider: 'twilio',
        response: { sid: res.sid, status: res.status, errorCode: res.errorCode, errorMessage: res.errorMessage },
        error: isOk ? undefined : (res.errorMessage || `Twilio status: ${res.status}`),
      };
    } catch (error: any) {
      log.error('Twilio SMS send failed', { error: error.message || error });
      return {
        success: false,
        provider: 'twilio',
        error: error.message || 'Twilio API call failed',
      };
    }
  }

  async sendOtp(to: string, otp: string): Promise<SmsResult> {
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

  async sendSms(options: SmsSendOptions): Promise<SmsResult> {
    if (!this.apiKey) {
      const msg = 'MSG91_API_KEY environment variable is missing in Render.';
      log.warn(msg);
      return { success: false, provider: 'msg91', error: msg };
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
        log.info(`[MSG91 OTP Sent] Status: ${data?.type || 'unknown'}, Message: ${data?.message || JSON.stringify(data)}`);
        const isOk = data?.type === 'success' || response.ok;
        return {
          success: isOk,
          provider: 'msg91',
          response: data,
          error: isOk ? undefined : (data?.message || 'MSG91 API rejected OTP request'),
        };
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
        log.info(`[MSG91 SMS Sent] Response: ${data?.type || 'unknown'}, Message: ${data?.message || JSON.stringify(data)}`);
        const isOk = data?.type === 'success' || response.ok;
        return {
          success: isOk,
          provider: 'msg91',
          response: data,
          error: isOk ? undefined : (data?.message || 'MSG91 API rejected SMS request'),
        };
      }
    } catch (error: any) {
      log.error('MSG91 SMS send failed', { error: error.message || error });
      return {
        success: false,
        provider: 'msg91',
        error: error.message || 'MSG91 API network request failed',
      };
    }
  }

  async sendOtp(to: string, otp: string): Promise<SmsResult> {
    return this.sendSms({
      to,
      message: `${otp} is your Aether Mart verification code. Valid for 5 minutes.`,
    });
  }
}

// ─── Disabled Provider (Fallback) ─────────────────────────────────────────────

class DisabledProvider implements ISmsProvider {
  async sendSms(options: SmsSendOptions): Promise<SmsResult> {
    const providerEnv = (process.env.SMS_PROVIDER || 'not_set').toLowerCase();
    const isProductionOtpMode = getOtpMode() === 'production';
    
    if (isProductionOtpMode) {
      const missingVars: string[] = [];
      if (providerEnv === 'twilio') {
        if (!process.env.TWILIO_ACCOUNT_SID) missingVars.push('TWILIO_ACCOUNT_SID');
        if (!process.env.TWILIO_AUTH_TOKEN) missingVars.push('TWILIO_AUTH_TOKEN');
        if (!process.env.TWILIO_PHONE_NUMBER) missingVars.push('TWILIO_PHONE_NUMBER');
      } else if (providerEnv === 'msg91') {
        if (!process.env.MSG91_API_KEY) missingVars.push('MSG91_API_KEY');
      } else {
        missingVars.push('SMS_PROVIDER (must be set to twilio or msg91)');
      }
      
      const errMsg = `SMS provider is not configured in Render. Missing Render environment variable(s): ${missingVars.join(', ')}`;
      log.warn(`[SMS Provider Unconfigured] ${errMsg}`);
      return {
        success: false,
        provider: 'disabled',
        error: errMsg,
      };
    }

    log.info(`[SMS Provider Disabled] Mock SMS trigger to ${options.to}`);
    return { success: true, provider: 'disabled' };
  }

  async sendOtp(to: string, otp: string): Promise<SmsResult> {
    return this.sendSms({
      to,
      message: `${otp} is your Aether Mart verification code. Valid for 5 minutes.`,
    });
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
        log.warn('SMS_OTP_ENABLED is true in production but valid SMS_PROVIDER credentials (TWILIO / MSG91) are missing in Render. Operating in unconfigured mode.');
      } else {
        log.info('SMS OTP provider is set to disabled (mock mode).');
      }
      this.provider = new DisabledProvider();
    }
  }

  async sendSms(options: SmsSendOptions): Promise<SmsResult> {
    return this.provider.sendSms(options);
  }

  async sendOtp(to: string, otp: string): Promise<SmsResult> {
    return this.provider.sendOtp(to, otp);
  }
}

export const smsService = new SmsService();
export default smsService;

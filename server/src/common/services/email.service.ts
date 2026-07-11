import nodemailer from 'nodemailer';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('EmailService');

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (
      !host ||
      !user ||
      user.includes('placeholder') ||
      user === 'your_gmail@gmail.com' ||
      !pass ||
      pass.includes('placeholder') ||
      pass === 'your_app_password'
    ) {
      log.warn('SMTP credentials are not fully configured. Email service will run in mock mode.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      log.info('✅ SMTP mailer initialized successfully');
    } catch (error) {
      log.error('Failed to initialize SMTP transporter', { error });
    }
  }

  /**
   * Send a generic email.
   * Falls back to log output in mock mode if SMTP is not configured.
   */
  public async sendEmail(options: EmailOptions): Promise<boolean> {
    const from = process.env.EMAIL_FROM || '"Aether Mart" <noreply@aethermart.com>';

    if (!this.transporter) {
      log.info(`[Mock Email Provider] Sending email:
        TO: ${options.to}
        SUBJECT: ${options.subject}
        CONTENT: ${options.text || 'HTML Content (see logs)'}
      `);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || 'Please open this email in an HTML-compatible client.',
      });
      log.info(`Email sent successfully to: ${options.to}`);
      return true;
    } catch (error) {
      log.error('Failed to send email', { to: options.to, subject: options.subject, error });
      return false;
    }
  }

  /**
   * Send login OTP email template.
   */
  public async sendOtpEmail(to: string, otp: string, expiryMinutes = 5): Promise<boolean> {
    const subject = `${otp} is your Aether Mart Verification Code`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Aether Mart Verification Code</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; color: #333333; }
          .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 40px; border: 1px solid #eef2f5; }
          .logo { text-align: center; font-size: 28px; font-weight: 800; color: #4F46E5; margin-bottom: 30px; letter-spacing: -0.5px; }
          .title { font-size: 22px; font-weight: 700; color: #1f2937; text-align: center; margin-bottom: 12px; }
          .subtitle { font-size: 14px; color: #6b7280; text-align: center; margin-bottom: 30px; line-height: 1.5; }
          .otp-card { background-color: #f5f3ff; border: 1px dashed #c084fc; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 30px; }
          .otp-code { font-size: 36px; font-weight: 800; color: #7c3aed; letter-spacing: 6px; }
          .expiry-text { font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 35px; }
          .footer { font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Aether Mart</div>
          <div class="title">Verify Your Email Address</div>
          <div class="subtitle">Please use the verification code below to login to your Aether Mart account. Do not share this OTP with anyone.</div>
          <div class="otp-card">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry-text">This verification code is valid for <b>${expiryMinutes} minutes</b> and can only be used once.</div>
          <div class="footer">
            If you did not request this code, you can safely ignore this email.<br>
            &copy; 2026 Aether Mart Hyperlocal Delivery. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text: `Your Aether Mart verification code is ${otp}. It is valid for ${expiryMinutes} minutes.`,
    });
  }

  /**
   * Send Welcome email.
   */
  public async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const subject = `Welcome to Aether Mart, ${name}!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Aether Mart</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; color: #333333; }
          .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 40px; border: 1px solid #eef2f5; }
          .logo { text-align: center; font-size: 28px; font-weight: 800; color: #4F46E5; margin-bottom: 30px; }
          .title { font-size: 22px; font-weight: 700; color: #1f2937; text-align: center; margin-bottom: 12px; }
          .message { font-size: 15px; color: #4b5563; line-height: 1.6; margin-bottom: 25px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; }
          .footer { font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; line-height: 1.6; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Aether Mart</div>
          <div class="title">Welcome Aboard!</div>
          <p class="message">Hi ${name},</p>
          <p class="message">We are thrilled to welcome you to Aether Mart — your ultimate hyperlocal marketplace! Get ready to experience ultra-fast deliveries of daily essentials, fresh produce, medicines, and pet care, right to your doorstep in minutes.</p>
          <p class="message">To get started, update your delivery address and explore your nearby stores on our application.</p>
          <div class="btn-container">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn">Explore Marketplace</a>
          </div>
          <div class="footer">
            If you have any questions, reach out to us at support@aethermart.com.<br>
            &copy; 2026 Aether Mart. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text: `Welcome to Aether Mart, ${name}! We're thrilled to have you with us. Explore the marketplace at ${process.env.FRONTEND_URL || 'http://localhost:5173'}.`,
    });
  }

  /**
   * Send Password Reset email (future-ready).
   */
  public async sendPasswordResetEmail(to: string, otp: string, expiryMinutes = 5): Promise<boolean> {
    const subject = `Reset Your Aether Mart Password`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
        <style>
          body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; color: #333333; }
          .container { max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding: 40px; border: 1px solid #eef2f5; }
          .logo { text-align: center; font-size: 28px; font-weight: 800; color: #4F46E5; margin-bottom: 30px; }
          .title { font-size: 22px; font-weight: 700; color: #1f2937; text-align: center; margin-bottom: 12px; }
          .subtitle { font-size: 14px; color: #6b7280; text-align: center; margin-bottom: 30px; line-height: 1.5; }
          .otp-card { background-color: #fef2f2; border: 1px dashed #f87171; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 30px; }
          .otp-code { font-size: 36px; font-weight: 800; color: #dc2626; letter-spacing: 6px; }
          .expiry-text { font-size: 12px; color: #9ca3af; text-align: center; margin-bottom: 35px; }
          .footer { font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Aether Mart</div>
          <div class="title">Password Reset Request</div>
          <div class="subtitle">We received a request to reset your password. Use the verification code below to proceed with the password change.</div>
          <div class="otp-card">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="expiry-text">This code is valid for <b>${expiryMinutes} minutes</b>. If you did not request a password reset, you can safely ignore this email.</div>
          <div class="footer">
            &copy; 2026 Aether Mart. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text: `Your password reset code is ${otp}. It is valid for ${expiryMinutes} minutes.`,
    });
  }
}

export const emailService = new EmailService();
export default emailService;

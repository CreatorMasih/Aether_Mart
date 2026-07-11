/**
 * Typed Environment Variables
 * Provides full IntelliSense and type-safety for process.env access.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Server
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      FRONTEND_URL: string;
      API_VERSION: string;

      // Database
      DATABASE_URL: string;

      // JWT
      JWT_ACCESS_SECRET: string;
      JWT_REFRESH_SECRET: string;
      JWT_ACCESS_EXPIRY: string;
      JWT_REFRESH_EXPIRY: string;

      // OTP
      OTP_EXPIRY_MINUTES: string;
      OTP_MAX_ATTEMPTS: string;
      OTP_LENGTH: string;

      // Redis
      REDIS_ENABLED: 'true' | 'false';
      REDIS_URL: string;

      // Email
      SMTP_HOST: string;
      SMTP_PORT: string;
      SMTP_SECURE: string;
      SMTP_USER: string;
      SMTP_PASS: string;
      EMAIL_FROM: string;

      // SMS
      SMS_PROVIDER: 'twilio' | 'msg91' | 'disabled';
      TWILIO_ACCOUNT_SID?: string;
      TWILIO_AUTH_TOKEN?: string;
      TWILIO_PHONE_NUMBER?: string;
      MSG91_API_KEY?: string;
      MSG91_SENDER_ID?: string;

      // Cloudinary
      CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;

      // Razorpay
      RAZORPAY_KEY_ID: string;
      RAZORPAY_KEY_SECRET: string;
      RAZORPAY_WEBHOOK_SECRET: string;

      // Firebase
      FIREBASE_PROJECT_ID: string;
      FIREBASE_CLIENT_EMAIL: string;
      FIREBASE_PRIVATE_KEY: string;

      // Feature Flags
      GOOGLE_AUTH_ENABLED: 'true' | 'false';
      APPLE_AUTH_ENABLED: 'true' | 'false';
      WHATSAPP_AUTH_ENABLED: 'true' | 'false';
      SMS_OTP_ENABLED: 'true' | 'false';
    }
  }
}

export {};

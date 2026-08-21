import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { Application } from 'express';

let app: Application;

const testEmails = [
  'uat-customer@aethermart.com',
  'uat-merchant@aethermart.com',
  'uat-rider@aethermart.com',
  'uat-admin@aethermart.com',
  'prod-test@aethermart.com',
];

async function cleanupData() {
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: testEmails } } } });
  await prisma.address.deleteMany({ where: { user: { email: { in: testEmails } } } });
  await prisma.customer.deleteMany({ where: { user: { email: { in: testEmails } } } });
  await prisma.merchant.deleteMany({ where: { user: { email: { in: testEmails } } } });
  await prisma.rider.deleteMany({ where: { user: { email: { in: testEmails } } } });
  await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
  await prisma.oTPVerification.deleteMany({ where: { identifier: { in: testEmails } } });
}

beforeAll(async () => {
  await connectDatabase();
  await initializeCache();
  app = createApp();
  await cleanupData();
});

afterAll(async () => {
  await cleanupData();
  await disconnectDatabase();
  await disconnectCache();
});

describe('⚡ Controlled UAT OTP Mode Integration Tests', () => {
  const originalEnv = process.env.OTP_MODE;

  beforeEach(() => {
    delete process.env.OTP_MODE;
    delete process.env.SMS_PROVIDER;
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.OTP_MODE = originalEnv;
    } else {
      delete process.env.OTP_MODE;
    }
  });

  // ─── 1. Endpoint GET /api/auth/config ──────────────────────────────────────
  describe('1. Read-only Auth Config Endpoint', () => {
    it('Should expose otpMode = dev when OTP_MODE=dev', async () => {
      process.env.OTP_MODE = 'dev';
      const res = await request(app).get('/api/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ otpMode: 'dev' });
    });

    it('Should expose otpMode = production when OTP_MODE=production', async () => {
      process.env.OTP_MODE = 'production';
      const res = await request(app).get('/api/auth/config');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ otpMode: 'production' });
    });
  });

  // ─── 2. OTP_MODE=dev Testing ────────────────────────────────────────────────
  describe('2. OTP_MODE=dev Mode Execution', () => {
    beforeEach(() => {
      process.env.OTP_MODE = 'dev';
    });

    const roles: Array<{ role: 'CUSTOMER' | 'SHOPKEEPER' | 'RIDER' | 'ADMIN'; identifier: string; type: 'SMS' | 'EMAIL' }> = [
      { role: 'ADMIN', identifier: '123pratikkumar@gmail.com', type: 'EMAIL' },
      { role: 'CUSTOMER', identifier: '+919876543210', type: 'SMS' },
      { role: 'SHOPKEEPER', identifier: '+918888888881', type: 'SMS' },
      { role: 'RIDER', identifier: '+917777777771', type: 'SMS' },
    ];

    roles.forEach(({ role, identifier, type }) => {
      it(`Should support end-to-end OTP flow for ${role} using ${identifier}`, async () => {
        // 1. Send OTP
        const sendRes = await request(app)
          .post('/api/auth/send-otp')
          .send({
            identifier,
            type,
            role,
          });

        expect(sendRes.status).toBe(200);
        expect(sendRes.body.success).toBe(true);

        // 2. Verify with fixed OTP 123456
        const verifyRes = await request(app)
          .post('/api/auth/verify-otp')
          .send({
            identifier,
            code: '123456',
            role,
            method: type === 'EMAIL' ? 'EMAIL' : 'PHONE',
          });

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.success).toBe(true);
        expect(verifyRes.body.data.token).toBeDefined();
        expect(verifyRes.body.data.user.role).toBe(role);

        // Capture refreshToken cookie
        const cookies = verifyRes.get('Set-Cookie') || [];
        const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));

        // 3. Test Refresh Session
        if (refreshCookie) {
          const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', [refreshCookie]);

          expect(refreshRes.status).toBe(200);
          expect(refreshRes.body.success).toBe(true);
          expect(refreshRes.body.data.accessToken).toBeDefined();

          // 4. Test Logout
          const logoutCookie = refreshRes.get('Set-Cookie') || [];
          const newRefreshCookie = logoutCookie.find((c) => c.startsWith('refreshToken=')) || refreshCookie;

          const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', [newRefreshCookie]);

          expect(logoutRes.status).toBe(200);
          expect(logoutRes.body.success).toBe(true);
        }
      });
    });

    it('Should reject invalid OTP in dev mode', async () => {
      await request(app)
        .post('/api/auth/send-otp')
        .send({
          identifier: 'uat-customer@aethermart.com',
          type: 'EMAIL',
          role: 'CUSTOMER',
        });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          identifier: 'uat-customer@aethermart.com',
          code: '000000',
          role: 'CUSTOMER',
          method: 'EMAIL',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Invalid verification code');
    });
  });

  // ─── 3. OTP_MODE=production Testing ──────────────────────────────────────────
  describe('3. OTP_MODE=production Mode Execution', () => {
    beforeEach(() => {
      process.env.OTP_MODE = 'production';
    });

    it('Should return 503 when SMS provider is unconfigured in production mode', async () => {
      process.env.SMS_PROVIDER = 'disabled';

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({
          identifier: '+919999988888',
          type: 'SMS',
          role: 'CUSTOMER',
        });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message.toLowerCase()).toContain('not configured');
    });

    it('Should NOT allow fixed OTP 123456 in production mode', async () => {
      process.env.SMS_PROVIDER = 'disabled';

      // Send OTP fails with 503 because provider is disabled
      const sendRes = await request(app)
        .post('/api/auth/send-otp')
        .send({
          identifier: '+919999988888',
          type: 'SMS',
          role: 'CUSTOMER',
        });

      expect(sendRes.status).toBe(503);

      // Even if someone manually sends verify-otp with 123456, it must be rejected (400)
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          identifier: '+919999988888',
          code: '123456',
          role: 'CUSTOMER',
          method: 'PHONE',
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
    });
  });
});

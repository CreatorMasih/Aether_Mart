import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { Application } from 'express';

let app: Application;

beforeAll(async () => {
  // Connect to DB and cache
  await connectDatabase();
  await initializeCache();
  app = createApp();

  // Clean test user data
  await prisma.refreshToken.deleteMany({ where: { user: { email: 'test-auth-integration@aethermart.com' } } });
  await prisma.address.deleteMany({ where: { user: { email: 'test-auth-integration@aethermart.com' } } });
  await prisma.customer.deleteMany({ where: { user: { email: 'test-auth-integration@aethermart.com' } } });
  await prisma.user.deleteMany({ where: { email: 'test-auth-integration@aethermart.com' } });
  await prisma.oTPVerification.deleteMany({ where: { identifier: 'test-auth-integration@aethermart.com' } });
});

afterAll(async () => {
  // Clean up
  await prisma.refreshToken.deleteMany({ where: { user: { email: 'test-auth-integration@aethermart.com' } } });
  await prisma.address.deleteMany({ where: { user: { email: 'test-auth-integration@aethermart.com' } } });
  await prisma.customer.deleteMany({ where: { user: { email: 'test-auth-integration@aethermart.com' } } });
  await prisma.user.deleteMany({ where: { email: 'test-auth-integration@aethermart.com' } });
  await prisma.oTPVerification.deleteMany({ where: { identifier: 'test-auth-integration@aethermart.com' } });

  await disconnectDatabase();
  await disconnectCache();
});

describe('🔐 Auth Module Integration Tests', () => {
  const testEmail = 'test-auth-integration@aethermart.com';
  let accessToken: string;
  let refreshTokenCookie: string;

  it('1. Should generate and send email OTP successfully', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({
        identifier: testEmail,
        type: 'EMAIL',
        role: 'CUSTOMER',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('OTP sent');

    // Confirm stored in DB
    const verification = await prisma.oTPVerification.findFirst({
      where: { identifier: testEmail },
    });
    expect(verification).not.toBeNull();
    expect(verification?.isUsed).toBe(false);
  });

  it('2. Should fail verify OTP with wrong code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        identifier: testEmail,
        code: '999999', // Wrong code
        role: 'CUSTOMER',
        method: 'EMAIL',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('OTP_INVALID');
  });

  it('3. Should verify OTP and login successfully, returning JWT and setting cookie', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        identifier: testEmail,
        code: '123456', // Test static code
        role: 'CUSTOMER',
        method: 'EMAIL',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined(); // accessToken
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user.isProfileComplete).toBe(false); // New user has incomplete profile

    accessToken = res.body.data.token;
    
    // Read set-cookie headers
    const cookies = res.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    refreshTokenCookie = refreshCookie;
  });

  it('4. Should get me profile as uncompleted', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isProfileComplete).toBe(false);
    expect(res.body.data.email).toBe(testEmail);
  });

  it('5. Should complete customer profile successfully', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        role: 'CUSTOMER',
        customerDetails: {
          fullName: 'Integration Test Customer',
          email: testEmail,
          defaultAddress: {
            label: 'Home',
            receiverName: 'Integration Test',
            receiverPhone: '+919999999999',
            streetAddress: '100 Test St',
            postalCode: '560001',
            city: 'Bangalore',
            latitude: 12.9716,
            longitude: 77.5946,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isProfileComplete).toBe(true);
    expect(res.body.data.fullName).toBe('Integration Test Customer');
  });

  it('6. Should rotate tokens using refresh endpoint', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    accessToken = res.body.data.accessToken;

    const cookies = res.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    refreshTokenCookie = refreshCookie;
  });

  it('7. Should log out successfully, clearing cookies', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [refreshTokenCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'] || [];
    const refreshCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
    // Should be cleared (expires/max-age=0)
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('Max-Age=0');
  });

  it('8. Should reject authenticated requests after logging out', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    // Since token is still valid (access token expiry 15m), it should work for stateless checks,
    // but the session refresh token is now revoked. Let's verify refresh fails.
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshTokenCookie]);

    expect(refreshRes.status).toBe(401);
  });
});

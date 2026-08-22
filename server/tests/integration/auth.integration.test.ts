import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { Application } from 'express';

let app: Application;

const testEmails = [
  'test-admin@aethermart.com',
  'test-customer@aethermart.com',
  'test-merchant@aethermart.com',
  'test-rider@aethermart.com',
  'test-new-customer@aethermart.com',
  'test-new-merchant@aethermart.com',
  'test-new-rider@aethermart.com',
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

describe('🔐 Auth Module Integration Tests', () => {
  let adminAccessToken: string;
  let customerAccessToken: string;

  // 1. Super Admin OTP Login
  it('1. Admin: Should generate and send email OTP successfully', async () => {
    const res = await request(app)
      .post('/api/auth/send-otp')
      .send({
        identifier: 'test-admin@aethermart.com',
        type: 'EMAIL',
        role: 'ADMIN',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const verification = await prisma.oTPVerification.findFirst({
      where: { identifier: 'test-admin@aethermart.com' },
    });
    expect(verification).not.toBeNull();
  });

  it('2. Admin: Should fail to verify OTP with wrong code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        identifier: 'test-admin@aethermart.com',
        code: '999999',
        role: 'ADMIN',
        method: 'EMAIL',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Admin: Should verify OTP and login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        identifier: 'test-admin@aethermart.com',
        code: '123456',
        role: 'ADMIN',
        method: 'EMAIL',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('ADMIN');
    adminAccessToken = res.body.data.token;
  });

  // 2. Role validation tests
  it('4. Role Validation: OTP send request should support CUSTOMER role and reject invalid role enum', async () => {
    const validRes = await request(app)
      .post('/api/auth/send-otp')
      .send({
        identifier: 'test-customer@aethermart.com',
        type: 'EMAIL',
        role: 'CUSTOMER',
      });
    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);

    const invalidRes = await request(app)
      .post('/api/auth/send-otp')
      .send({
        identifier: 'test-customer@aethermart.com',
        type: 'EMAIL',
        role: 'INVALID_ROLE',
      });
    expect(invalidRes.status).toBe(422); // Validation Failure
  });

  // 3. New Customer Registration via Google Mock Token
  it('5. New Customer: Should dynamically register via Google token', async () => {
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-test-new-customer@aethermart.com',
        role: 'CUSTOMER',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test-new-customer@aethermart.com');
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user.isProfileComplete).toBe(false);

    customerAccessToken = res.body.data.token;
  });

  // 4. Complete Profile for Customer
  it('6. New Customer: Should complete profile successfully', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({
        role: 'CUSTOMER',
        customerDetails: {
          fullName: 'Integration Test Customer',
          email: 'test-new-customer@aethermart.com',
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
  });

  it('6b. Idempotency: Repeated complete-profile for the same user should return 200 OK without 409 error', async () => {
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${customerAccessToken}`)
      .send({
        role: 'CUSTOMER',
        customerDetails: {
          fullName: 'Integration Test Customer Updated',
          email: 'test-new-customer@aethermart.com',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isProfileComplete).toBe(true);
  });

  it('6c. Security: Duplicate email belonging to ANOTHER user should return 409 Conflict', async () => {
    // Create another customer token first
    const newCustRes = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-test-customer2@aethermart.com',
        role: 'CUSTOMER',
      });
    const anotherAccessToken = newCustRes.body.data.token;

    // Try completing profile using test-new-customer@aethermart.com email (which belongs to user 1)
    const res = await request(app)
      .post('/api/auth/complete-profile')
      .set('Authorization', `Bearer ${anotherAccessToken}`)
      .send({
        role: 'CUSTOMER',
        customerDetails: {
          fullName: 'Another Customer',
          email: 'test-new-customer@aethermart.com', // Conflict with user 1!
        },
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already registered');
  });

  // 5. Existing Customer Login
  it('7. Existing Customer: Should login using Google token', async () => {
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-test-new-customer@aethermart.com',
        role: 'CUSTOMER',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.isProfileComplete).toBe(true);
  });

  // 6. New Merchant Registration via Google
  it('8. New Merchant: Should dynamically register via Google token', async () => {
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-test-new-merchant@aethermart.com',
        role: 'SHOPKEEPER',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('SHOPKEEPER');
  });

  // 7. New Rider Registration via Google
  it('9. New Rider: Should dynamically register via Google token', async () => {
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-test-new-rider@aethermart.com',
        role: 'RIDER',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('RIDER');
  });

  // 8. Wrong Portal Login (Cross-role safety)
  it('10. Safety: Should reject login if Google account is registered as another role', async () => {
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-test-new-rider@aethermart.com', // Actually a RIDER
        role: 'CUSTOMER', // Attempting to login via Customer Portal
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('registered as a Rider. Please login using the Rider Portal');
  });

  // 9. Invalid/Expired Token Error
  it('11. Security: Should reject empty or malformed Google tokens', async () => {
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'invalid-token-value',
        role: 'CUSTOMER',
      });

    expect(res.status).toBe(401);
  });
});

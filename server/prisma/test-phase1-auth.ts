import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase1() {
  console.log('=== PHASE 1 — AUTHENTICATION QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  const testRoles = [
    { role: 'CUSTOMER', identifier: '+919876543210', expectedRoute: '/c/home' },
    { role: 'SHOPKEEPER', identifier: '+918888888881', expectedRoute: '/m/dashboard' },
    { role: 'RIDER', identifier: '+917777777771', expectedRoute: '/r/dashboard' },
    { role: 'ADMIN', identifier: '+919999999999', expectedRoute: '/a/dashboard' },
  ];

  for (const { role, identifier, expectedRoute } of testRoles) {
    console.log(`\n--- Testing Role: ${role} (${identifier}) ---`);

    // Step 1: Send OTP
    const sendRes = await request(app)
      .post('/api/auth/send-otp')
      .send({ identifier, type: 'SMS', role });

    console.log(`1. Send OTP (${role}): HTTP ${sendRes.status} ${sendRes.body.success ? 'PASS' : 'FAIL'}`);
    if (sendRes.status !== 200) {
      console.error('Send OTP Error:', sendRes.body);
      process.exit(1);
    }

    // Step 2: Verify OTP with code 123456
    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ identifier, code: '123456', role, method: 'SMS' });

    console.log(`2. Verify OTP (${role}): HTTP ${verifyRes.status} ${verifyRes.body.success ? 'PASS' : 'FAIL'}`);
    if (verifyRes.status !== 200) {
      console.error('Verify OTP Error:', verifyRes.body);
      process.exit(1);
    }

    const { token, user } = verifyRes.body.data;
    console.log(`   User ID: ${user.id}, Role: ${user.role}`);
    console.log(`   Access Token: ${token ? 'PASS (present)' : 'FAIL (missing)'}`);

    // Check Refresh Token Cookie
    const cookies = verifyRes.headers['set-cookie'];
    const hasRefreshCookie = cookies && cookies.some((c: string) => c.includes('refreshToken='));
    console.log(`   Refresh Cookie: ${hasRefreshCookie ? 'PASS (present)' : 'FAIL (missing)'}`);

    // Step 3: Verify /me endpoint
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    console.log(`3. Get Profile /auth/me (${role}): HTTP ${meRes.status} ${meRes.body.success ? 'PASS' : 'FAIL'}`);
    if (meRes.status !== 200 || meRes.body.data.role !== role) {
      console.error('Profile fetch failure or role mismatch:', meRes.body);
      process.exit(1);
    }

    // Step 4: Token Refresh session retention test
    if (hasRefreshCookie) {
      const refreshCookieHeader = cookies.find((c: string) => c.includes('refreshToken='));
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [refreshCookieHeader]);

      console.log(`4. Token Refresh (${role}): HTTP ${refreshRes.status} ${refreshRes.body.success ? 'PASS' : 'FAIL'}`);
      if (refreshRes.status !== 200 || !refreshRes.body.data.accessToken) {
        console.error('Token refresh failed:', refreshRes.body);
        process.exit(1);
      }
    }

    // Step 5: Cross-Role Rejection Test (try accessing customer endpoint with non-customer token or vice versa)
    if (role === 'CUSTOMER') {
      const crossRes = await request(app)
        .get('/api/merchant/dashboard')
        .set('Authorization', `Bearer ${token}`);
      console.log(`5. Cross-Role Rejection (CUSTOMER accessing Merchant API): HTTP ${crossRes.status} ${crossRes.status === 403 ? 'PASS (Rejected)' : 'FAIL'}`);
      if (crossRes.status !== 403) process.exit(1);
    } else if (role === 'SHOPKEEPER') {
      const crossRes = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      console.log(`5. Cross-Role Rejection (SHOPKEEPER accessing Admin API): HTTP ${crossRes.status} ${crossRes.status === 403 ? 'PASS (Rejected)' : 'FAIL'}`);
      if (crossRes.status !== 403) process.exit(1);
    }

    // Step 6: Logout
    if (hasRefreshCookie) {
      const refreshCookieHeader = cookies.find((c: string) => c.includes('refreshToken='));
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [refreshCookieHeader]);

      console.log(`6. Logout (${role}): HTTP ${logoutRes.status} ${logoutRes.body.success ? 'PASS' : 'FAIL'}`);
    }
  }

  console.log('\n===============================================');
  console.log('🎉 ALL 4 ROLES AUTHENTICATION PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase1().catch((err) => {
  console.error('Phase 1 Auth Test Failure:', err);
  process.exit(1);
});

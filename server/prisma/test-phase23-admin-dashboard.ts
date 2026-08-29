import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase23() {
  console.log('=== PHASE 23 — ADMIN DASHBOARD FULL AUDIT QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Reset Customer status & Authenticate Admin & Customer
  console.log('1. Authenticating Admin and Customer...');
  await prisma.user.updateMany({
    where: { phone: '+919876543210' },
    data: { status: 'ACTIVE', isActive: true },
  });

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919999999999', type: 'SMS', role: 'ADMIN' });
  const adminLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919999999999', code: '123456', role: 'ADMIN', method: 'SMS' });
  const adminToken = adminLogin.body.data.token;

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const customerUser = custLogin.body.data.user;

  // ------------------------------------------------------------------
  // TEST 1: DASHBOARD STATS & KPIS
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Dashboard Stats & KPIs ---');
  const statsRes = await request(app)
    .get('/api/admin/analytics/kpis')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log(`   KPIs HTTP ${statsRes.status}`);
  if (statsRes.status !== 200) {
    console.error('FAIL: Fetching dashboard KPIs failed:', statsRes.body);
    process.exit(1);
  }

  const kpis = statsRes.body.data;
  console.log(`   Dashboard KPIs: Total Revenue=₹${kpis.totalRevenue || kpis.gmv || 0}, Total Orders=${kpis.totalOrders}, Active Users=${kpis.activeUsers || kpis.totalCustomers}`);

  if (kpis.totalOrders === undefined) {
    console.error('FAIL: KPIs response missing totalOrders');
    process.exit(1);
  }
  console.log('   PASS: Dashboard KPI metrics fetched successfully!');

  // ------------------------------------------------------------------
  // TEST 2: USER MANAGEMENT (BLOCK / UNBLOCK USER)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: User Management (Block & Unblock User) ---');
  console.log('   2a. Admin blocking customer account (+919876543210)...');
  const blockRes = await request(app)
    .put(`/api/admin/users/${customerUser.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'BLOCKED' });

  console.log(`       Block HTTP ${blockRes.status}: status=${blockRes.body.data?.status}`);

  // Test Customer API request after block
  const blockedCustAttempt = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`       Blocked Customer Request HTTP ${blockedCustAttempt.status}: ${blockedCustAttempt.body.error?.message}`);
  if (blockedCustAttempt.status !== 403 || !blockedCustAttempt.body.error?.message.includes('blocked')) {
    console.error('FAIL: Blocked user was not rejected by middleware');
    process.exit(1);
  }
  console.log('       PASS: Blocked user request rejected immediately with HTTP 403 Forbidden!');

  // Unblock Customer
  console.log('   2b. Admin unblocking customer account...');
  const unblockRes = await request(app)
    .put(`/api/admin/users/${customerUser.id}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'ACTIVE' });

  console.log(`       Unblock HTTP ${unblockRes.status}: status=${unblockRes.body.data?.status}`);
  const activeCustAttempt = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${customerToken}`);

  if (activeCustAttempt.status !== 200) {
    console.error('FAIL: Unblocked user could not authenticate');
    process.exit(1);
  }
  console.log('       PASS: Unblocked user restored to active status!');

  // ------------------------------------------------------------------
  // TEST 3: STORE / MERCHANT APPROVAL
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Store / Merchant Approval ---');
  const merchant = await prisma.merchant.findFirst();
  
  console.log(`   3a. Admin rejecting Merchant ${merchant!.id}...`);
  const rejectRes = await request(app)
    .put(`/api/admin/merchants/${merchant!.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ approve: false });

  console.log(`       Reject HTTP ${rejectRes.status}`);
  const dbMerchantReject = await prisma.merchant.findUnique({ where: { id: merchant!.id } });
  console.log(`       PostgreSQL Merchant isApproved: ${dbMerchantReject?.isApproved}`);
  if (dbMerchantReject?.isApproved !== false) {
    console.error('FAIL: Merchant rejection failed in PostgreSQL');
    process.exit(1);
  }

  console.log(`   3b. Admin approving Merchant ${merchant!.id}...`);
  const approveRes = await request(app)
    .put(`/api/admin/merchants/${merchant!.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ approve: true });

  console.log(`       Approve HTTP ${approveRes.status}`);
  const dbMerchantApprove = await prisma.merchant.findUnique({ where: { id: merchant!.id } });
  console.log(`       PostgreSQL Merchant isApproved: ${dbMerchantApprove?.isApproved}`);
  if (dbMerchantApprove?.isApproved !== true) {
    console.error('FAIL: Merchant approval failed in PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: Merchant approval status toggles take effect immediately in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 4: SYSTEM SETTINGS CONFIGURATION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: System Settings Configuration ---');
  const updateSettingsRes = await request(app)
    .put('/api/admin/settings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      settings: [
        { key: 'platform_fee', value: '10.0', description: 'Platform fee per order' },
        { key: 'base_delivery_fee', value: '25.0', description: 'Base delivery fee' },
      ]
    });

  console.log(`   Update Settings HTTP ${updateSettingsRes.status}`);
  if (updateSettingsRes.status !== 200) {
    console.error('FAIL: Settings update failed:', updateSettingsRes.body);
    process.exit(1);
  }

  const getSettingsRes = await request(app)
    .get('/api/admin/settings')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log(`   Fetched Settings Count: ${getSettingsRes.body.data.length}`);
  const platformFeeSetting = (getSettingsRes.body.data || []).find((s: any) => s.key === 'platform_fee');
  console.log(`   PostgreSQL Setting platform_fee: "${platformFeeSetting?.value}"`);

  if (platformFeeSetting?.value !== '10.0') {
    console.error('FAIL: System settings value mismatch in PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: Platform system settings updated & stored in PostgreSQL!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 23 ADMIN DASHBOARD FULL AUDIT PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase23().catch((err) => {
  console.error('Phase 23 Admin Dashboard Failure:', err);
  process.exit(1);
});

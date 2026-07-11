import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { signAccessToken } from '../../src/utils/jwt.util';
import { Application } from 'express';
import { UserStatus } from '@prisma/client';

let app: Application;
let adminToken: string;
let customerToken: string;

let testUserId: string;
let testMerchantId: string;
let testRiderId: string;
let testProductId: string;
let testBannerId: string;
let testCouponId: string;

beforeAll(async () => {
  await connectDatabase();
  await initializeCache();
  app = createApp();

  // Clean up any stale test coupons
  await prisma.coupon.deleteMany({ where: { code: 'PROMO100' } });

  const passwordHash = '$2a$12$L7pY6H2e8uWz7wWwWwWwWux1yP.3W7PZ61KjF1X2Y3Z4c5e6g7h8i';

  // Seed Admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'super-admin-test@aethermart.com' },
    update: {},
    create: {
      email: 'super-admin-test@aethermart.com',
      phone: '+919999999901',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  adminToken = signAccessToken({
    userId: adminUser.id,
    role: 'ADMIN',
    email: adminUser.email,
    phone: adminUser.phone || undefined,
  });

  // Seed Customer user
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer-admin-test@aethermart.com' },
    update: {},
    create: {
      email: 'customer-admin-test@aethermart.com',
      phone: '+919999999902',
      passwordHash,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });
  testUserId = customerUser.id;

  customerToken = signAccessToken({
    userId: customerUser.id,
    role: 'CUSTOMER',
    email: customerUser.email,
    phone: customerUser.phone || undefined,
  });

  // Seed Merchant user
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant-admin-test@aethermart.com' },
    update: {},
    create: {
      email: 'merchant-admin-test@aethermart.com',
      phone: '+919999999903',
      passwordHash,
      role: 'SHOPKEEPER',
      isVerified: true,
    },
  });
  const merchant = await prisma.merchant.upsert({
    where: { userId: merchantUser.id },
    update: { isApproved: false },
    create: {
      userId: merchantUser.id,
      fullName: 'Admin Test Merchant',
      isApproved: false,
    },
  });
  testMerchantId = merchant.id;

  // Seed Rider user
  const riderUser = await prisma.user.upsert({
    where: { email: 'rider-admin-test@aethermart.com' },
    update: {},
    create: {
      email: 'rider-admin-test@aethermart.com',
      phone: '+919999999904',
      passwordHash,
      role: 'RIDER',
      isVerified: true,
    },
  });
  const rider = await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: { isApproved: false },
    create: {
      userId: riderUser.id,
      fullName: 'Admin Test Rider',
      vehicleType: 'MOTORBIKE',
      vehiclePlateNumber: 'KA-01-XX-8888',
      isApproved: false,
    },
  });
  testRiderId = rider.id;

  // Seed a store and a product for moderation
  const store = await prisma.store.upsert({
    where: { merchantId: merchant.id },
    update: {},
    create: {
      merchantId: merchant.id,
      name: 'Admin Test Store',
      address: 'Admin St',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });
  const cat = await prisma.category.findFirst();
  const categoryId = cat?.id || 'cat-fresh-fruits';

  const product = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId,
      name: 'Admin Test Apple',
      description: 'Test product for moderation',
      price: 150.0,
      unit: 'kg',
      sku: 'ADM-APL-1',
      isActive: true,
    },
  });
  testProductId = product.id;
});

afterAll(async () => {
  // Clean up seeded records
  await prisma.product.deleteMany({ where: { name: 'Admin Test Apple' } });
  await prisma.store.deleteMany({ where: { name: 'Admin Test Store' } });
  await prisma.rider.deleteMany({ where: { userId: testUserId } }); // clean up any other
  await prisma.rider.deleteMany({ where: { fullName: 'Admin Test Rider' } });
  await prisma.merchant.deleteMany({ where: { fullName: 'Admin Test Merchant' } });

  const emails = [
    'super-admin-test@aethermart.com',
    'customer-admin-test@aethermart.com',
    'merchant-admin-test@aethermart.com',
    'rider-admin-test@aethermart.com',
  ];
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  await disconnectDatabase();
  await disconnectCache();
});

describe('👑 Admin, Analytics & Maintenance Jobs Integration Tests', () => {
  // ─── Authentication Checks ──────────────────────────────────────────────────
  it('Should reject request if accessing Admin endpoints without JWT authentication', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('Should reject request if accessing Admin endpoints as Customer role (Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  // ─── User Management ────────────────────────────────────────────────────────
  it('Should retrieve paginated users list with total counts', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThan(0);
    expect(res.body.data.total).toBeDefined();
  });

  it('Should block/unblock a user status successfully', async () => {
    // 1. Block user
    const blockRes = await request(app)
      .put(`/api/admin/users/${testUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'BLOCKED' });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.data.status).toBe('BLOCKED');
    expect(blockRes.body.data.isActive).toBe(false);

    // 2. Unblock user
    const unblockRes = await request(app)
      .put(`/api/admin/users/${testUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' });

    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.data.status).toBe('ACTIVE');
    expect(unblockRes.body.data.isActive).toBe(true);

    // 3. Verify audit log registered
    const logs = await prisma.auditLog.findMany({
      where: { action: 'USER_STATUS_CHANGE', targetId: testUserId },
    });
    expect(logs.length).toBeGreaterThan(0);
  });

  // ─── Merchant/Rider Approvals ────────────────────────────────────────────────
  it('Should list pending merchant profiles', async () => {
    const res = await request(app)
      .get('/api/admin/merchants/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((m: any) => m.id === testMerchantId)).toBe(true);
  });

  it('Should approve merchant profile successfully', async () => {
    const res = await request(app)
      .put(`/api/admin/merchants/${testMerchantId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isApproved).toBe(true);
  });

  it('Should list pending rider profiles', async () => {
    const res = await request(app)
      .get('/api/admin/riders/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((r: any) => r.id === testRiderId)).toBe(true);
  });

  it('Should approve rider profile successfully', async () => {
    const res = await request(app)
      .put(`/api/admin/riders/${testRiderId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true });

    expect(res.status).toBe(200);
    expect(res.body.data.isApproved).toBe(true);
  });

  // ─── Product Moderation ─────────────────────────────────────────────────────
  it('Should toggle product active status during product moderation', async () => {
    // 1. Deactivate product
    const blockRes = await request(app)
      .put(`/api/admin/products/${testProductId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.data.isActive).toBe(false);

    // 2. Reactivate product
    const activeRes = await request(app)
      .put(`/api/admin/products/${testProductId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.isActive).toBe(true);
  });

  // ─── Banner CRUD Management ─────────────────────────────────────────────────
  it('Should handle Banner CRUD (Create, Read, Update, Delete)', async () => {
    // 1. Create Banner
    const createRes = await request(app)
      .post('/api/admin/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Flash Sale Banner',
        imageUrl: 'https://images.unsplash.com/photo-1542838132',
        linkType: 'EXTERNAL',
        linkTarget: 'https://aethermart.com/flash-sale',
        isActive: true,
        displayOrder: 1,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Flash Sale Banner');
    testBannerId = createRes.body.data.id;

    // 2. Get Banners
    const getRes = await request(app)
      .get('/api/admin/banners')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBeGreaterThan(0);

    // 3. Update Banner
    const updateRes = await request(app)
      .put(`/api/admin/banners/${testBannerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Super Flash Sale Banner' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Super Flash Sale Banner');

    // 4. Delete Banner
    const deleteRes = await request(app)
      .delete(`/api/admin/banners/${testBannerId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
  });

  // ─── Coupon CRUD Management ─────────────────────────────────────────────────
  it('Should handle Coupon CRUD (Create, Read, Update, Delete)', async () => {
    // 1. Create Coupon
    const createRes = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'PROMO100',
        type: 'FLAT',
        value: 100.0,
        minOrderValue: 500.0,
        usageLimit: 5,
        expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.code).toBe('PROMO100');
    testCouponId = createRes.body.data.id;

    // 2. Get Coupons
    const getRes = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBeGreaterThan(0);

    // 3. Update Coupon
    const updateRes = await request(app)
      .put(`/api/admin/coupons/${testCouponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 120.0 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.value).toBe(120.0);

    // 4. Delete Coupon (Soft disable)
    const deleteRes = await request(app)
      .delete(`/api/admin/coupons/${testCouponId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.isActive).toBe(false);

    // Cleanup Coupon
    await prisma.coupon.delete({ where: { id: testCouponId } });
  });

  // ─── Settings Bulk Updates ──────────────────────────────────────────────────
  it('Should bulk update app settings and feature flags', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        settings: [
          { key: 'platform_delivery_surge', value: '15.0', description: 'Surge fee active during rains' },
          { key: 'feature_rider_auto_assign', value: 'true', description: 'Enable auto assigning riders' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check1 = await prisma.appSetting.findUnique({ where: { key: 'platform_delivery_surge' } });
    expect(check1?.value).toBe('15.0');

    // Cleanup settings
    await prisma.appSetting.deleteMany({
      where: { key: { in: ['platform_delivery_surge', 'feature_rider_auto_assign'] } },
    });
  });

  // ─── Analytics API calculations ──────────────────────────────────────────────
  it('Should calculate platform performance dashboard KPIs', async () => {
    const res = await request(app)
      .get('/api/admin/analytics/kpis')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.gmv).toBeDefined();
    expect(res.body.data.revenue).toBeDefined();
    expect(res.body.data.activeUsers).toBeDefined();
  });

  it('Should retrieve performance breakdowns for stores, riders, and funnel steps', async () => {
    // Stores Performance
    const storesRes = await request(app)
      .get('/api/admin/analytics/stores')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(storesRes.status).toBe(200);
    expect(Array.isArray(storesRes.body.data)).toBe(true);

    // Riders Performance
    const ridersRes = await request(app)
      .get('/api/admin/analytics/riders')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ridersRes.status).toBe(200);
    expect(Array.isArray(ridersRes.body.data)).toBe(true);

    // Order Funnel Counts
    const funnelRes = await request(app)
      .get('/api/admin/analytics/funnel')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(funnelRes.status).toBe(200);
    expect(funnelRes.body.data.PLACED).toBeDefined();

    // Cancellation analytics
    const cancelRes = await request(app)
      .get('/api/admin/analytics/cancellations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.cancellationRate).toBeDefined();

    // Top Selling Products
    const prodRes = await request(app)
      .get('/api/admin/analytics/products')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(prodRes.status).toBe(200);
    expect(Array.isArray(prodRes.body.data)).toBe(true);

    // Categories analytics
    const catRes = await request(app)
      .get('/api/admin/analytics/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(catRes.status).toBe(200);
    expect(Array.isArray(catRes.body.data)).toBe(true);
  });

  // ─── Background Maintenance Jobs ───────────────────────────────────────────
  it('Should manually trigger background cleanup jobs successfully', async () => {
    const res = await request(app)
      .post('/api/admin/jobs/trigger')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.otpsDeleted).toBeDefined();
    expect(res.body.data.tokensDeleted).toBeDefined();
    expect(res.body.data.cartsDeleted).toBeDefined();
  });
});

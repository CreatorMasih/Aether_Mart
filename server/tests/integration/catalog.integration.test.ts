import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { Application } from 'express';

let app: Application;

beforeAll(async () => {
  await connectDatabase();
  await initializeCache();
  app = createApp();

  // Create a test user + customer profile for wishlist/recently-viewed testing
  const passwordHash = '$2a$12$L7pY6H2e8uWz7wWwWwWwWux1yP.3W7PZ61KjF1X2Y3Z4c5e6g7h8i'; // placeholder hash
  const user = await prisma.user.upsert({
    where: { email: 'catalog-test-user@aethermart.com' },
    update: {},
    create: {
      email: 'catalog-test-user@aethermart.com',
      phone: '+919999999900',
      passwordHash,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });

  await prisma.customer.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: 'Catalog Test Customer',
      loyaltyPoints: 10,
    },
  });
});

afterAll(async () => {
  // Clean test user and its wishlist/recently viewed
  const user = await prisma.user.findUnique({
    where: { email: 'catalog-test-user@aethermart.com' },
    include: { customer: true },
  });

  if (user?.customer?.id) {
    await prisma.wishlist.deleteMany({ where: { customerId: user.customer.id } });
    await prisma.recentlyViewed.deleteMany({ where: { customerId: user.customer.id } });
    await prisma.customer.delete({ where: { id: user.customer.id } });
  }
  if (user?.id) {
    await prisma.user.delete({ where: { id: user.id } });
  }

  await disconnectDatabase();
  await disconnectCache();
});

describe('🛒 Catalog Module Integration Tests', () => {
  let accessToken: string;
  let targetProductId: string;

  beforeAll(async () => {
    // Authenticate test user via Google Login
    const res = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-catalog-test-user@aethermart.com',
        role: 'CUSTOMER',
      });
    
    accessToken = res.body.data.token;

    // Get a seeded product ID from DB
    const product = await prisma.product.findFirst({
      where: { name: 'Organic Whole Milk' },
    });
    targetProductId = product?.id || '';
  });

  it('1. Should fetch active nested categories list', async () => {
    const res = await request(app).get('/api/customer/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].slug).toBeDefined();
  });

  it('2. Should fetch products list with pagination and dynamic filters', async () => {
    const res = await request(app)
      .get('/api/customer/products')
      .query({
        page: '1',
        limit: '5',
        vegetarian: 'true',
        sort: 'price_asc',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products).toBeDefined();
    expect(Array.isArray(res.body.data.products)).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.products[0].isVegetarian).toBe(true);
  });

  it('3. Should fetch single product details and record view log', async () => {
    expect(targetProductId).toBeDefined();
    
    const res = await request(app)
      .get(`/api/customer/products/${targetProductId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(targetProductId);
    expect(res.body.data.name).toBe('Organic Whole Milk');
    expect(res.body.data.inStock).toBe(true);

    // Confirm registered in recently viewed
    const user = await prisma.user.findUnique({
      where: { email: 'catalog-test-user@aethermart.com' },
      include: { customer: true },
    });
    const recent = await prisma.recentlyViewed.findFirst({
      where: { customerId: user?.customer?.id, productId: targetProductId },
    });
    expect(recent).not.toBeNull();
  });

  it('4. Should fetch related products', async () => {
    const res = await request(app).get(`/api/customer/products/${targetProductId}/related`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('5. Should fetch frequently bought together products', async () => {
    const res = await request(app).get(`/api/customer/products/${targetProductId}/frequently-bought-together`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('6. Should fetch product reviews list', async () => {
    const res = await request(app).get(`/api/customer/products/${targetProductId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('7. Should fetch autocomplete search suggestions', async () => {
    const res = await request(app)
      .get('/api/customer/search/suggestions')
      .query({ q: 'mil' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].toLowerCase()).toContain('milk');
  });

  it('8. Should fetch home feed widgets matching user coordinates', async () => {
    const res = await request(app)
      .get('/api/customer/home')
      .query({ latitude: '12.9340', longitude: '77.6235' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.banners).toBeDefined();
    expect(res.body.data.nearbyStores).toBeDefined();
    expect(res.body.data.nearbyStores.length).toBeGreaterThan(0);
    expect(res.body.data.nearbyStores[0].distance).toBeLessThanOrEqual(5);
  });

  it('9. Should handle wishlist lifecycle triggers (Add -> List -> Delete)', async () => {
    // 9.1 Add
    const addRes = await request(app)
      .post('/api/customer/wishlist')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId: targetProductId });

    expect(addRes.status).toBe(200);
    expect(addRes.body.success).toBe(true);

    // 9.2 List
    const getRes = await request(app)
      .get('/api/customer/wishlist')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(1);
    expect(getRes.body.data[0].id).toBe(targetProductId);

    // 9.3 Remove
    const delRes = await request(app)
      .delete(`/api/customer/wishlist/${targetProductId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });
});

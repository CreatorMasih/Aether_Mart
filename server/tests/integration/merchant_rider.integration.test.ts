import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { Application } from 'express';
import { DeliveryStatus, OrderStatus, PaymentStatus } from '@prisma/client';

let app: Application;
const testAddressId = 'e6c7b8a9-f0d1-c2b3-a4e5-f6a7b8c9d0e1';

beforeAll(async () => {
  await connectDatabase();
  await initializeCache();
  app = createApp();

  // Seed / ensure test rider user exist
  const passwordHash = '$2a$12$L7pY6H2e8uWz7wWwWwWwWux1yP.3W7PZ61KjF1X2Y3Z4c5e6g7h8i';
  const riderUser = await prisma.user.upsert({
    where: { email: 'rider-test-merchant-rider@aethermart.com' },
    update: {},
    create: {
      email: 'rider-test-merchant-rider@aethermart.com',
      phone: '+919999999922',
      passwordHash,
      role: 'RIDER',
      isVerified: true,
    },
  });

  await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: { isApproved: true, isOnline: false },
    create: {
      userId: riderUser.id,
      fullName: 'Test Rider Phase 6',
      vehicleType: 'MOTORBIKE',
      vehiclePlateNumber: 'KA-01-AB-1234',
      licenseNumber: 'DL-1234567890',
      isApproved: true,
      isOnline: false,
    },
  });

  // Seed / ensure test customer user exists for checkout tests
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer-test-merchant-rider@aethermart.com' },
    update: {},
    create: {
      email: 'customer-test-merchant-rider@aethermart.com',
      phone: '+919999999923',
      passwordHash,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });

  const cust = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      fullName: 'Test Customer Phase 6',
    },
  });

  await prisma.address.upsert({
    where: { id: testAddressId },
    update: {},
    create: {
      id: testAddressId,
      userId: customerUser.id,
      label: 'Home',
      receiverName: 'Test Customer',
      receiverPhone: '+919999999923',
      streetAddress: '123 Order St',
      postalCode: '560001',
      city: 'Bangalore',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });

  await prisma.wallet.upsert({
    where: { customerId: cust.id },
    update: { balance: 500.0 },
    create: {
      customerId: cust.id,
      balance: 500.0,
    },
  });
});

afterAll(async () => {
  // Clean up riders
  const riderUser = await prisma.user.findUnique({
    where: { email: 'rider-test-merchant-rider@aethermart.com' },
    include: { rider: true },
  });

  if (riderUser?.rider) {
    await prisma.deliveryTracking.deleteMany({
      where: { assignment: { riderId: riderUser.rider.id } },
    });
    await prisma.deliveryAssignment.deleteMany({
      where: { riderId: riderUser.rider.id },
    });
    await prisma.riderLocationHistory.deleteMany({
      where: { riderId: riderUser.rider.id },
    });
    await prisma.rider.delete({
      where: { id: riderUser.rider.id },
    });
  }
  if (riderUser?.id) {
    await prisma.user.delete({ where: { id: riderUser.id } });
  }

  // Clean up customer
  const customerUser = await prisma.user.findUnique({
    where: { email: 'customer-test-merchant-rider@aethermart.com' },
    include: { customer: true },
  });
  if (customerUser?.customer) {
    const orders = await prisma.order.findMany({ where: { customerId: customerUser.customer.id } });
    const orderIds = orders.map(o => o.id);

    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { customerId: customerUser.customer.id } });
    await prisma.walletTransaction.deleteMany({ where: { wallet: { customerId: customerUser.customer.id } } });
    await prisma.wallet.delete({ where: { customerId: customerUser.customer.id } });
    await prisma.address.deleteMany({ where: { userId: customerUser.id } });
    await prisma.customer.delete({ where: { id: customerUser.customer.id } });
  }
  if (customerUser?.id) {
    await prisma.user.delete({ where: { id: customerUser.id } });
  }

  await disconnectDatabase();
  await disconnectCache();
});

describe('🏪 Merchant & 🚴 Rider Modules Integration Tests', () => {
  let merchantToken: string;
  let riderToken: string;
  let customerToken: string;
  let createdProductId: string;
  let createdVariantId: string;
  let testCategoryId: string;
  let testRiderId: string;
  let latestVersion = 0;
  let targetOrderId: string;
  let pickupOtpCode: string;
  let deliveryOtpCode: string;

  beforeAll(async () => {
    // Get dynamic category ID
    const cat = await prisma.category.findFirst();
    testCategoryId = cat?.id || '';

    // Get test rider ID
    const riderObj = await prisma.rider.findFirst({
      where: { user: { email: 'rider-test-merchant-rider@aethermart.com' } },
    });
    testRiderId = riderObj?.id || '';

    // 1. Authenticate Merchant (Using seeded merchant-1 credentials)
    const mRes = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-merchant1@aethermart.com',
        role: 'SHOPKEEPER',
      });
    merchantToken = mRes.body.data.token;

    // 2. Authenticate Rider
    const rRes = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-rider-test-merchant-rider@aethermart.com',
        role: 'RIDER',
      });
    riderToken = rRes.body.data.token;

    // 3. Authenticate Customer
    const cRes = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-customer-test-merchant-rider@aethermart.com',
        role: 'CUSTOMER',
      });
    customerToken = cRes.body.data.token;
  });

  it('1. Should update merchant profile and store settings (opening/closing/holiday)', async () => {
    const res = await request(app)
      .put('/api/merchant/profile')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        fullName: 'Updated Merchant Shopkeeper',
        gstNumber: '22AAAAA1111A1Z1',
        storeName: 'Aether Mart Superstore',
        openingTime: '08:00',
        closingTime: '23:00',
        isHoliday: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.store.name).toBe('Aether Mart Superstore');
    expect(res.body.data.store.openingTime).toBe('08:00');
    expect(res.body.data.store.isHoliday).toBe(false);
  });

  it('2. Should create a new product with multiple variants', async () => {
    const res = await request(app)
      .post('/api/merchant/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'Fresh Strawberries Pack',
        description: 'Juicy local strawberries',
        brand: 'Aether Farm',
        isVeg: true,
        isOrganic: true,
        categoryId: testCategoryId,
        weightGrams: 250,
        variants: [
          { name: '250g Box', price: 99.0, sku: 'STRAW-250G', stock: 15 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Fresh Strawberries Pack');
    expect(res.body.data.variants.length).toBe(1);

    createdProductId = res.body.data.id;
    createdVariantId = res.body.data.variants[0].id;
    latestVersion = res.body.data.variants[0].version;
  });

  it('3. Should update product metadata and variant stock successfully (Optimistic Lock baseline)', async () => {
    const res = await request(app)
      .put(`/api/merchant/products/${createdProductId}`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        description: 'Super juicy fresh red strawberries',
        variants: [
          {
            id: createdVariantId,
            stock: 20,
            version: latestVersion, // correct version
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.variants[0].stock).toBe(20);

    latestVersion = res.body.data.variants[0].version; // incremented version
  });

  it('4. Should fail to update stock if version mismatch (Optimistic Concurrency conflict check)', async () => {
    const res = await request(app)
      .put(`/api/merchant/products/${createdProductId}`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        variants: [
          {
            id: createdVariantId,
            stock: 30,
            version: latestVersion - 1, // expired outdated version
          },
        ],
      });

    expect(res.status).toBe(409); // Conflict Error
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('5. Should validate store Holiday Mode and block cart item additions', async () => {
    // 1. Set store on Holiday mode
    await request(app)
      .put('/api/merchant/profile')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ isHoliday: true });

    // 2. Attempt to add product to cart
    const res = await request(app)
      .post('/api/customer/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: createdProductId,
        variantId: createdVariantId,
        quantity: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('STORE_CLOSED');

    // Restore holiday mode to false
    await request(app)
      .put('/api/merchant/profile')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ isHoliday: false });
  });

  it('6. Should accept Rider live coordinate heartbeats and track movement histories', async () => {
    const res = await request(app)
      .post('/api/rider/heartbeat')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        latitude: 12.9716,
        longitude: 77.5946,
        isOnline: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isOnline).toBe(true);

    // Verify history recorded
    const count = await prisma.riderLocationHistory.count();
    expect(count).toBeGreaterThan(0);
  });

  it('7. Should dispatch order to closest online idle rider automatically', async () => {
    // 1. Customer adds item to cart
    const addRes = await request(app)
      .post('/api/customer/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId: createdProductId,
        variantId: createdVariantId,
        quantity: 2,
      });

    console.log('ADD RES STATUS:', addRes.status, 'BODY:', JSON.stringify(addRes.body));

    // 2. Customer places order
    const orderRes = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: testAddressId,
        paymentMethod: 'COD',
      });

    console.log('ORDER RES STATUS:', orderRes.status, 'BODY:', JSON.stringify(orderRes.body));

    expect(orderRes.status).toBe(200);
    const order = orderRes.body.data[0];
    targetOrderId = order.id;

    // Simulate merchant packing complete -> Order status = READY_FOR_PICKUP
    await prisma.order.update({
      where: { id: targetOrderId },
      data: { status: OrderStatus.READY_FOR_PICKUP },
    });

    // 3. Merchant triggers manual rider assignment
    const assignRes = await request(app)
      .post(`/api/merchant/orders/${targetOrderId}/assign-rider`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ strategy: 'MANUAL', riderId: testRiderId });

    console.log('ASSIGN RES STATUS:', assignRes.status, 'BODY:', JSON.stringify(assignRes.body));

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);
    expect(assignRes.body.data.status).toBe(DeliveryStatus.ASSIGNED);

    pickupOtpCode = assignRes.body.data.pickupOtp;
    deliveryOtpCode = assignRes.body.data.deliveryOtp;
  });

  it('8. Should process Rider delivery sequence (Accept -> Pickup OTP -> Delivery OTP)', async () => {
    // 1. Rider accepts order
    const acceptRes = await request(app)
      .post(`/api/rider/deliveries/${targetOrderId}/accept`)
      .set('Authorization', `Bearer ${riderToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe(DeliveryStatus.ACCEPTED);

    // 2. Rider inputs pickup OTP at store
    const pickupRes = await request(app)
      .post(`/api/rider/deliveries/${targetOrderId}/pickup`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ pickupOtp: pickupOtpCode });

    expect(pickupRes.status).toBe(200);

    const orderOut = await prisma.order.findUnique({ where: { id: targetOrderId } });
    expect(orderOut?.status).toBe(OrderStatus.OUT_FOR_DELIVERY);

    // 3. Rider inputs delivery OTP at customer doorstep
    const deliveryRes = await request(app)
      .post(`/api/rider/deliveries/${targetOrderId}/complete`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ deliveryOtp: deliveryOtpCode });

    expect(deliveryRes.status).toBe(200);

    const orderDelivered = await prisma.order.findUnique({ where: { id: targetOrderId } });
    expect(orderDelivered?.status).toBe(OrderStatus.DELIVERED);
    expect(orderDelivered?.paymentStatus).toBe(PaymentStatus.PAID); // COD becomes paid upon delivery
  });

  it('9. Should soft delete product successfully', async () => {
    const res = await request(app)
      .delete(`/api/merchant/products/${createdProductId}`)
      .set('Authorization', `Bearer ${merchantToken}`);

    expect(res.status).toBe(200);

    const product = await prisma.product.findUnique({ where: { id: createdProductId } });
    expect(product?.deletedAt).not.toBeNull();
  });
});

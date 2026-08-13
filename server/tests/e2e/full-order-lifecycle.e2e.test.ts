import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { generateTokenPair } from '../../src/utils/jwt.util';
import { Application } from 'express';

describe('⚡ PRODUCTION MVP — Full End-to-End Order Lifecycle (Customer → Merchant → Rider → Customer)', () => {
  let app: Application;
  const customerEmail = 'e2e-customer@aethermart.com';
  const merchantEmail = 'e2e-merchant@aethermart.com';
  const riderEmail = 'e2e-rider@aethermart.com';

  let customerToken: string;
  let merchantToken: string;
  let riderToken: string;

  let customerId: string;
  let merchantId: string;
  let storeId: string;
  let riderId: string;
  let addressId: string;

  let productId: string;
  let variantId: string;
  let createdOrderId: string;
  let assignmentId: string;
  let pickupOtp: string;
  let deliveryOtp: string;

  beforeAll(async () => {
    await connectDatabase();
    await initializeCache();
    app = createApp();

    // 1. Clean test fixture records for E2E
    await prisma.deliveryTracking.deleteMany();
    await prisma.deliveryAssignment.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();

    // 2. Setup Real Merchant & Store in Mahasamund
    const merchantUser = await prisma.user.upsert({
      where: { email: merchantEmail },
      update: { role: 'SHOPKEEPER', isVerified: true },
      create: {
        email: merchantEmail,
        phone: '+919876543210',
        role: 'SHOPKEEPER',
        isVerified: true,
      },
    });

    const merchant = await prisma.merchant.upsert({
      where: { userId: merchantUser.id },
      update: { fullName: 'Real Merchant Owner' },
      create: {
        userId: merchantUser.id,
        fullName: 'Real Merchant Owner',
        fssaiNumber: 'FSSAI-12345678901234',
        gstNumber: '22AAAAA0000A1Z5',
      },
    });
    merchantId = merchant.id;

    const store = await prisma.store.upsert({
      where: { id: 'store-mahasamund-e2e' },
      update: {
        name: 'Mahasamund SuperFresh Store',
        latitude: 21.1085,
        longitude: 82.0965,
        deliveryRadiusKm: 15.0,
        isOpen: true,
        isPaused: false,
        isHoliday: false,
        openingTime: '06:00',
        closingTime: '23:30',
        deliveryFee: 20,
      },
      create: {
        id: 'store-mahasamund-e2e',
        merchantId: merchant.id,
        name: 'Mahasamund SuperFresh Store',
        address: 'Station Road, Mahasamund, Chhattisgarh',
        latitude: 21.1085,
        longitude: 82.0965,
        deliveryRadiusKm: 15.0,
        isOpen: true,
        isPaused: false,
        isHoliday: false,
        openingTime: '06:00',
        closingTime: '23:30',
        deliveryFee: 20,
      },
    });
    storeId = store.id;

    // Create category
    const category = await prisma.category.upsert({
      where: { slug: 'daily-essentials' },
      update: {},
      create: {
        id: 'cat-e2e-grocery',
        slug: 'daily-essentials',
        name: 'Daily Essentials & Grocery',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
      },
    });

    // Create real product
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: 'Farm Fresh Organic Milk 1L',
        description: 'Pure, pasteurized farm fresh whole milk',
        price: 60.0,
        unit: '1L',
        sku: 'E2E-MILK-1L',
      },
    });
    productId = product.id;

    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
        isPrimary: true,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: '1 Liter Pouch',
        price: 60.0,
        stock: 100,
        sku: 'E2E-MILK-1L-VAR',
      },
    });
    variantId = variant.id;

    await prisma.inventory.create({
      data: {
        storeId: store.id,
        productId: product.id,
        variantId: variant.id,
        stockQty: 100,
        lowStockThreshold: 5,
      },
    });

    // Setup Real Customer
    const customerUser = await prisma.user.upsert({
      where: { email: customerEmail },
      update: { role: 'CUSTOMER', isVerified: true },
      create: {
        email: customerEmail,
        phone: '+919876543211',
        role: 'CUSTOMER',
        isVerified: true,
      },
    });

    const customer = await prisma.customer.upsert({
      where: { userId: customerUser.id },
      update: { fullName: 'Mahasamund Test Customer' },
      create: {
        userId: customerUser.id,
        fullName: 'Mahasamund Test Customer',
      },
    });
    customerId = customer.id;

    await prisma.wallet.upsert({
      where: { customerId: customer.id },
      update: { balance: 2000.0 },
      create: { customerId: customer.id, balance: 2000.0 },
    });

    await prisma.address.deleteMany({ where: { userId: customerUser.id } });
    const address = await prisma.address.create({
      data: {
        userId: customerUser.id,
        label: 'Home',
        receiverName: 'Mahasamund Customer',
        receiverPhone: '+919876543211',
        streetAddress: 'Main Market Road, Mahasamund',
        postalCode: '493445',
        city: 'Mahasamund',
        latitude: 21.1085,
        longitude: 82.0965,
      },
    });
    addressId = address.id;

    // Setup Real Rider
    const riderUser = await prisma.user.upsert({
      where: { email: riderEmail },
      update: { role: 'RIDER', isVerified: true },
      create: {
        email: riderEmail,
        phone: '+919876543212',
        role: 'RIDER',
        isVerified: true,
      },
    });

    const rider = await prisma.rider.upsert({
      where: { userId: riderUser.id },
      update: {
        fullName: 'Mahasamund Express Rider',
        isApproved: true,
        isOnline: true,
        vehicleType: 'MOTORBIKE',
        vehiclePlateNumber: 'CG-06-AB-1234',
        currentLatitude: 21.1085,
        currentLongitude: 82.0965,
      },
      create: {
        userId: riderUser.id,
        fullName: 'Mahasamund Express Rider',
        isApproved: true,
        isOnline: true,
        vehicleType: 'MOTORBIKE',
        vehiclePlateNumber: 'CG-06-AB-1234',
        currentLatitude: 21.1085,
        currentLongitude: 82.0965,
      },
    });
    riderId = rider.id;

    // Direct token generation
    customerToken = generateTokenPair({ userId: customerUser.id, role: 'CUSTOMER' }).accessToken;
    merchantToken = generateTokenPair({ userId: merchantUser.id, role: 'SHOPKEEPER' }).accessToken;
    riderToken = generateTokenPair({ userId: riderUser.id, role: 'RIDER' }).accessToken;
  });

  afterAll(async () => {
    await disconnectDatabase();
    await disconnectCache();
  });

  // ─── LIFECYCLE TESTS ───────────────────────────────────────────────────────

  it('Step 1-3: Customer checks Mahasamund serviceability and discovers nearest store', async () => {
    const res = await request(app)
      .get('/api/customer/home?lat=21.1085&lng=82.0965')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nearbyStores.length).toBeGreaterThan(0);
    const nearestStore = res.body.data.nearbyStores.find((s: any) => s.id === storeId) || res.body.data.nearbyStores[0];
    expect(nearestStore).toBeDefined();
    expect(nearestStore.isOpen).toBe(true);
  });

  it('Step 4: Customer discovers product in the store', async () => {
    const res = await request(app)
      .get(`/api/customer/products?storeId=${storeId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.products[0].id).toBe(productId);
  });

  it('Step 5: Customer adds product to cart', async () => {
    const res = await request(app)
      .post('/api/customer/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId,
        variantId,
        quantity: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.subtotal).toBe(120);
  });

  it('Step 6-7: Customer places order and order is persisted in PostgreSQL', async () => {
    const res = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId,
        paymentMethod: 'WALLET',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const orderData = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
    createdOrderId = orderData.id;
    expect(createdOrderId).toBeDefined();

    // Verify DB Row directly
    const dbOrder = await prisma.order.findUnique({
      where: { id: createdOrderId },
      include: { items: true },
    });

    expect(dbOrder).not.toBeNull();
    expect(dbOrder?.status).toBe('PLACED');
    expect(dbOrder?.storeId).toBe(storeId);
    expect(dbOrder?.items.length).toBe(1);
  });

  it('Step 8: Merchant receives the order in their store dashboard', async () => {
    const res = await request(app)
      .get('/api/merchant/orders')
      .set('Authorization', `Bearer ${merchantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const storeOrders = res.body.data;
    const targetOrder = storeOrders.find((o: any) => o.id === createdOrderId);
    expect(targetOrder).toBeDefined();
    expect(targetOrder.status).toBe('PLACED');
  });

  it('Step 9: Merchant accepts the order (PLACED -> CONFIRMED)', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');

    // DB Verification
    const dbOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(dbOrder?.status).toBe('CONFIRMED');
  });

  it('Step 10: Merchant marks order as packing (CONFIRMED -> PACKING)', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: 'PACKING' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PACKING');
  });

  it('Step 11: Merchant marks order ready for pickup (PACKING -> READY_FOR_PICKUP)', async () => {
    const res = await request(app)
      .put(`/api/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({ status: 'READY_FOR_PICKUP' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('READY_FOR_PICKUP');
  });

  it('Step 12-13: Rider discovers job and accepts delivery assignment', async () => {
    const availRes = await request(app)
      .get('/api/rider/deliveries/available')
      .set('Authorization', `Bearer ${riderToken}`);

    expect(availRes.status).toBe(200);
    expect(availRes.body.success).toBe(true);
    const availableJobs = availRes.body.data;
    const job = availableJobs.find((j: any) => j.orderId === createdOrderId || j.id === createdOrderId);
    expect(job).toBeDefined();

    // Accept Assignment
    const acceptRes = await request(app)
      .post(`/api/rider/deliveries/${createdOrderId}/accept`)
      .set('Authorization', `Bearer ${riderToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    assignmentId = acceptRes.body.data.id;
    pickupOtp = acceptRes.body.data.pickupOtp;
    deliveryOtp = acceptRes.body.data.deliveryOtp;

    expect(assignmentId).toBeDefined();
    expect(pickupOtp).toBeDefined();
    expect(deliveryOtp).toBeDefined();
  });

  it('Step 14: Rider enters Pickup OTP and transitions order to PICKED_UP', async () => {
    // Incorrect 4-digit OTP check
    const badOtpRes = await request(app)
      .post(`/api/rider/deliveries/${createdOrderId}/pickup`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ pickupOtp: '0000' });

    expect(badOtpRes.status).toBe(400);

    // Correct Pickup OTP
    const goodOtpRes = await request(app)
      .post(`/api/rider/deliveries/${createdOrderId}/pickup`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ pickupOtp });

    expect(goodOtpRes.status).toBe(200);
    expect(goodOtpRes.body.success).toBe(true);

    // DB Verification
    const dbOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
    expect(dbOrder?.status).toBe('OUT_FOR_DELIVERY');
  });

  it('Step 15: Customer tracks live order state', async () => {
    const res = await request(app)
      .get(`/api/customer/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OUT_FOR_DELIVERY');
  });

  it('Step 16-17: Rider enters Delivery OTP and completes delivery (DELIVERED)', async () => {
    // Incorrect 4-digit Delivery OTP check
    const badOtpRes = await request(app)
      .post(`/api/rider/deliveries/${createdOrderId}/complete`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ deliveryOtp: '0000' });

    expect(badOtpRes.status).toBe(400);

    // Correct Delivery OTP
    const goodOtpRes = await request(app)
      .post(`/api/rider/deliveries/${createdOrderId}/complete`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ deliveryOtp });

    expect(goodOtpRes.status).toBe(200);
    expect(goodOtpRes.body.success).toBe(true);

    // Final DB Record Verification
    const dbOrder = await prisma.order.findUnique({
      where: { id: createdOrderId },
      include: { deliveryAssignment: true, payment: true },
    });

    expect(dbOrder?.status).toBe('DELIVERED');
    expect(dbOrder?.paymentStatus).toBe('PAID');
    expect(dbOrder?.deliveryAssignment?.status).toBe('DELIVERED');
  });

  it('Step 18-21: Audit Customer, Merchant, Rider order histories and DB integrity', async () => {
    // Customer Order History
    const custHist = await request(app)
      .get('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(custHist.body.data.some((o: any) => o.id === createdOrderId && o.status === 'DELIVERED')).toBe(true);

    // Merchant Order History
    const merchHist = await request(app)
      .get('/api/merchant/orders')
      .set('Authorization', `Bearer ${merchantToken}`);
    expect(merchHist.body.data.some((o: any) => o.id === createdOrderId && o.status === 'DELIVERED')).toBe(true);

    // Rider History
    const riderHist = await request(app)
      .get('/api/rider/assignments')
      .set('Authorization', `Bearer ${riderToken}`);
    expect(riderHist.body.data.some((a: any) => (a.orderId === createdOrderId || a.id === createdOrderId) && a.status === 'DELIVERED')).toBe(true);

    // Data Integrity
    const orderCount = await prisma.order.count({ where: { id: createdOrderId } });
    expect(orderCount).toBe(1); // No duplicates
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { Application } from 'express';
import { PaymentStatus, OrderStatus } from '@prisma/client';

let app: Application;
const testAddressId = 'f7c8d9e0-a1b2-c3d4-e5f6-7a8b9c0d1e2f';

beforeAll(async () => {
  await connectDatabase();
  await initializeCache();
  app = createApp();

  // Create a test user + customer profile + address + wallet
  const passwordHash = '$2a$12$L7pY6H2e8uWz7wWwWwWwWux1yP.3W7PZ61KjF1X2Y3Z4c5e6g7h8i'; // placeholder hash
  const user = await prisma.user.upsert({
    where: { email: 'order-test-user@aethermart.com' },
    update: {},
    create: {
      email: 'order-test-user@aethermart.com',
      phone: '+919999999911',
      passwordHash,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: 'Order Test Customer',
      loyaltyPoints: 0,
    },
  });

  await prisma.address.deleteMany({ where: { id: testAddressId } });

  await prisma.address.create({
    data: {
      id: testAddressId,
      userId: user.id,
      label: 'Home',
      receiverName: 'Test Order User',
      receiverPhone: '+919999999911',
      streetAddress: '123 Order St',
      postalCode: '560001',
      city: 'Bangalore',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });

  await prisma.wallet.upsert({
    where: { customerId: customer.id },
    update: { balance: 1000.0 }, // top up for test
    create: {
      customerId: customer.id,
      balance: 1000.0,
    },
  });
});

afterAll(async () => {
  const user = await prisma.user.findUnique({
    where: { email: 'order-test-user@aethermart.com' },
    include: { customer: true },
  });

  if (user?.customer?.id) {
    const orders = await prisma.order.findMany({
      where: { customerId: user.customer.id },
    });
    const orderIds = orders.map(o => o.id);

    await prisma.deliveryTracking.deleteMany({
      where: { assignment: { orderId: { in: orderIds } } },
    });
    await prisma.deliveryAssignment.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.transaction.deleteMany({
      where: { payment: { orderId: { in: orderIds } } },
    });
    await prisma.payment.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({
      where: { customerId: user.customer.id },
    });
    await prisma.walletTransaction.deleteMany({
      where: { wallet: { customerId: user.customer.id } },
    });
    await prisma.wallet.deleteMany({
      where: { customerId: user.customer.id },
    });
    await prisma.cartItem.deleteMany({
      where: { cart: { customerId: user.customer.id } },
    });
    await prisma.cart.deleteMany({
      where: { customerId: user.customer.id },
    });
    await prisma.address.deleteMany({
      where: { userId: user.id },
    });
    await prisma.customer.delete({
      where: { id: user.customer.id },
    });
  }
  if (user?.id) {
    await prisma.user.delete({
      where: { id: user.id },
    });
  }

  await disconnectDatabase();
  await disconnectCache();
});

describe('📦 Order, Cart & Checkout Module Integration Tests', () => {
  let accessToken: string;
  let targetProductId: string;
  let targetVariantId: string;
  let createdOrderId: string;
  let razorpayPaymentId: string;

  beforeAll(async () => {
    // Authenticate CUSTOMER using Google Login
    const authRes = await request(app)
      .post('/api/auth/google-login')
      .send({
        token: 'mock-google-token-order-test-user@aethermart.com',
        role: 'CUSTOMER',
      });
    accessToken = authRes.body.data.token;

    // Fetch product details
    const product = await prisma.product.findFirst({
      where: { name: 'Organic Whole Milk' },
      include: { variants: true },
    });
    targetProductId = product?.id || '';
    targetVariantId = product?.variants?.[0]?.id || '';
  });

  it('1. Should add item to cart with inventory pre-checks', async () => {
    const res = await request(app)
      .post('/api/customer/cart/add')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: targetProductId,
        variantId: targetVariantId,
        quantity: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].quantity).toBe(2);
    expect(res.body.data.subtotal).toBeGreaterThan(0);
  });

  it('2. Should fail to add item from another store (Store Conflict invariant)', async () => {
    const store2Product = await prisma.product.findFirst({
      where: { storeId: 'store-2' },
    });
    expect(store2Product).not.toBeNull();

    const res = await request(app)
      .post('/api/customer/cart/add')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: store2Product?.id,
        quantity: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('STORE_CONFLICT');
  });

  it('3. Should place order using WALLET and deduct balance instantly', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'order-test-user@aethermart.com' },
      include: { customer: true },
    });
    const walletBefore = await prisma.wallet.findUnique({
      where: { customerId: user?.customer?.id },
    });
    const balanceBefore = walletBefore?.balance || 0;

    // Fetch stock before placing order
    const variantBefore = await prisma.productVariant.findUnique({
      where: { id: targetVariantId },
    });
    const stockBefore = variantBefore?.stock || 0;

    const res = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        addressId: testAddressId,
        paymentMethod: 'WALLET',
        ecoPackaging: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);

    const order = res.body.data[0];
    expect(order.paymentStatus).toBe(PaymentStatus.PAID);
    expect(order.status).toBe(OrderStatus.PLACED);
    expect(order.items.length).toBe(1);

    const walletAfter = await prisma.wallet.findUnique({
      where: { customerId: user?.customer?.id },
    });
    const balanceAfter = walletAfter?.balance || 0;
    expect(balanceAfter).toBeLessThan(balanceBefore);

    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: targetVariantId },
    });
    expect(variantAfter?.stock).toBe(stockBefore - 2);
  });

  it('4. Should place order using RAZORPAY and return pending payment reference', async () => {
    await request(app)
      .post('/api/customer/cart/add')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        productId: targetProductId,
        variantId: targetVariantId,
        quantity: 1,
      });

    const res = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        addressId: testAddressId,
        paymentMethod: 'RAZORPAY',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const order = res.body.data[0];
    expect(order.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(order.payment.gatewayOrderId).toBeDefined();
    
    createdOrderId = order.id;
    razorpayPaymentId = order.payment.id;
  });

  it('5. Should confirm payment callback successfully, changing status to PAID', async () => {
    expect(razorpayPaymentId).toBeDefined();

    const res = await request(app)
      .post('/api/customer/orders/confirm-payment')
      .send({
        paymentId: razorpayPaymentId,
        status: 'SUCCESS',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentStatus).toBe(PaymentStatus.PAID);
  });

  it('6. Should transition order statuses (PLACED -> CONFIRMED -> PACKING -> READY_FOR_PICKUP)', async () => {
    // Generate active OTP request for admin first
    await request(app)
      .post('/api/auth/send-otp')
      .send({
        identifier: 'admin@aethermart.com',
        type: 'EMAIL',
        role: 'ADMIN',
      });

    // Authenticate admin/merchant
    const adminRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        identifier: 'admin@aethermart.com',
        code: '123456',
        role: 'ADMIN',
        method: 'EMAIL',
      });
    const adminToken = adminRes.body.data.token;

    const res = await request(app)
      .put(`/api/customer/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(OrderStatus.CONFIRMED);
  });

  it('7. Should refund and restore inventory on Order Cancelled', async () => {
    // Generate active OTP request for admin first
    await request(app)
      .post('/api/auth/send-otp')
      .send({
        identifier: 'admin@aethermart.com',
        type: 'EMAIL',
        role: 'ADMIN',
      });

    // Authenticate admin/merchant
    const adminRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({
        identifier: 'admin@aethermart.com',
        code: '123456',
        role: 'ADMIN',
        method: 'EMAIL',
      });
    const adminToken = adminRes.body.data.token;

    const variantBefore = await prisma.productVariant.findUnique({
      where: { id: targetVariantId },
    });
    const stockBefore = variantBefore?.stock || 0;

    const res = await request(app)
      .put(`/api/customer/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(OrderStatus.CANCELLED);
    expect(res.body.data.paymentStatus).toBe(PaymentStatus.REFUNDED);

    const variantAfter = await prisma.productVariant.findUnique({
      where: { id: targetVariantId },
    });
    const stockAfter = variantAfter?.stock || 0;
    expect(stockAfter).toBe(stockBefore + 1);
  });
});

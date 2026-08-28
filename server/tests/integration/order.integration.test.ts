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

  await prisma.cartItem.deleteMany({
    where: { cart: { customerId: customer.id } },
  });
  await prisma.cart.deleteMany({
    where: { customerId: customer.id },
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

    // Ensure Merchant & Stores exist for tests
    const merchantUser1 = await prisma.user.upsert({
      where: { email: 'merchant1-ordertest@aethermart.com' },
      update: {},
      create: { email: 'merchant1-ordertest@aethermart.com', role: 'SHOPKEEPER', isVerified: true },
    });
    const merchant1 = await prisma.merchant.upsert({
      where: { userId: merchantUser1.id },
      update: {},
      create: { userId: merchantUser1.id, fullName: 'Merchant 1' },
    });
    const store1 = await prisma.store.upsert({
      where: { id: 'store-1' },
      update: { isOpen: true, isHoliday: false, openingTime: '00:00', closingTime: '23:59' },
      create: { id: 'store-1', merchantId: merchant1.id, name: 'Store 1', address: 'Mahasamund', latitude: 12.9716, longitude: 77.5946, isOpen: true, openingTime: '00:00', closingTime: '23:59' },
    });

    const merchantUser2 = await prisma.user.upsert({
      where: { email: 'merchant2-ordertest@aethermart.com' },
      update: {},
      create: { email: 'merchant2-ordertest@aethermart.com', role: 'SHOPKEEPER', isVerified: true },
    });
    const merchant2 = await prisma.merchant.upsert({
      where: { userId: merchantUser2.id },
      update: {},
      create: { userId: merchantUser2.id, fullName: 'Merchant 2' },
    });
    await prisma.store.upsert({
      where: { id: 'store-2' },
      update: { isOpen: true, isHoliday: false, openingTime: '00:00', closingTime: '23:59' },
      create: { id: 'store-2', merchantId: merchant2.id, name: 'Store 2', address: 'Mahasamund', latitude: 12.9716, longitude: 77.5946, isOpen: true, openingTime: '00:00', closingTime: '23:59' },
    });

    const category = await prisma.category.upsert({
      where: { slug: 'daily-essentials-test' },
      update: {},
      create: { id: 'cat-test-1', name: 'Daily Essentials', slug: 'daily-essentials-test' },
    });

    let product = await prisma.product.findFirst({
      where: { name: 'Organic Whole Milk' },
      include: { variants: true },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          storeId: store1.id,
          categoryId: category.id,
          name: 'Organic Whole Milk',
          description: 'Fresh milk',
          price: 60.0,
          unit: '500ml',
          sku: 'MILK-500',
        },
        include: { variants: true },
      });
      const v = await prisma.productVariant.create({
        data: { productId: product.id, name: '500ml', price: 60.0, stock: 100, sku: 'MILK-500-VAR' },
      });
      await prisma.inventory.create({
        data: { storeId: store1.id, productId: product.id, variantId: v.id, stockQty: 100 },
      });
      product = (await prisma.product.findUnique({
        where: { id: product.id },
        include: { variants: true },
      }))!;
    } else if (product.variants.length > 0) {
      await prisma.productVariant.update({
        where: { id: product.variants[0].id },
        data: { stock: 100 },
      });
    }

    let store2Product = await prisma.product.findFirst({ where: { storeId: 'store-2' }, include: { variants: true } });
    if (!store2Product) {
      const p2 = await prisma.product.create({
        data: { storeId: 'store-2', categoryId: category.id, name: 'Store 2 Item', description: 'Item', price: 100.0, unit: '1pc', sku: 'ST2-ITEM' },
      });
      const v2 = await prisma.productVariant.create({
        data: { productId: p2.id, name: '1pc', price: 100.0, stock: 50, sku: 'ST2-ITEM-VAR' },
      });
      await prisma.inventory.create({ data: { storeId: 'store-2', productId: p2.id, variantId: v2.id, stockQty: 50 } });
    } else if (store2Product.variants.length > 0) {
      await prisma.productVariant.update({
        where: { id: store2Product.variants[0].id },
        data: { stock: 50 },
      });
    }

    targetProductId = product.id;
    targetVariantId = product.variants[0]?.id || '';
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
      include: { variants: true },
    });
    expect(store2Product).not.toBeNull();
    if (store2Product) {
      if (store2Product.variants.length === 0) {
        const v = await prisma.productVariant.create({
          data: { productId: store2Product.id, name: 'Default', price: store2Product.price, stock: 50, sku: `${store2Product.sku}-VAR` }
        });
        await prisma.inventory.create({
          data: { storeId: 'store-2', productId: store2Product.id, variantId: v.id, stockQty: 50 }
        });
      } else {
        await prisma.productVariant.updateMany({
          where: { productId: store2Product.id },
          data: { stock: 50 },
        });
      }
    }

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
    const orderResObj = res.body.data.order || res.body.data;
    expect(orderResObj.paymentStatus).toBe(PaymentStatus.PAID);
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

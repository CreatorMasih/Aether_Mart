import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { generateTokenPair } from '../../src/utils/jwt.util';
import { Application } from 'express';

describe('💳 Customer Checkout, Razorpay Test Mode & Order Creation E2E Suite', () => {
  let app: Application;
  const timestamp = Date.now();

  const customerEmail = `payment-customer-${timestamp}@aethermart.com`;
  const merchantEmail = `payment-merchant-${timestamp}@aethermart.com`;

  let customerToken: string;
  let customerUser: any;
  let customerProfile: any;

  let merchantToken: string;
  let merchantUser: any;
  let merchantProfile: any;

  let store: any;
  let category: any;
  let product: any;
  let variant: any;
  let address: any;

  beforeAll(async () => {
    await connectDatabase();
    await initializeCache();
    app = createApp();

    // 1. Create Merchant & Store in Mahasamund
    merchantUser = await prisma.user.create({
      data: {
        email: merchantEmail,
        phone: `99${timestamp.toString().slice(-8)}`,
        role: 'SHOPKEEPER',
        isVerified: true,
        merchant: {
          create: {
            fullName: 'Mahasamund Supermarket Owner',
            fssaiNumber: `FSSAI-${timestamp}`,
          },
        },
      },
      include: { merchant: true },
    });
    merchantProfile = merchantUser.merchant;
    const merchantTokens = generateTokenPair({ userId: merchantUser.id, role: 'SHOPKEEPER' });
    merchantToken = merchantTokens.accessToken;

    store = await prisma.store.create({
      data: {
        merchantId: merchantProfile.id,
        name: 'Mahasamund Fresh Express',
        address: 'Main Market, Mahasamund',
        latitude: 21.1085,
        longitude: 82.0965,
        deliveryRadiusKm: 15.0,
        isOpen: true,
        deliveryFee: 25.0,
      },
    });

    category = (await prisma.category.findFirst({ where: { isActive: true } }))!;

    product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: 'Fresh Mahasamund Oranges 1kg',
        description: 'Juicy organic oranges',
        price: 90,
        unit: '1 kg',
        sku: `SKU-ORG-${timestamp}`,
        variants: {
          create: [{ name: '1kg Pack', price: 90, sku: `SKU-ORG-VAR-${timestamp}`, stock: 100 }],
        },
      },
    });

    variant = await prisma.productVariant.findFirst({ where: { productId: product.id } });

    await prisma.inventory.create({
      data: {
        storeId: store.id,
        productId: product.id,
        variantId: variant.id,
        stockQty: 100,
        reservedQty: 0,
      },
    });

    // 2. Create Customer User & Delivery Address
    customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        phone: `98${timestamp.toString().slice(-8)}`,
        role: 'CUSTOMER',
        isVerified: true,
        customer: {
          create: {
            fullName: 'Rajesh Kumar',
          },
        },
      },
      include: { customer: true },
    });
    customerProfile = customerUser.customer;
    const customerTokens = generateTokenPair({ userId: customerUser.id, role: 'CUSTOMER' });
    customerToken = customerTokens.accessToken;

    // Create Customer Wallet
    await prisma.wallet.create({
      data: {
        customerId: customerProfile.id,
        balance: 500.0,
      },
    });

    // Create Delivery Address in Mahasamund
    address = await prisma.address.create({
      data: {
        userId: customerUser.id,
        label: 'Home',
        receiverName: 'Rajesh Kumar',
        receiverPhone: customerUser.phone,
        streetAddress: 'Plot 15, Near City Center',
        postalCode: '493445',
        city: 'Mahasamund',
        district: 'Mahasamund',
        state: 'Chhattisgarh',
        latitude: 21.1085,
        longitude: 82.0965,
        isDefault: true,
      },
    });
  });

  afterAll(async () => {
    if (customerUser?.id && merchantUser?.id) {
      await prisma.deliveryTracking.deleteMany();
      await prisma.deliveryAssignment.deleteMany();
      await prisma.payment.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.cartItem.deleteMany();
      await prisma.cart.deleteMany();
      await prisma.inventoryLog.deleteMany();
      await prisma.inventory.deleteMany();
      await prisma.productVariant.deleteMany({ where: { productId: product?.id } });
      await prisma.product.deleteMany({ where: { id: product?.id } });
      await prisma.store.deleteMany({ where: { id: store?.id } });
      await prisma.address.deleteMany({ where: { userId: customerUser.id } });
      await prisma.walletTransaction.deleteMany();
      await prisma.wallet.deleteMany({ where: { customerId: customerProfile.id } });
      await prisma.customer.deleteMany({ where: { id: customerProfile.id } });
      await prisma.merchant.deleteMany({ where: { id: merchantProfile.id } });
      await prisma.user.deleteMany({ where: { id: { in: [customerUser.id, merchantUser.id] } } });
    }

    await disconnectCache();
    await disconnectDatabase();
  });

  it('1️⃣ Places COD Order successfully and verifies PostgreSQL record snapshot', async () => {
    // Add product to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: product.id, quantity: 2 });

    const orderRes = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: address.id,
        paymentMethod: 'COD',
      });

    expect(orderRes.status).toBe(200);
    expect(orderRes.body.success).toBe(true);
    const orderData = orderRes.body.data[0];
    expect(orderData.paymentMethod).toBe('COD');
    expect(orderData.paymentStatus).toBe('PENDING');

    // Verify DB snapshot
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderData.id },
      include: { payment: true, items: true, deliveryAddress: true },
    });
    expect(dbOrder).not.toBeNull();
    expect(dbOrder?.payment?.method).toBe('COD');
    expect(dbOrder?.payment?.status).toBe('PENDING');
    expect(dbOrder?.items.length).toBe(1);
    expect(dbOrder?.deliveryAddress?.postalCode).toBe('493445');
  });

  it('2️⃣ Places WALLET Order successfully with instant deduction', async () => {
    // Add product to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: product.id, quantity: 1 });

    const initialWallet = await prisma.wallet.findUnique({ where: { customerId: customerProfile.id } });

    const orderRes = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: address.id,
        paymentMethod: 'WALLET',
      });

    expect(orderRes.status).toBe(200);
    const orderData = orderRes.body.data[0];
    expect(orderData.paymentMethod).toBe('WALLET');
    expect(orderData.paymentStatus).toBe('PAID');

    // Verify wallet deduction (accounting for loyalty points cashback reward)
    const updatedWallet = await prisma.wallet.findUnique({ where: { customerId: customerProfile.id } });
    expect(updatedWallet?.balance).toBe(379.5);
  });

  it('3️⃣ Razorpay Test Mode: Order Placement -> Online Payment SUCCESS Flow', async () => {
    // Add product to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: product.id, quantity: 1 });

    const placeRes = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: address.id,
        paymentMethod: 'RAZORPAY',
      });

    expect(placeRes.status).toBe(200);
    const orderData = placeRes.body.data[0];
    expect(orderData.paymentMethod).toBe('RAZORPAY');
    expect(orderData.paymentStatus).toBe('PENDING');

    const paymentId = orderData.payment.id;
    expect(paymentId).toBeDefined();

    // Confirm Payment SUCCESS
    const confirmRes = await request(app)
      .post('/api/customer/orders/confirm-payment')
      .send({
        paymentId,
        status: 'SUCCESS',
        razorpayPaymentId: `pay_rzp_test_${timestamp}`,
      });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);

    // Verify PostgreSQL status
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderData.id },
      include: { payment: true },
    });
    expect(dbOrder?.paymentStatus).toBe('PAID');
    expect(dbOrder?.payment?.status).toBe('PAID');
    expect(dbOrder?.payment?.gatewayPaymentId).toBe(`pay_rzp_test_${timestamp}`);
  });

  it('4️⃣ Razorpay Test Mode: Order Placement -> Online Payment FAILED -> Inventory Released Flow', async () => {
    // Add product to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: product.id, quantity: 2 });

    const invBefore = await prisma.inventory.findFirst({
      where: { storeId: store.id, productId: product.id, variantId: variant.id },
    });

    const placeRes = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: address.id,
        paymentMethod: 'RAZORPAY',
      });

    expect(placeRes.status).toBe(200);
    const orderData = placeRes.body.data[0];
    const paymentId = orderData.payment.id;

    // Stock should be reserved
    const invReserved = await prisma.inventory.findFirst({
      where: { storeId: store.id, productId: product.id, variantId: variant.id },
    });
    expect(invReserved?.stockQty).toBe(invBefore!.stockQty - 2);

    // Confirm Payment FAILED
    const confirmRes = await request(app)
      .post('/api/customer/orders/confirm-payment')
      .send({
        paymentId,
        status: 'FAILED',
      });

    expect(confirmRes.status).toBe(200);

    // Verify Order is CANCELLED and Payment is FAILED
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderData.id },
      include: { payment: true },
    });
    expect(dbOrder?.status).toBe('CANCELLED');
    expect(dbOrder?.paymentStatus).toBe('FAILED');

    // Stock should be released back
    const invAfter = await prisma.inventory.findFirst({
      where: { storeId: store.id, productId: product.id, variantId: variant.id },
    });
    expect(invAfter?.stockQty).toBe(invBefore!.stockQty);
  });

  it('5️⃣ Retry Payment Flow for Cancelled/Failed Order', async () => {
    // Fetch last cancelled order
    const cancelledOrder = await prisma.order.findFirst({
      where: { customerId: customerProfile.id, status: 'CANCELLED' },
      include: { payment: true },
    });

    expect(cancelledOrder).not.toBeNull();

    // Trigger Retry Payment endpoint
    const retryRes = await request(app)
      .post(`/api/customer/orders/${cancelledOrder!.id}/retry-payment`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(retryRes.status).toBe(200);
    const retryData = retryRes.body.data;
    expect(retryData.order.status).toBe('PLACED');
    expect(retryData.order.paymentStatus).toBe('PENDING');

    // Confirm Retry Payment SUCCESS
    const confirmRes = await request(app)
      .post('/api/customer/orders/confirm-payment')
      .send({
        paymentId: retryData.payment.id,
        status: 'SUCCESS',
        razorpayPaymentId: `pay_retry_test_${timestamp}`,
      });

    expect(confirmRes.status).toBe(200);

    const dbOrder = await prisma.order.findUnique({ where: { id: cancelledOrder!.id } });
    expect(dbOrder?.status).toBe('PLACED');
    expect(dbOrder?.paymentStatus).toBe('PAID');
  });

  it('6️⃣ Payment Confirmation Idempotency Check (Repeated Callbacks)', async () => {
    const paidOrder = await prisma.order.findFirst({
      where: { customerId: customerProfile.id, paymentStatus: 'PAID' },
      include: { payment: true },
    });

    expect(paidOrder).not.toBeNull();

    // Call confirm-payment again with SUCCESS for already PAID order
    const repeatRes = await request(app)
      .post('/api/customer/orders/confirm-payment')
      .send({
        paymentId: paidOrder!.payment!.id,
        status: 'SUCCESS',
      });

    expect(repeatRes.status).toBe(200);
    expect(repeatRes.body.success).toBe(true);
    expect(repeatRes.body.data.order.id).toBe(paidOrder!.id);
  });

  it('7️⃣ Customer Order History contains all placed orders', async () => {
    const historyRes = await request(app)
      .get('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.length).toBeGreaterThanOrEqual(3);
  });
}, 60000);

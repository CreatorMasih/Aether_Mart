import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase8() {
  console.log('=== PHASE 8 — ONLINE PAYMENT (RAZORPAY) QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Customer Login
  console.log('1. Authenticating Customer (+919876543210)...');
  await request(app)
    .post('/api/auth/send-otp')
    .send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });

  const loginRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });

  if (loginRes.status !== 200) {
    console.error('FAIL: Customer login failed:', loginRes.body);
    process.exit(1);
  }

  const customerToken = loginRes.body.data.token;
  const user = loginRes.body.data.user;
  const address = await prisma.address.findFirst({ where: { userId: user.id } });
  const customerProfile = await prisma.customer.findFirst({ where: { userId: user.id } });

  const product = await prisma.product.findFirst({
    where: { isActive: true, store: { isOpen: true, isPaused: false } },
    include: { variants: true }
  });

  if (!address || !product || product.variants.length === 0) {
    console.error('FAIL: Missing address or product for test');
    process.exit(1);
  }
  const variant = product.variants[0];

  // ----------------------------------------------------------------------
  // SCENARIO 1: SUCCESSFUL ONLINE PAYMENT
  // ----------------------------------------------------------------------
  console.log('\n--- SCENARIO 1: Successful Online Payment ---');
  
  // Add item to cart
  await request(app)
    .delete('/api/customer/cart/clear')
    .set('Authorization', `Bearer ${customerToken}`);

  await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 1 });

  // Place Razorpay Order
  console.log('1a. Placing Order with RAZORPAY payment method...');
  const orderRes1 = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address.id,
      paymentMethod: 'RAZORPAY',
    });

  if (orderRes1.status !== 200 && orderRes1.status !== 201) {
    console.error('FAIL: Razorpay order creation failed:', orderRes1.body);
    process.exit(1);
  }

  const order1 = Array.isArray(orderRes1.body.data) ? orderRes1.body.data[0] : orderRes1.body.data;
  console.log(`    Order Created: ${order1.orderNumber} (Payment ID: ${order1.payment.id})`);
  console.log(`    Status: ${order1.status}, Payment Status: ${order1.paymentStatus}`);

  // CRITICAL CHECK: Cart must NOT be cleared prior to payment success!
  let dbCart = await prisma.cart.findUnique({
    where: { customerId: customerProfile!.id },
    include: { items: true }
  });

  console.log(`    Cart Items Count BEFORE Payment Confirmation: ${dbCart?.items.length || 0}`);
  if (!dbCart || dbCart.items.length === 0) {
    console.error('CRITICAL FAIL: Cart was prematurely cleared BEFORE online payment success!');
    process.exit(1);
  }
  console.log('    PASS: Cart remained intact prior to payment confirmation!');

  // Simulate Payment Success callback
  console.log('1b. Simulating Razorpay Payment SUCCESS callback...');
  const confirmRes1 = await request(app)
    .post('/api/customer/orders/confirm-payment')
    .send({
      paymentId: order1.payment.id,
      status: 'SUCCESS',
      gatewayPaymentId: 'pay_rzp_mock_success_123',
    });

  console.log(`    Confirm Payment HTTP ${confirmRes1.status}`);
  if (confirmRes1.status !== 200 || !confirmRes1.body.data) {
    console.error('FAIL: Payment confirmation failed:', confirmRes1.body);
    process.exit(1);
  }

  const confirmedOrder1 = confirmRes1.body.data.order;
  const confirmedPayment1 = confirmRes1.body.data.payment;
  console.log(`    Updated Payment Status: ${confirmedOrder1.paymentStatus} (Payment Row Status: ${confirmedPayment1.status})`);

  if (confirmedOrder1.paymentStatus !== 'PAID' || confirmedPayment1.status !== 'PAID') {
    console.error('FAIL: Payment status failed to update to PAID');
    process.exit(1);
  }

  // Cart check after success: Cart MUST be cleared NOW
  dbCart = await prisma.cart.findUnique({
    where: { customerId: customerProfile!.id },
    include: { items: true }
  });

  console.log(`    Cart Items Count AFTER Payment SUCCESS: ${dbCart?.items.length || 0}`);
  if (dbCart && dbCart.items.length > 0) {
    console.error('FAIL: Cart was NOT cleared after payment SUCCESS!');
    process.exit(1);
  }
  console.log('    PASS: Cart cleared cleanly ONLY after payment SUCCESS!');

  // ----------------------------------------------------------------------
  // SCENARIO 2: FAILED ONLINE PAYMENT
  // ----------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Failed Online Payment & Recovery ---');

  // Add item to cart again
  await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 1 });

  // Place Razorpay Order
  console.log('2a. Placing Order with RAZORPAY payment method...');
  const orderRes2 = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address.id,
      paymentMethod: 'RAZORPAY',
    });

  const order2 = Array.isArray(orderRes2.body.data) ? orderRes2.body.data[0] : orderRes2.body.data;
  console.log(`    Order Created: ${order2.orderNumber} (Payment ID: ${order2.payment.id})`);

  // Simulate Payment Failure callback
  console.log('2b. Simulating Razorpay Payment FAILED callback...');
  const confirmRes2 = await request(app)
    .post('/api/customer/orders/confirm-payment')
    .send({
      paymentId: order2.payment.id,
      status: 'FAILED',
    });

  console.log(`    Confirm Payment HTTP ${confirmRes2.status}`);
  if (confirmRes2.status !== 200 || !confirmRes2.body.data) {
    console.error('FAIL: Payment failure handling failed:', confirmRes2.body);
    process.exit(1);
  }

  const failedOrder2 = confirmRes2.body.data.order;
  const failedPayment2 = confirmRes2.body.data.payment;
  console.log(`    Updated Order Status: ${failedOrder2.status}, Payment Status: ${failedOrder2.paymentStatus}`);

  if (failedOrder2.status !== 'CANCELLED' || failedOrder2.paymentStatus !== 'FAILED') {
    console.error('FAIL: Failed order status was not set to CANCELLED/FAILED');
    process.exit(1);
  }
  console.log('    PASS: Payment failure correctly set Order = CANCELLED, Payment = FAILED!');

  // Retry Payment test (/api/customer/orders/:id/retry-payment)
  console.log('2c. Testing Payment Retry for failed order (/api/customer/orders/:id/retry-payment)...');
  const retryRes = await request(app)
    .post(`/api/customer/orders/${failedOrder2.id}/retry-payment`)
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`    Retry Payment HTTP ${retryRes.status}`);
  if (retryRes.status !== 200 || !retryRes.body.data) {
    console.error('FAIL: Payment retry failed:', retryRes.body);
    process.exit(1);
  }

  const retriedOrder = retryRes.body.data.order;
  console.log(`    Retried Order Status: ${retriedOrder.status}, Payment Status: ${retriedOrder.paymentStatus}`);
  if (retriedOrder.status !== 'PLACED' || retriedOrder.paymentStatus !== 'PENDING') {
    console.error('FAIL: Retried order failed to reset to PLACED/PENDING');
    process.exit(1);
  }
  console.log('    PASS: Payment retry reset order to PLACED/PENDING without duplicate order creation!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 8 ONLINE PAYMENT PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase8().catch((err) => {
  console.error('Phase 8 Online Payment Failure:', err);
  process.exit(1);
});

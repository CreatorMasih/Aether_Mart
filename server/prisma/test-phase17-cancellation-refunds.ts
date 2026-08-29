import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase17() {
  console.log('=== PHASE 17 — CANCELLATION & REFUNDS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Roles
  console.log('1. Authenticating Merchant and Customer...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchantLogin.body.data.token;
  const merchantProfile = await prisma.merchant.findFirst({ where: { userId: merchantLogin.body.data.user.id } });

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const customerProfile = await prisma.customer.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });

  const store = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  const cat = await prisma.category.findFirst();

  const product = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Cancellation Test Product',
      description: 'Cancellation Test Description',
      unit: 'pc',
      price: 200,
      sku: `INV-CANCEL-${Date.now()}`,
      isActive: true,
    }
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: 'Standard Variant',
      price: 200,
      sku: `VAR-CANCEL-${Date.now()}`,
      stock: 20,
    }
  });

  await prisma.inventory.create({
    data: {
      storeId: store!.id,
      productId: product.id,
      variantId: variant.id,
      stockQty: 20,
    }
  });

  // ------------------------------------------------------------------
  // TEST 1: CUSTOMER CANCEL BEFORE MERCHANT ACCEPT (ALLOWED)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Customer Cancel Before Merchant Accept (State: PLACED) ---');
  
  const initialVariantStock = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock || 0;
  console.log(`   Initial Variant Stock before order: ${initialVariantStock}`);

  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: variant.id, quantity: 1 });

  const order1Res = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'COD' });

  const order1 = Array.isArray(order1Res.body.data) ? order1Res.body.data[0] : order1Res.body.data;
  console.log(`   Order 1 Created (Status: ${order1.status}): ${order1.orderNumber}`);

  // Customer cancels PLACED order
  console.log('   1a. Customer cancelling PLACED order (/api/customer/orders/:id/cancel)...');
  const cancel1Res = await request(app)
    .post(`/api/customer/orders/${order1.id}/cancel`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ reason: 'Changed my mind' });

  console.log(`       Cancel HTTP ${cancel1Res.status}: status=${cancel1Res.body.data?.status}`);
  if (cancel1Res.status !== 200 || cancel1Res.body.data?.status !== 'CANCELLED') {
    console.error('FAIL: Customer cancellation failed:', cancel1Res.body);
    process.exit(1);
  }

  const restoredVariantStock1 = (await prisma.productVariant.findUnique({ where: { id: variant.id } }))?.stock;
  console.log(`       PostgreSQL Stock after cancellation: ${restoredVariantStock1}`);
  if (restoredVariantStock1 !== initialVariantStock) {
    console.error('FAIL: Stock was not restored after customer cancellation');
    process.exit(1);
  }
  console.log('       PASS: Customer PLACED order cancelled cleanly & stock restored in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 2: CUSTOMER CANCEL AFTER MERCHANT PACKING (BLOCKED)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Customer Cancel After Packing (Blocked) ---');
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: variant.id, quantity: 1 });

  const order2Res = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'COD' });

  const order2 = Array.isArray(order2Res.body.data) ? order2Res.body.data[0] : order2Res.body.data;
  
  // Merchant updates status to CONFIRMED -> PACKING
  await request(app).put(`/api/orders/${order2.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'CONFIRMED' });
  await request(app).put(`/api/orders/${order2.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'PACKING' });

  console.log(`   Order 2 Status set to PACKING by Merchant.`);
  console.log('   2a. Customer attempting to cancel PACKING order...');
  
  const cancel2BlockedRes = await request(app)
    .post(`/api/customer/orders/${order2.id}/cancel`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ reason: 'Want to cancel late' });

  console.log(`       Cancel HTTP ${cancel2BlockedRes.status}: ${cancel2BlockedRes.body.error?.message}`);
  if (cancel2BlockedRes.status !== 400 || !cancel2BlockedRes.body.error?.message.includes('cannot be cancelled')) {
    console.error('FAIL: Late customer cancellation was not blocked');
    process.exit(1);
  }
  console.log('       PASS: Late customer cancellation blocked cleanly according to policy!');

  // ------------------------------------------------------------------
  // TEST 3: MERCHANT CANCEL BEFORE DELIVERY (ALLOWED)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Merchant Cancel Before Delivery (Allowed) ---');
  console.log('   3a. Merchant cancelling order in PACKING stage (/api/customer/orders/:id/merchant-cancel)...');
  
  const merchantCancelRes = await request(app)
    .post(`/api/customer/orders/${order2.id}/merchant-cancel`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ reason: 'Out of stock' });

  console.log(`       Merchant Cancel HTTP ${merchantCancelRes.status}: status=${merchantCancelRes.body.data?.status}`);
  if (merchantCancelRes.status !== 200 || merchantCancelRes.body.data?.status !== 'CANCELLED') {
    console.error('FAIL: Merchant cancellation failed:', merchantCancelRes.body);
    process.exit(1);
  }
  console.log('       PASS: Merchant cancelled order successfully!');

  // ------------------------------------------------------------------
  // TEST 4: PAID ONLINE ORDER CANCEL & REFUND TO WALLET
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Online Order Cancellation & Refund Processing ---');
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: variant.id, quantity: 1 });

  const order3Res = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'RAZORPAY' });

  const order3 = Array.isArray(order3Res.body.data) ? order3Res.body.data[0] : order3Res.body.data;
  
  // Confirm Online Payment SUCCESS
  await request(app).post('/api/customer/orders/confirm-payment').send({ paymentId: order3.payment.id, status: 'SUCCESS', gatewayPaymentId: 'pay_rzp_qa_123' });

  // Verify wallet before cancel
  let wallet = await prisma.wallet.findUnique({ where: { customerId: customerProfile!.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { customerId: customerProfile!.id, balance: 0.0 } });
  }
  const initialWalletBalance = wallet.balance;
  console.log(`   Customer Wallet Balance BEFORE Refund: ₹${initialWalletBalance}`);

  // Cancel Paid Order
  console.log('   4a. Cancelling PAID Online Order...');
  const cancel3Res = await request(app)
    .post(`/api/customer/orders/${order3.id}/cancel`)
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`       Cancel HTTP ${cancel3Res.status}: paymentStatus=${cancel3Res.body.data?.paymentStatus}`);
  if (cancel3Res.body.data?.paymentStatus !== 'REFUNDED') {
    console.error('FAIL: Payment status was not set to REFUNDED');
    process.exit(1);
  }

  // Check updated wallet balance & transaction log
  const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
  const walletTxLog = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`   Customer Wallet Balance AFTER Refund: ₹${updatedWallet?.balance}`);
  console.log(`   Wallet Transaction Log: ${walletTxLog?.type} ₹${walletTxLog?.amount} ("${walletTxLog?.description}")`);

  const expectedWalletBalance = initialWalletBalance + order3.totalAmount;
  if (updatedWallet?.balance !== expectedWalletBalance) {
    console.error(`FAIL: Wallet balance mismatch after refund! Expected ₹${expectedWalletBalance}, got ₹${updatedWallet?.balance}`);
    process.exit(1);
  }
  console.log('   PASS: Paid Online Order refunded to customer wallet with audit transaction log!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 17 CANCELLATION & REFUNDS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase17().catch((err) => {
  console.error('Phase 17 Cancellation & Refunds Failure:', err);
  process.exit(1);
});

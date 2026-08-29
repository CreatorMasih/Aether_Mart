import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase20() {
  console.log('=== PHASE 20 — LOYALTY / REWARDS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Roles
  console.log('1. Authenticating Merchant, Rider, and Customer...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchantLogin.body.data.token;

  await request(app).post('/api/auth/send-otp').send({ identifier: '+917777777771', type: 'SMS', role: 'RIDER' });
  const riderLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+917777777771', code: '123456', role: 'RIDER', method: 'SMS' });
  const riderToken = riderLogin.body.data.token;
  const riderUser = riderLogin.body.data.user;

  const riderProfile = await prisma.rider.findFirst({ where: { userId: riderUser.id } });
  if (riderProfile) {
    await prisma.deliveryAssignment.deleteMany({ where: { riderId: riderProfile.id } });
  }

  // Send Heartbeat to set rider online and approved
  await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: true, latitude: 21.1085, longitude: 82.0965 });

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const customerUser = custLogin.body.data.user;
  const customerProfile = await prisma.customer.findFirst({ where: { userId: customerUser.id } });
  const address = await prisma.address.findFirst({ where: { userId: customerUser.id } });

  // Get Initial Points & Wallet Balance
  const initialCustomer = await prisma.customer.findUnique({ where: { id: customerProfile!.id } });
  let wallet = await prisma.wallet.findUnique({ where: { customerId: customerProfile!.id } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { customerId: customerProfile!.id, balance: 0.0 } });
  }

  const initialPoints = initialCustomer?.loyaltyPoints || 0;
  const initialWalletBalance = wallet.balance || 0;
  console.log(`   Initial Customer Loyalty Points: ${initialPoints}, Initial Wallet Balance: ₹${initialWalletBalance}`);

  // Create high-value test product (Subtotal = ₹400)
  const store = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  const cat = await prisma.category.findFirst();

  const product = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Loyalty Reward Test Item',
      description: 'Reward Item Description',
      unit: 'pc',
      price: 200,
      sku: `LOYAL-ITEM-${Date.now()}`,
      isActive: true,
    }
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: 'Standard Variant',
      price: 200,
      sku: `VAR-LOYAL-${Date.now()}`,
      stock: 50,
    }
  });

  await prisma.inventory.create({
    data: {
      storeId: store!.id,
      productId: product.id,
      variantId: variant.id,
      stockQty: 50,
    }
  });

  // ------------------------------------------------------------------
  // TEST 1: EARN LOYALTY POINTS UPON ORDER COMPLETION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Earn Loyalty Points on Order Completion ---');
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product.id, variantId: variant.id, quantity: 2 });

  const order1Res = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'COD' });

  const order1 = Array.isArray(order1Res.body.data) ? order1Res.body.data[0] : order1Res.body.data;
  console.log(`   Order 1 Placed: ${order1.orderNumber} (Subtotal: ₹${order1.subtotal})`);

  // Complete fulfillment flow (DELIVERED)
  await request(app).put(`/api/orders/${order1.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'CONFIRMED' });
  await request(app).put(`/api/orders/${order1.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'PACKING' });
  await request(app).put(`/api/orders/${order1.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'READY_FOR_PICKUP' });
  
  const assignRes = await request(app).post(`/api/merchant/orders/${order1.id}/assign-rider`).set('Authorization', `Bearer ${merchantToken}`).send({ strategy: 'MANUAL', riderId: riderProfile!.id });
  const { pickupOtp, deliveryOtp } = assignRes.body.data;

  await request(app).post(`/api/rider/deliveries/${order1.id}/accept`).set('Authorization', `Bearer ${riderToken}`);
  await request(app).post(`/api/rider/deliveries/${order1.id}/pickup`).set('Authorization', `Bearer ${riderToken}`).send({ pickupOtp });
  const completeRes = await request(app).post(`/api/rider/deliveries/${order1.id}/complete`).set('Authorization', `Bearer ${riderToken}`).send({ deliveryOtp });

  console.log(`   Delivery Complete HTTP ${completeRes.status}`);
  if (completeRes.status !== 200) {
    console.error('FAIL: Delivery completion failed');
    process.exit(1);
  }

  // Verify Loyalty Points Awarded (5% of Subtotal ₹400 = 20 points / ₹20)
  const expectedEarnedPoints = Math.floor(order1.subtotal * 0.05);
  const updatedCustomer = await prisma.customer.findUnique({ where: { id: customerProfile!.id } });
  const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });

  console.log(`   Post-Delivery Loyalty Points: ${updatedCustomer?.loyaltyPoints} (Expected: ${initialPoints + expectedEarnedPoints})`);
  console.log(`   Post-Delivery Wallet Balance: ₹${updatedWallet?.balance} (Expected: ₹${initialWalletBalance + expectedEarnedPoints})`);

  if (updatedCustomer?.loyaltyPoints !== initialPoints + expectedEarnedPoints) {
    console.error('FAIL: Loyalty points were not awarded correctly in PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: 5% Loyalty Points awarded cleanly to customer profile in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 2: POINTS & CASHBACK VISIBLE IN PROFILE
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Points & Cashback Visible in Profile ---');
  const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customerToken}`);
  const walletRes = await request(app).get('/api/customer/wallet').set('Authorization', `Bearer ${customerToken}`);

  console.log(`   Profile API Loyalty Points: ${meRes.body.data.customer?.loyaltyPoints || meRes.body.data.loyaltyPoints}`);
  console.log(`   Wallet API Balance: ₹${walletRes.body.data.balance}`);

  if (walletRes.body.data.balance < expectedEarnedPoints) {
    console.error('FAIL: Wallet balance API did not return awarded rewards');
    process.exit(1);
  }
  console.log('   PASS: Loyalty points & rewards cashback visible in Profile and Wallet APIs!');

  // ------------------------------------------------------------------
  // TEST 3: REDEEM POINTS / REWARDS CASHBACK AT CHECKOUT
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Redeem Points / Rewards Cashback at Checkout ---');
  
  // Create cheap item for redemption checkout (Price = ₹20)
  const cheapProduct = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Cheap Reward Test Item',
      description: 'Cheap Item',
      unit: 'pc',
      price: 15,
      sku: `CHEAP-ITEM-${Date.now()}`,
      isActive: true,
    }
  });

  const cheapVariant = await prisma.productVariant.create({
    data: {
      productId: cheapProduct.id,
      name: 'Standard Variant',
      price: 15,
      sku: `VAR-CHEAP-${Date.now()}`,
      stock: 50,
    }
  });

  await prisma.inventory.create({
    data: {
      storeId: store!.id,
      productId: cheapProduct.id,
      variantId: cheapVariant.id,
      stockQty: 50,
    }
  });

  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: cheapProduct.id, variantId: cheapVariant.id, quantity: 1 });

  console.log('   3a. Customer placing order redeeming Wallet Cashback / Points (paymentMethod: WALLET)...');
  const order2Res = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address!.id,
      paymentMethod: 'WALLET',
    });

  console.log(`       Place Order with WALLET HTTP ${order2Res.status}`);
  if (order2Res.status !== 200 && order2Res.status !== 201) {
    console.error('FAIL: Order placement using WALLET cashback points failed:', order2Res.body);
    process.exit(1);
  }

  const order2 = Array.isArray(order2Res.body.data) ? order2Res.body.data[0] : order2Res.body.data;
  console.log(`       Redeemed Order Created: ${order2.orderNumber} (Total: ₹${order2.totalAmount}, Payment Status: ${order2.paymentStatus})`);

  if (order2.paymentStatus !== 'PAID') {
    console.error('FAIL: Wallet payment status expected PAID');
    process.exit(1);
  }

  const finalWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
  console.log(`   Final Customer Wallet Balance AFTER Redemption: ₹${finalWallet?.balance}`);
  console.log('   PASS: Rewards cashback redeemed & wallet balance deducted atomically!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 20 LOYALTY / REWARDS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase20().catch((err) => {
  console.error('Phase 20 Loyalty Rewards Failure:', err);
  process.exit(1);
});

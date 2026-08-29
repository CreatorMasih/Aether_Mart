import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase13() {
  console.log('=== PHASE 13 — RIDER PORTAL & EARNINGS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Roles
  console.log('1. Authenticating Merchant, Rider (+917777777771), and Customer...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchantLogin.body.data.token;

  await request(app).post('/api/auth/send-otp').send({ identifier: '+917777777771', type: 'SMS', role: 'RIDER' });
  const riderLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+917777777771', code: '123456', role: 'RIDER', method: 'SMS' });
  const riderToken = riderLogin.body.data.token;
  const riderUser = riderLogin.body.data.user;

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;

  // Step 2: Toggle Rider Duty Status (ONLINE / OFFLINE)
  console.log('\n2. Testing Rider Duty Status Toggle (Online / Offline)...');
  
  // Set Online
  let hbRes = await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: true, latitude: 21.1085, longitude: 82.0965 });

  console.log(`   Heartbeat ONLINE HTTP ${hbRes.status}: isOnline=${hbRes.body.data?.isOnline}`);
  if (hbRes.status !== 200 || !hbRes.body.data?.isOnline) {
    console.error('FAIL: Setting rider online failed');
    process.exit(1);
  }

  const riderProfile = await prisma.rider.findFirst({ where: { userId: riderUser.id } });
  if (riderProfile) {
    await prisma.deliveryAssignment.deleteMany({ where: { riderId: riderProfile.id } });
  }

  // Get Initial Earnings State
  console.log('\n3. Fetching Initial Rider Earnings...');
  const initialEarningsRes = await request(app)
    .get('/api/rider/earnings')
    .set('Authorization', `Bearer ${riderToken}`);

  console.log(`   Earnings HTTP ${initialEarningsRes.status}`);
  const initialBalance = initialEarningsRes.body.data.balance || 0;
  const initialCompleted = initialEarningsRes.body.data.completedCount || 0;
  console.log(`   Initial Balance: ₹${initialBalance}, Initial Completed Deliveries: ${initialCompleted}`);

  // Step 3: Customer places order with Base Pay (Delivery Fee) + Driver Tip
  console.log('\n4. Customer placing order with Delivery Fee + ₹25 Driver Tip...');
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const product = await prisma.product.findFirst({ where: { isActive: true, store: { isOpen: true, isPaused: false } }, include: { variants: true } });

  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: product!.variants[0].id, quantity: 1 });
  
  const orderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address!.id,
      paymentMethod: 'COD',
      driverTip: 25, // ₹25 Tip
    });

  const order = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
  console.log(`   Placed Order: ${order.orderNumber} (Delivery Fee: ₹${order.deliveryFee}, Driver Tip: ₹${order.driverTip})`);

  const expectedShipmentEarnings = order.deliveryFee + order.driverTip;
  console.log(`   Expected Shipment Earnings: ₹${expectedShipmentEarnings} (Base ₹${order.deliveryFee} + Tip ₹${order.driverTip})`);

  // Step 4: Complete Fulfillment Flow to trigger Earnings Update
  console.log('\n5. Completing Fulfillment Flow for Order...');
  const assignRes = await request(app).post(`/api/merchant/orders/${order.id}/assign-rider`).set('Authorization', `Bearer ${merchantToken}`).send({ strategy: 'MANUAL', riderId: riderProfile!.id });
  const { pickupOtp, deliveryOtp } = assignRes.body.data;

  await request(app).post(`/api/rider/deliveries/${order.id}/accept`).set('Authorization', `Bearer ${riderToken}`);
  await request(app).post(`/api/rider/deliveries/${order.id}/pickup`).set('Authorization', `Bearer ${riderToken}`).send({ pickupOtp });
  const completeRes = await request(app).post(`/api/rider/deliveries/${order.id}/complete`).set('Authorization', `Bearer ${riderToken}`).send({ deliveryOtp });

  console.log(`   Delivery Complete HTTP ${completeRes.status}`);
  if (completeRes.status !== 200) {
    console.error('FAIL: Delivery completion failed');
    process.exit(1);
  }

  // Step 5: Verify Updated Rider Earnings & Wallet Balance
  console.log('\n6. Verifying Updated Rider Earnings & Wallet Balance...');
  const updatedEarningsRes = await request(app)
    .get('/api/rider/earnings')
    .set('Authorization', `Bearer ${riderToken}`);

  const updatedData = updatedEarningsRes.body.data;
  console.log(`   Updated Balance: ₹${updatedData.balance}`);
  console.log(`   Today Earnings: ₹${updatedData.todayEarnings}`);
  console.log(`   Completed Count: ${updatedData.completedCount}`);

  const expectedNewBalance = initialBalance + expectedShipmentEarnings;
  if (updatedData.balance !== expectedNewBalance) {
    console.error(`FAIL: Rider balance mismatch! Expected ₹${expectedNewBalance}, got ₹${updatedData.balance}`);
    process.exit(1);
  }
  console.log('   PASS: Rider wallet balance increased by exact sum of (Base Pay + Tip)!');

  if (updatedData.completedCount !== initialCompleted + 1) {
    console.error('FAIL: Completed delivery count failed to increment');
    process.exit(1);
  }
  console.log('   PASS: Completed delivery count incremented cleanly!');

  // Step 6: Test Setting Duty Status OFFLINE
  console.log('\n7. Setting Rider Duty Status OFFLINE...');
  hbRes = await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: false, latitude: 21.1085, longitude: 82.0965 });

  console.log(`   Heartbeat OFFLINE HTTP ${hbRes.status}: isOnline=${hbRes.body.data?.isOnline}`);
  if (hbRes.body.data?.isOnline !== false) {
    console.error('FAIL: Setting rider offline failed');
    process.exit(1);
  }
  console.log('   PASS: Rider duty status set to OFFLINE successfully!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 13 RIDER PORTAL & EARNINGS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase13().catch((err) => {
  console.error('Phase 13 Rider Earnings Failure:', err);
  process.exit(1);
});

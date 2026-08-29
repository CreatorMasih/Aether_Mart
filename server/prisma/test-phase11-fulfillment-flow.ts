import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase11() {
  console.log('=== PHASE 11 — FULFILLMENT FLOW QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // 1. Authenticate Merchant (+918888888881)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantLogin = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchantLogin.body.data.token;

  // 2. Authenticate Rider (+917777777771)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+917777777771', type: 'SMS', role: 'RIDER' });
  const riderLogin = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+917777777771', code: '123456', role: 'RIDER', method: 'SMS' });
  const riderToken = riderLogin.body.data.token;
  const riderUser = riderLogin.body.data.user;

  // Send Heartbeat to set rider online
  await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: true, latitude: 21.1085, longitude: 82.0965 });

  const riderProfile = await prisma.rider.findFirst({ where: { userId: riderUser.id } });
  if (riderProfile) {
    await prisma.deliveryAssignment.deleteMany({ where: { riderId: riderProfile.id } });
  }

  // 3. Authenticate Customer (+919876543210) & Place Order
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;

  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const product = await prisma.product.findFirst({ where: { isActive: true, store: { isOpen: true, isPaused: false } }, include: { variants: true } });

  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: product!.variants[0].id, quantity: 1 });

  // STEP 1: PLACED
  console.log('1. Customer placing order (State: PLACED)...');
  const orderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'COD' });

  const order = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
  console.log(`   Order Number: ${order.orderNumber} (ID: ${order.id})`);

  let custTrackRes = await request(app).get(`/api/customer/orders/${order.id}`).set('Authorization', `Bearer ${customerToken}`);
  console.log(`   Customer Track Status [Step 1]: ${custTrackRes.body.data.status}`);
  if (custTrackRes.body.data.status !== 'PLACED') {
    console.error('FAIL: Status expected PLACED');
    process.exit(1);
  }

  // STEP 2: CONFIRMED
  console.log('\n2. Merchant accepting order (State: CONFIRMED)...');
  const confirmRes = await request(app)
    .put(`/api/orders/${order.id}/status`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ status: 'CONFIRMED' });

  console.log(`   Merchant Status Update HTTP ${confirmRes.status}`);
  custTrackRes = await request(app).get(`/api/customer/orders/${order.id}`).set('Authorization', `Bearer ${customerToken}`);
  console.log(`   Customer Track Status [Step 2]: ${custTrackRes.body.data.status}`);
  if (custTrackRes.body.data.status !== 'CONFIRMED') {
    console.error('FAIL: Status expected CONFIRMED');
    process.exit(1);
  }

  // STEP 3: PACKING
  console.log('\n3. Merchant packing order (State: PACKING)...');
  await request(app)
    .put(`/api/orders/${order.id}/status`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ status: 'PACKING' });

  custTrackRes = await request(app).get(`/api/customer/orders/${order.id}`).set('Authorization', `Bearer ${customerToken}`);
  console.log(`   Customer Track Status [Step 3]: ${custTrackRes.body.data.status}`);
  if (custTrackRes.body.data.status !== 'PACKING') {
    console.error('FAIL: Status expected PACKING');
    process.exit(1);
  }

  // STEP 4: READY_FOR_PICKUP & Rider Assignment
  console.log('\n4. Merchant marking READY_FOR_PICKUP & assigning rider...');
  await request(app)
    .put(`/api/orders/${order.id}/status`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ status: 'READY_FOR_PICKUP' });

  const assignRes = await request(app)
    .post(`/api/merchant/orders/${order.id}/assign-rider`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ strategy: 'MANUAL', riderId: riderProfile!.id });

  const assignment = assignRes.body.data;
  console.log(`   Rider Assignment created (pickupOtp: ${assignment.pickupOtp}, deliveryOtp: ${assignment.deliveryOtp})`);

  custTrackRes = await request(app).get(`/api/customer/orders/${order.id}`).set('Authorization', `Bearer ${customerToken}`);
  console.log(`   Customer Track Status [Step 4]: ${custTrackRes.body.data.status}`);
  if (custTrackRes.body.data.status !== 'READY_FOR_PICKUP') {
    console.error('FAIL: Status expected READY_FOR_PICKUP');
    process.exit(1);
  }

  // STEP 5: Rider Accepts & Confirms Pickup -> OUT_FOR_DELIVERY
  console.log('\n5. Rider accepting & confirming pickup (State: OUT_FOR_DELIVERY)...');
  await request(app)
    .post(`/api/rider/deliveries/${order.id}/accept`)
    .set('Authorization', `Bearer ${riderToken}`);

  const pickupRes = await request(app)
    .post(`/api/rider/deliveries/${order.id}/pickup`)
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ pickupOtp: assignment.pickupOtp });

  if (pickupRes.status !== 200) {
    console.error('FAIL: Pickup confirmation failed:', pickupRes.body);
    process.exit(1);
  }

  custTrackRes = await request(app).get(`/api/customer/orders/${order.id}`).set('Authorization', `Bearer ${customerToken}`);
  console.log(`   Customer Track Status [Step 5]: ${custTrackRes.body.data.status}`);
  if (custTrackRes.body.data.status !== 'OUT_FOR_DELIVERY') {
    console.error('FAIL: Status expected OUT_FOR_DELIVERY');
    process.exit(1);
  }

  // STEP 6: Rider Confirms Delivery with Customer OTP -> DELIVERED
  console.log('\n6. Rider confirming delivery with Customer OTP (State: DELIVERED)...');
  const deliverRes = await request(app)
    .post(`/api/rider/deliveries/${order.id}/complete`)
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ deliveryOtp: assignment.deliveryOtp });

  console.log(`   Delivery Complete HTTP ${deliverRes.status}`);
  if (deliverRes.status !== 200) {
    console.error('FAIL: Delivery completion failed:', deliverRes.body);
    process.exit(1);
  }

  custTrackRes = await request(app).get(`/api/customer/orders/${order.id}`).set('Authorization', `Bearer ${customerToken}`);
  console.log(`   Customer Track Status [Step 6]: ${custTrackRes.body.data.status}`);
  console.log(`   Customer Payment Status [Step 6]: ${custTrackRes.body.data.paymentStatus}`);

  if (custTrackRes.body.data.status !== 'DELIVERED') {
    console.error('FAIL: Status expected DELIVERED');
    process.exit(1);
  }
  if (custTrackRes.body.data.paymentStatus !== 'PAID') {
    console.error('FAIL: COD Payment status expected PAID after delivery');
    process.exit(1);
  }

  console.log('\n===============================================');
  console.log('🎉 PHASE 11 FULFILLMENT FLOW PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase11().catch((err) => {
  console.error('Phase 11 Fulfillment Flow Failure:', err);
  process.exit(1);
});

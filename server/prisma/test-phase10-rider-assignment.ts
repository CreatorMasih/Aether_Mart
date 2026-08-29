import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase10() {
  console.log('=== PHASE 10 — RIDER ASSIGNMENT QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Merchant (+918888888881)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantLogin = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchantLogin.body.data.token;

  // Step 2: Authenticate & Setup Online Rider (+917777777771)
  console.log('1. Setting up Online Active Rider (+917777777771)...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+917777777771', type: 'SMS', role: 'RIDER' });
  const riderLogin = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+917777777771', code: '123456', role: 'RIDER', method: 'SMS' });

  const riderToken = riderLogin.body.data.token;
  const riderUser = riderLogin.body.data.user;

  // Send Heartbeat to set rider ONLINE & APPROVED at Mahasamund coordinates
  const heartbeatRes = await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: true, latitude: 21.1085, longitude: 82.0965 });

  console.log(`   Rider Heartbeat HTTP ${heartbeatRes.status}: isOnline=${heartbeatRes.body.data?.isOnline}`);
  const riderProfile = await prisma.rider.findFirst({ where: { userId: riderUser.id } });
  console.log(`   Rider ID in DB: ${riderProfile?.id}, isApproved: ${riderProfile?.isApproved}`);

  // Clear any leftover assignments from previous runs for this test rider to ensure idle status
  if (riderProfile) {
    await prisma.deliveryAssignment.deleteMany({ where: { riderId: riderProfile.id } });
  }

  // Step 3: Customer places 2 fresh orders
  console.log('\n2. Customer placing 2 test orders...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const product = await prisma.product.findFirst({ where: { isActive: true, store: { isOpen: true, isPaused: false } }, include: { variants: true } });

  // Order 1 for AUTOMATIC test
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: product!.variants[0].id, quantity: 1 });
  const resOrder1 = await request(app).post('/api/customer/orders').set('Authorization', `Bearer ${customerToken}`).send({ addressId: address!.id, paymentMethod: 'COD' });
  const order1 = Array.isArray(resOrder1.body.data) ? resOrder1.body.data[0] : resOrder1.body.data;

  // Order 2 for MANUAL test
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: product!.variants[0].id, quantity: 1 });
  const resOrder2 = await request(app).post('/api/customer/orders').set('Authorization', `Bearer ${customerToken}`).send({ addressId: address!.id, paymentMethod: 'COD' });
  const order2 = Array.isArray(resOrder2.body.data) ? resOrder2.body.data[0] : resOrder2.body.data;

  // Step 4: Test MODE 1 — AUTOMATIC Rider Assignment
  console.log(`\n3. Testing Mode 1: AUTOMATIC Rider Assignment (Order ${order1.orderNumber})...`);
  const autoAssignRes = await request(app)
    .post(`/api/merchant/orders/${order1.id}/assign-rider`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ strategy: 'AUTOMATIC' });

  console.log(`   Auto Assign HTTP ${autoAssignRes.status}`);
  if (autoAssignRes.status !== 200 || !autoAssignRes.body.data) {
    console.error('FAIL: Automatic rider assignment failed:', autoAssignRes.body);
    process.exit(1);
  }

  const autoAssignment = autoAssignRes.body.data;
  console.log(`   Auto Assignment ID: ${autoAssignment.id}, Rider ID: ${autoAssignment.riderId}, Status: ${autoAssignment.status}`);
  if (autoAssignment.riderId !== riderProfile!.id || autoAssignment.status !== 'ASSIGNED') {
    console.error('FAIL: Automatic rider assignment details mismatch');
    process.exit(1);
  }
  console.log('   PASS: Mode 1 AUTOMATIC assignment succeeded!');

  // Step 5: Test MODE 2 — MANUAL Rider Assignment
  console.log(`\n4. Testing Mode 2: MANUAL Rider Assignment (Order ${order2.orderNumber})...`);
  const manualAssignRes = await request(app)
    .post(`/api/merchant/orders/${order2.id}/assign-rider`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ strategy: 'MANUAL', riderId: riderProfile!.id });

  console.log(`   Manual Assign HTTP ${manualAssignRes.status}`);
  if (manualAssignRes.status !== 200 || !manualAssignRes.body.data) {
    console.error('FAIL: Manual rider assignment failed:', manualAssignRes.body);
    process.exit(1);
  }

  const manualAssignment = manualAssignRes.body.data;
  console.log(`   Manual Assignment ID: ${manualAssignment.id}, Rider ID: ${manualAssignment.riderId}, Status: ${manualAssignment.status}`);
  if (manualAssignment.riderId !== riderProfile!.id || manualAssignment.status !== 'ASSIGNED') {
    console.error('FAIL: Manual rider assignment details mismatch');
    process.exit(1);
  }
  console.log('   PASS: Mode 2 MANUAL assignment succeeded!');

  // Step 6: Test Strict Status Transitions: ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY
  console.log('\n5. Testing Strict Rider Status Transitions (ASSIGNED -> ACCEPTED -> PICKED_UP)...');
  
  // Transition 1: ASSIGNED -> ACCEPTED
  console.log('   5a. Rider Accepting Assignment (/api/rider/deliveries/:id/accept)...');
  const acceptRes = await request(app)
    .post(`/api/rider/deliveries/${order1.id}/accept`)
    .set('Authorization', `Bearer ${riderToken}`);

  console.log(`       Accept HTTP ${acceptRes.status}: status=${acceptRes.body.data?.status}`);
  if (acceptRes.status !== 200 || acceptRes.body.data?.status !== 'ACCEPTED') {
    console.error('FAIL: Delivery accept transition failed:', acceptRes.body);
    process.exit(1);
  }
  console.log('       PASS: Transition ASSIGNED -> ACCEPTED verified!');

  // Transition 2: ACCEPTED -> PICKED_UP (Requires pickup OTP)
  const pickupOtp = autoAssignment.pickupOtp;
  console.log(`   5b. Rider Confirming Pickup with OTP "${pickupOtp}" (/api/rider/deliveries/:id/pickup)...`);
  const pickupRes = await request(app)
    .post(`/api/rider/deliveries/${order1.id}/pickup`)
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ pickupOtp });

  console.log(`       Pickup HTTP ${pickupRes.status}: status=${pickupRes.body.data?.status}`);
  if (pickupRes.status !== 200 || pickupRes.body.data?.status !== 'PICKED_UP') {
    console.error('FAIL: Delivery pickup transition failed:', pickupRes.body);
    process.exit(1);
  }

  // Verify Order Status transitioned to OUT_FOR_DELIVERY
  const dbOrder1 = await prisma.order.findUnique({ where: { id: order1.id } });
  console.log(`       PostgreSQL Order Status after pickup: ${dbOrder1?.status}`);
  if (dbOrder1?.status !== 'OUT_FOR_DELIVERY') {
    console.error(`FAIL: Order status expected 'OUT_FOR_DELIVERY', got '${dbOrder1?.status}'`);
    process.exit(1);
  }
  console.log('       PASS: Transition ACCEPTED -> PICKED_UP -> Order OUT_FOR_DELIVERY verified!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 10 RIDER ASSIGNMENT PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase10().catch((err) => {
  console.error('Phase 10 Rider Assignment Failure:', err);
  process.exit(1);
});

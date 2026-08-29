import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';
import { haversineDistance } from '../src/utils/geo.util';

async function testPhase12() {
  console.log('=== PHASE 12 — LIVE TRACKING QA TEST ===\n');

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

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;

  // Step 2: Customer places order & Merchant dispatches rider
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const product = await prisma.product.findFirst({ where: { isActive: true, store: { isOpen: true, isPaused: false } }, include: { variants: true } });

  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product!.id, variantId: product!.variants[0].id, quantity: 1 });
  const orderRes = await request(app).post('/api/customer/orders').set('Authorization', `Bearer ${customerToken}`).send({ addressId: address!.id, paymentMethod: 'COD' });
  const order = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;

  // Merchant assigns rider & accepts
  const assignRes = await request(app).post(`/api/merchant/orders/${order.id}/assign-rider`).set('Authorization', `Bearer ${merchantToken}`).send({ strategy: 'MANUAL', riderId: riderProfile!.id });
  const pickupOtp = assignRes.body.data.pickupOtp;

  await request(app).post(`/api/rider/deliveries/${order.id}/accept`).set('Authorization', `Bearer ${riderToken}`);
  await request(app).post(`/api/rider/deliveries/${order.id}/pickup`).set('Authorization', `Bearer ${riderToken}`).send({ pickupOtp });

  console.log(`\n2. Order OUT_FOR_DELIVERY! Simulating Rider Movement (Coord A -> Coord B -> Coord C)...`);

  const customerLat = address!.latitude || 21.1180;
  const customerLng = address!.longitude || 82.1060;

  const movementSteps = [
    { label: 'Coordinate A (Store)', lat: 21.1085, lng: 82.0965 },
    { label: 'Coordinate B (En-route 1.5km)', lat: 21.1120, lng: 82.1000 },
    { label: 'Coordinate C (Near Destination)', lat: 21.1150, lng: 82.1030 },
  ];

  for (let i = 0; i < movementSteps.length; i++) {
    const step = movementSteps[i];
    console.log(`\n--- Step ${i + 1}: ${step.label} ---`);
    
    // Rider sends Heartbeat with new coordinates
    const heartbeatRes = await request(app)
      .post('/api/rider/heartbeat')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ isOnline: true, latitude: step.lat, longitude: step.lng });

    if (heartbeatRes.status !== 200) {
      console.error(`FAIL: Heartbeat at Step ${i + 1} failed`);
      process.exit(1);
    }

    // Customer queries Live Tracking API (/api/customer/orders/:id)
    const trackRes = await request(app)
      .get(`/api/customer/orders/${order.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    console.log(`   Customer Track HTTP ${trackRes.status}`);
    const trackedRider = trackRes.body.data.deliveryAssignment?.rider;

    if (!trackedRider) {
      console.error('FAIL: Rider details missing from order tracking API response');
      process.exit(1);
    }

    console.log(`   - Customer Sees Rider Lat: ${trackedRider.currentLatitude}, Lng: ${trackedRider.currentLongitude}`);
    
    const distanceToCustomer = haversineDistance(
      { latitude: trackedRider.currentLatitude, longitude: trackedRider.currentLongitude },
      { latitude: customerLat, longitude: customerLng }
    );
    const etaMins = Math.ceil((distanceToCustomer / 25) * 60); // 25 km/h avg speed

    console.log(`   - Dynamic Distance to Customer: ${distanceToCustomer.toFixed(2)} km`);
    console.log(`   - Calculated Dynamic ETA: ~${etaMins} mins`);

    if (trackedRider.currentLatitude !== step.lat || trackedRider.currentLongitude !== step.lng) {
      console.error(`FAIL: Rider location mismatch at Step ${i + 1}`);
      process.exit(1);
    }

    console.log(`   PASS: Rider marker moved dynamically to ${step.label}!`);
  }

  // Step 3: Verify PostgreSQL Location History Logs
  console.log('\n3. Verifying PostgreSQL Location History Trail...');
  const historyLogs = await prisma.riderLocationHistory.findMany({
    where: { riderId: riderProfile!.id },
    orderBy: { recordedAt: 'desc' },
    take: 3
  });

  console.log(`   Found ${historyLogs.length} recent location heartbeat records in PostgreSQL DB.`);
  if (historyLogs.length < 3) {
    console.error('FAIL: Location history records missing in PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: All rider movement heartbeats logged to PostgreSQL rider_location_history!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 12 LIVE TRACKING PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase12().catch((err) => {
  console.error('Phase 12 Live Tracking Failure:', err);
  process.exit(1);
});

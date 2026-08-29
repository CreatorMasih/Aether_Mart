import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase21() {
  console.log('=== PHASE 21 — RATINGS & REVIEWS QA TEST ===\n');

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

  await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: true, latitude: 21.1085, longitude: 82.0965 });

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });

  const store = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  const cat = await prisma.category.findFirst();

  // Reset ratings for Store & Rider
  await prisma.rating.deleteMany({ where: { targetId: { in: [store!.id, riderProfile!.id] } } });
  await prisma.store.update({ where: { id: store!.id }, data: { rating: 0.0 } });
  await prisma.rider.update({ where: { id: riderProfile!.id }, data: { rating: 0.0 } });

  const product = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Ratings Test Item',
      description: 'Ratings Item Description',
      unit: 'pc',
      price: 150,
      sku: `RATING-ITEM-${Date.now()}`,
      isActive: true,
    }
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: 'Standard Variant',
      price: 150,
      sku: `VAR-RATING-${Date.now()}`,
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
  // TEST 1: RATING NON-DELIVERED ORDER (BLOCKED)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Rating Non-Delivered Order (Blocked) ---');
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product.id, variantId: variant.id, quantity: 1 });

  const orderPendingRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'COD' });

  const orderPending = Array.isArray(orderPendingRes.body.data) ? orderPendingRes.body.data[0] : orderPendingRes.body.data;
  console.log(`   Order Pending Created (Status: ${orderPending.status}): ${orderPending.orderNumber}`);

  const ratePendingRes = await request(app)
    .post(`/api/customer/orders/${orderPending.id}/rate`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ storeRating: 5, riderRating: 5 });

  console.log(`   Rate Pending Order HTTP ${ratePendingRes.status}: ${ratePendingRes.body.error?.message}`);
  if (ratePendingRes.status !== 400 || !ratePendingRes.body.error?.message.includes('delivered orders')) {
    console.error('FAIL: Non-delivered order rating was not blocked');
    process.exit(1);
  }
  console.log('   PASS: Rating non-delivered order blocked with clear error message!');

  // ------------------------------------------------------------------
  // TEST 2: SUBMIT RATINGS FOR DELIVERED ORDER & AVERAGE RECALCULATION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Submit Ratings for Delivered Order & DB Average Recalculation ---');
  
  // Complete Order 1 fulfillment to DELIVERED
  await request(app).put(`/api/orders/${orderPending.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'CONFIRMED' });
  await request(app).put(`/api/orders/${orderPending.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'PACKING' });
  await request(app).put(`/api/orders/${orderPending.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'READY_FOR_PICKUP' });

  const assign1 = await request(app).post(`/api/merchant/orders/${orderPending.id}/assign-rider`).set('Authorization', `Bearer ${merchantToken}`).send({ strategy: 'MANUAL', riderId: riderProfile!.id });
  const { pickupOtp: pOtp1, deliveryOtp: dOtp1 } = assign1.body.data;

  await request(app).post(`/api/rider/deliveries/${orderPending.id}/accept`).set('Authorization', `Bearer ${riderToken}`);
  await request(app).post(`/api/rider/deliveries/${orderPending.id}/pickup`).set('Authorization', `Bearer ${riderToken}`).send({ pickupOtp: pOtp1 });
  await request(app).post(`/api/rider/deliveries/${orderPending.id}/complete`).set('Authorization', `Bearer ${riderToken}`).send({ deliveryOtp: dOtp1 });

  console.log(`   Order 1 Status set to DELIVERED.`);
  console.log('   2a. Customer submitting 5-star rating for Store & Rider...');

  const rate1Res = await request(app)
    .post(`/api/customer/orders/${orderPending.id}/rate`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      storeRating: 5,
      storeComment: 'Excellent fresh products!',
      riderRating: 5,
      riderComment: 'Super fast delivery!',
    });

  console.log(`       Submit Rating HTTP ${rate1Res.status}`);
  if (rate1Res.status !== 200) {
    console.error('FAIL: Rating submission failed:', rate1Res.body);
    process.exit(1);
  }

  let dbStore = await prisma.store.findUnique({ where: { id: store!.id } });
  let dbRider = await prisma.rider.findUnique({ where: { id: riderProfile!.id } });

  console.log(`       PostgreSQL Store Rating: ${dbStore?.rating}`);
  console.log(`       PostgreSQL Rider Rating: ${dbRider?.rating}`);

  if (dbStore?.rating !== 5.0 || dbRider?.rating !== 5.0) {
    console.error('FAIL: Store or Rider rating mismatch after first rating');
    process.exit(1);
  }
  console.log('   PASS: Store & Rider average ratings calculated & updated in PostgreSQL (5.0 stars)!');

  // ------------------------------------------------------------------
  // TEST 3: DUPLICATE RATING BLOCKED
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Duplicate Rating Blocked ---');
  const duplicateRateRes = await request(app)
    .post(`/api/customer/orders/${orderPending.id}/rate`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ storeRating: 4, riderRating: 4 });

  console.log(`   Duplicate Rate HTTP ${duplicateRateRes.status}: ${duplicateRateRes.body.error?.message}`);
  if (duplicateRateRes.status !== 400 || !duplicateRateRes.body.error?.message.includes('already been submitted')) {
    console.error('FAIL: Duplicate rating submission was not blocked');
    process.exit(1);
  }
  console.log('   PASS: Duplicate rating submission blocked with ALREADY_EXISTS error!');

  // ------------------------------------------------------------------
  // TEST 4: MULTI-REVIEW AVERAGE RECALCULATION MATH
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Multi-Review Average Recalculation Math ---');
  // Deliver Order 2 and rate 3 stars for Store and 1 star for Rider
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product.id, variantId: variant.id, quantity: 1 });
  const order2Res = await request(app).post('/api/customer/orders').set('Authorization', `Bearer ${customerToken}`).send({ addressId: address!.id, paymentMethod: 'COD' });
  const order2 = Array.isArray(order2Res.body.data) ? order2Res.body.data[0] : order2Res.body.data;

  await request(app).put(`/api/orders/${order2.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'CONFIRMED' });
  await request(app).put(`/api/orders/${order2.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'PACKING' });
  await request(app).put(`/api/orders/${order2.id}/status`).set('Authorization', `Bearer ${merchantToken}`).send({ status: 'READY_FOR_PICKUP' });

  const assign2 = await request(app).post(`/api/merchant/orders/${order2.id}/assign-rider`).set('Authorization', `Bearer ${merchantToken}`).send({ strategy: 'MANUAL', riderId: riderProfile!.id });
  const { pickupOtp: pOtp2, deliveryOtp: dOtp2 } = assign2.body.data;

  await request(app).post(`/api/rider/deliveries/${order2.id}/accept`).set('Authorization', `Bearer ${riderToken}`);
  await request(app).post(`/api/rider/deliveries/${order2.id}/pickup`).set('Authorization', `Bearer ${riderToken}`).send({ pickupOtp: pOtp2 });
  await request(app).post(`/api/rider/deliveries/${order2.id}/complete`).set('Authorization', `Bearer ${riderToken}`).send({ deliveryOtp: dOtp2 });

  // Rate Order 2: Store = 3 stars, Rider = 1 star
  await request(app)
    .post(`/api/customer/orders/${order2.id}/rate`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ storeRating: 3, riderRating: 1 });

  dbStore = await prisma.store.findUnique({ where: { id: store!.id } });
  dbRider = await prisma.rider.findUnique({ where: { id: riderProfile!.id } });

  console.log(`   PostgreSQL Store Avg Rating: ${dbStore?.rating} (Expected (5 + 3)/2 = 4.0)`);
  console.log(`   PostgreSQL Rider Avg Rating: ${dbRider?.rating} (Expected (5 + 1)/2 = 3.0)`);

  if (dbStore?.rating !== 4.0 || dbRider?.rating !== 3.0) {
    console.error('FAIL: Multi-review average rating math mismatch in PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: Multi-review weighted average rating math recalculated flawlessly!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 21 RATINGS & REVIEWS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase21().catch((err) => {
  console.error('Phase 21 Ratings & Reviews Failure:', err);
  process.exit(1);
});

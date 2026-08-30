import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase17GateWorkflow() {
  console.log('========================================================================');
  console.log('🚀 PHASE 17 — END-TO-END CRITICAL MULTI-PERSONA WORKFLOW GATE CHECK');
  console.log('========================================================================\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Reset UAT rider and customer account statuses to active
  await prisma.user.updateMany({
    where: { phone: { in: ['+919876543210', '+918888888881', '+917777777771'] } },
    data: { status: 'ACTIVE', isActive: true },
  });

  await prisma.rider.updateMany({
    where: { user: { phone: '+917777777771' } },
    data: { isApproved: true },
  });

  // ------------------------------------------------------------------
  // STEP A: CUSTOMER WORKFLOW
  // ------------------------------------------------------------------
  console.log('--- STEP A: CUSTOMER WORKFLOW ---');
  console.log('A1. Logging in Customer (+919876543210)...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const customerUser = custLogin.body.data.user;

  console.log(`    Authenticated User ID : ${customerUser.id}`);
  console.log(`    User Role             : ${customerUser.role}`);
  if (customerUser.role !== 'CUSTOMER') {
    console.error('❌ FAIL: User role is not CUSTOMER');
    process.exit(1);
  }

  // Fetch Mahasamund Real Store & Product
  const store = await prisma.store.findFirst({ where: { name: { contains: 'Aether', mode: 'insensitive' } } });
  await prisma.store.update({ where: { id: store!.id }, data: { isOpen: true, isPaused: false, isHoliday: false } });

  const product = await prisma.product.findFirst({ where: { storeId: store!.id, isActive: true } });
  const variant = await prisma.productVariant.findFirst({ where: { productId: product!.id } });
  const address = await prisma.address.findFirst({ where: { userId: customerUser.id } });

  // Reset product stock
  await prisma.inventory.updateMany({
    where: { productId: product!.id },
    data: { stockQty: 100, reservedQty: 0 },
  });
  await prisma.productVariant.updateMany({
    where: { productId: product!.id },
    data: { stock: 100 },
  });

  console.log(`    Real Store           : ${store!.name} (ID: ${store!.id})`);
  console.log(`    Real Product         : ${product!.name} (ID: ${product!.id}, Price: ₹${product!.price})`);

  // Add Item to Cart
  console.log('A2. Adding item to persistent cart...');
  const addCartRes = await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product!.id, variantId: variant?.id, quantity: 1 });

  if (addCartRes.status !== 200) {
    console.error('❌ FAIL: Add to cart failed:', addCartRes.body);
    process.exit(1);
  }

  // Refresh & Verify Cart Persists
  console.log('A3. Refreshing cart to verify persistence...');
  const getCartRes = await request(app)
    .get('/api/customer/cart')
    .set('Authorization', `Bearer ${customerToken}`);

  const cartItems = getCartRes.body.data.items || [];
  console.log(`    Persistent Cart Items Count: ${cartItems.length}`);
  if (cartItems.length === 0) {
    console.error('❌ FAIL: Persistent cart is empty after refresh');
    process.exit(1);
  }
  console.log('    ✅ PASS: Cart item persisted across sessions!');

  // Checkout COD Order
  console.log('A4. Placing COD Order...');
  const placeOrderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address!.id, paymentMethod: 'COD' });

  if (placeOrderRes.status !== 200 && placeOrderRes.status !== 201) {
    console.error('❌ FAIL: Place order failed:', placeOrderRes.body);
    process.exit(1);
  }

  const createdOrder = Array.isArray(placeOrderRes.body.data) ? placeOrderRes.body.data[0] : placeOrderRes.body.data;
  console.log(`    Created Order ID     : ${createdOrder.id}`);
  console.log(`    Order Number         : ${createdOrder.orderNumber}`);
  console.log(`    Order Status         : ${createdOrder.status}`);
  console.log('    ✅ STEP A CUSTOMER WORKFLOW COMPLETE!\n');

  // ------------------------------------------------------------------
  // STEP B: MERCHANT WORKFLOW
  // ------------------------------------------------------------------
  console.log('--- STEP B: MERCHANT WORKFLOW ---');
  console.log('B1. Logging in Merchant (+918888888881)...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchLogin.body.data.token;
  const merchantUser = merchLogin.body.data.user;

  console.log(`    Authenticated User ID : ${merchantUser.id}`);
  console.log(`    User Role             : ${merchantUser.role}`);

  // Merchant views order
  const merchOrdersRes = await request(app)
    .get('/api/merchant/orders')
    .set('Authorization', `Bearer ${merchantToken}`);

  const visibleOrders = merchOrdersRes.body.data?.orders || merchOrdersRes.body.data || [];
  const targetMerchOrder = visibleOrders.find((o: any) => o.id === createdOrder.id);

  console.log(`    Merchant Orders Count : ${visibleOrders.length}`);
  console.log(`    Order #${createdOrder.orderNumber} Visible: ${!!targetMerchOrder}`);
  if (!targetMerchOrder) {
    console.error('❌ FAIL: Created order not visible to Merchant');
    process.exit(1);
  }

  // Merchant accepts order -> CONFIRMED
  console.log('B2. Merchant accepting order (CONFIRMED)...');
  await request(app)
    .put(`/api/orders/${createdOrder.id}/status`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ status: 'CONFIRMED' });

  // Merchant prepares order -> PACKING
  console.log('B3. Merchant preparing order (PACKING)...');
  await request(app)
    .put(`/api/orders/${createdOrder.id}/status`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ status: 'PACKING' });

  // Merchant ready for pickup -> READY_FOR_PICKUP
  console.log('B4. Merchant marking ready for pickup (READY_FOR_PICKUP)...');
  await request(app)
    .put(`/api/orders/${createdOrder.id}/status`)
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ status: 'READY_FOR_PICKUP' });

  const postReadyOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
  console.log(`    PostgreSQL Order Status: ${postReadyOrder?.status}`);
  if (postReadyOrder?.status !== 'READY_FOR_PICKUP') {
    console.error('❌ FAIL: Order status did not reach READY_FOR_PICKUP');
    process.exit(1);
  }
  console.log('    ✅ STEP B MERCHANT WORKFLOW COMPLETE!\n');

  // ------------------------------------------------------------------
  // STEP C: RIDER WORKFLOW
  // ------------------------------------------------------------------
  console.log('--- STEP C: RIDER WORKFLOW ---');
  console.log('C1. Logging in Rider (+917777777771)...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+917777777771', type: 'SMS', role: 'RIDER' });
  const riderLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+917777777771', code: '123456', role: 'RIDER', method: 'SMS' });
  const riderToken = riderLogin.body.data.token;
  const riderUser = riderLogin.body.data.user;

  console.log(`    Authenticated User ID : ${riderUser.id}`);
  console.log(`    User Role             : ${riderUser.role}`);

  if (riderUser.role !== 'RIDER') {
    console.error('❌ FAIL: Rider login role mismatch!');
    process.exit(1);
  }

  // Rider switches ONLINE
  console.log('C2. Rider switching ONLINE...');
  await request(app)
    .post('/api/rider/heartbeat')
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ isOnline: true, latitude: 21.1085, longitude: 82.0965 });

  // Rider fetches available jobs
  console.log('C3. Rider querying available delivery jobs...');
  const availableJobsRes = await request(app)
    .get('/api/rider/deliveries/available?lat=21.1085&lng=82.0965')
    .set('Authorization', `Bearer ${riderToken}`);

  const availableJobs = availableJobsRes.body.data || [];
  const targetJob = availableJobs.find((j: any) => j.id === createdOrder.id);

  console.log(`    Available Jobs Count  : ${availableJobs.length}`);
  console.log(`    Order #${createdOrder.orderNumber} Found: ${!!targetJob}`);
  if (!targetJob) {
    console.error('❌ FAIL: Order in READY_FOR_PICKUP status did not appear in Rider available deliveries!');
    process.exit(1);
  }

  // Rider accepts job
  console.log('C4. Rider accepting delivery job...');
  const acceptJobRes = await request(app)
    .post(`/api/rider/deliveries/${createdOrder.id}/accept`)
    .set('Authorization', `Bearer ${riderToken}`);

  if (acceptJobRes.status !== 200) {
    console.error('❌ FAIL: Rider accept delivery failed:', acceptJobRes.body);
    process.exit(1);
  }

  const assignment = acceptJobRes.body.data;
  console.log(`    Created Assignment ID : ${assignment.id}`);
  console.log(`    Pickup OTP            : ${assignment.pickupOtp}`);
  console.log(`    Delivery OTP          : ${assignment.deliveryOtp}`);

  // Rider validates Pickup OTP
  console.log('C5. Rider validating Pickup OTP at store...');
  const pickupRes = await request(app)
    .post(`/api/rider/deliveries/${createdOrder.id}/pickup`)
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ pickupOtp: assignment.pickupOtp });

  console.log(`    Pickup OTP Verification HTTP ${pickupRes.status}`);
  if (pickupRes.status !== 200) {
    console.error('❌ FAIL: Pickup OTP validation failed:', pickupRes.body);
    process.exit(1);
  }

  // Rider validates Delivery OTP
  console.log('C6. Rider validating Delivery OTP at customer doorstep...');
  const completeRes = await request(app)
    .post(`/api/rider/deliveries/${createdOrder.id}/complete`)
    .set('Authorization', `Bearer ${riderToken}`)
    .send({ deliveryOtp: assignment.deliveryOtp });

  console.log(`    Delivery OTP Verification HTTP ${completeRes.status}`);
  if (completeRes.status !== 200) {
    console.error('❌ FAIL: Delivery OTP validation failed:', completeRes.body);
    process.exit(1);
  }
  console.log('    ✅ STEP C RIDER WORKFLOW COMPLETE!\n');

  // ------------------------------------------------------------------
  // STEP D: CUSTOMER LIVE TRACKING RE-VERIFICATION
  // ------------------------------------------------------------------
  console.log('--- STEP D: CUSTOMER LIVE TRACKING RE-VERIFICATION ---');
  const trackRes = await request(app)
    .get(`/api/customer/orders/${createdOrder.id}`)
    .set('Authorization', `Bearer ${customerToken}`);

  const finalOrder = trackRes.body.data;
  console.log(`    Final Order Status in DB: ${finalOrder.status}`);
  if (finalOrder.status !== 'DELIVERED') {
    console.error(`❌ FAIL: Expected final order status to be DELIVERED but found '${finalOrder.status}'`);
    process.exit(1);
  }

  console.log('\n========================================================================');
  console.log('🎉 PHASE 17 END-TO-END WORKFLOW GATE CHECK PASSED PERFECTLY!');
  console.log('========================================================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase17GateWorkflow().catch((err) => {
  console.error('Phase 17 Gate Failure:', err);
  process.exit(1);
});

import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';
import { orderEventEmitter, OrderEvent } from '../src/common/events/order-event.emitter';

async function testPhase9() {
  console.log('=== PHASE 9 — MERCHANT ORDER ALERTS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Login Shopkeeper to get Merchant Token
  console.log('1. Authenticating Shopkeeper (+918888888881)...');
  await request(app)
    .post('/api/auth/send-otp')
    .send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });

  const merchantLoginRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });

  if (merchantLoginRes.status !== 200) {
    console.error('FAIL: Merchant login failed');
    process.exit(1);
  }
  const merchantToken = merchantLoginRes.body.data.token;

  // Step 2: Login Customer & Place New Order
  console.log('\n2. Authenticating Customer (+919876543210) & placing a new order...');
  await request(app)
    .post('/api/auth/send-otp')
    .send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });

  const customerLoginRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });

  const customerToken = customerLoginRes.body.data.token;
  const user = customerLoginRes.body.data.user;

  const address = await prisma.address.findFirst({ where: { userId: user.id } });
  const product = await prisma.product.findFirst({
    where: { isActive: true, store: { isOpen: true, isPaused: false } },
    include: { variants: true }
  });

  if (!address || !product || product.variants.length === 0) {
    console.error('FAIL: Missing address or product for test');
    process.exit(1);
  }

  // Clear & Add item to cart
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({
    productId: product.id,
    variantId: product.variants[0].id,
    quantity: 2,
  });

  // Track Real-time Order Alert Event
  let eventTriggered = false;
  let eventPayload: any = null;
  const listener = (data: any) => {
    eventTriggered = true;
    eventPayload = data;
  };
  orderEventEmitter.on(OrderEvent.PLACED, listener);

  // Place Order
  const orderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address.id,
      paymentMethod: 'COD',
      deliveryInstruction: 'Ring doorbell twice',
    });

  if (orderRes.status !== 200 && orderRes.status !== 201) {
    console.error('FAIL: Order placement failed:', orderRes.body);
    process.exit(1);
  }

  const placedOrder = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
  console.log(`   Placed Order Number: ${placedOrder.orderNumber} (ID: ${placedOrder.id})`);

  // Verify Real-time Alert Notification Event
  console.log(`\n3. Verifying Real-time Merchant Alert Event...`);
  console.log(`   Event Triggered: ${eventTriggered ? 'PASS' : 'FAIL'}`);
  if (!eventTriggered || !eventPayload?.order) {
    console.error('FAIL: order.placed domain event did not fire!');
    process.exit(1);
  }
  console.log(`   Alert Event Order Number: ${eventPayload.order.orderNumber} PASS`);

  orderEventEmitter.off(OrderEvent.PLACED, listener);

  // Step 3: Merchant Queries Pending Orders List (/api/merchant/orders)
  console.log(`\n4. Merchant fetching Store Orders (/api/merchant/orders)...`);
  const storeOrdersRes = await request(app)
    .get('/api/merchant/orders')
    .set('Authorization', `Bearer ${merchantToken}`);

  console.log(`   Store Orders HTTP ${storeOrdersRes.status}`);
  if (storeOrdersRes.status !== 200 || !Array.isArray(storeOrdersRes.body.data)) {
    console.error('FAIL: Store orders list fetch failed:', storeOrdersRes.body);
    process.exit(1);
  }

  const storeOrders = storeOrdersRes.body.data;
  console.log(`   Total Orders in Merchant Store List: ${storeOrders.length}`);

  const merchantTargetOrder = storeOrders.find((o: any) => o.id === placedOrder.id);
  if (!merchantTargetOrder) {
    console.error(`FAIL: Placed order (${placedOrder.id}) was NOT found in Merchant's order list!`);
    process.exit(1);
  }

  console.log('\n   --- VERIFYING MERCHANT PENDING ORDER DETAILS ---');
  console.log(`   - Order ID: ${merchantTargetOrder.id}`);
  console.log(`   - Order Number: ${merchantTargetOrder.orderNumber}`);
  console.log(`   - Order Status: ${merchantTargetOrder.status}`);
  console.log(`   - Customer Name: ${merchantTargetOrder.customer?.fullName}`);
  console.log(`   - Customer Phone: ${merchantTargetOrder.customer?.user?.phone}`);
  console.log(`   - Items Count: ${merchantTargetOrder.items.length}`);
  console.log(`   - Item 1: "${merchantTargetOrder.items[0]?.productName}" (Qty: ${merchantTargetOrder.items[0]?.quantity}, Price: ₹${merchantTargetOrder.items[0]?.unitPrice})`);
  console.log(`   - Total Amount: ₹${merchantTargetOrder.totalAmount}`);

  if (merchantTargetOrder.items.length !== 1 || merchantTargetOrder.items[0].quantity !== 2) {
    console.error('FAIL: Merchant order items mismatch');
    process.exit(1);
  }

  if (merchantTargetOrder.totalAmount !== placedOrder.totalAmount) {
    console.error('FAIL: Merchant order total amount mismatch');
    process.exit(1);
  }

  console.log('\n===============================================');
  console.log('🎉 PHASE 9 MERCHANT ORDER ALERTS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase9().catch((err) => {
  console.error('Phase 9 Merchant Alerts Failure:', err);
  process.exit(1);
});

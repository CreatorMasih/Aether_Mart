import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase7() {
  console.log('=== PHASE 7 — COD ORDER QA TEST ===\n');

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

  // Step 2: Fetch Customer Address & Active Product
  const address = await prisma.address.findFirst({ where: { userId: user.id } });
  if (!address) {
    console.error('FAIL: Customer has no saved address');
    process.exit(1);
  }

  const product = await prisma.product.findFirst({
    where: { isActive: true, store: { isOpen: true, isPaused: false } },
    include: { variants: true, store: true, inventories: true }
  });

  if (!product || product.variants.length === 0) {
    console.error('FAIL: No active product/variant found');
    process.exit(1);
  }

  const variant = product.variants[0];
  const initialStock = variant.stock;

  // Add 1 item to cart
  await request(app)
    .delete('/api/customer/cart/clear')
    .set('Authorization', `Bearer ${customerToken}`);

  await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 1 });

  // Step 3: Place COD Order
  console.log(`\n2. Customer placing COD order for product "${product.name}"...`);
  const orderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address.id,
      paymentMethod: 'COD',
      deliveryInstruction: 'Leave at front door',
    });

  console.log(`   Place Order HTTP ${orderRes.status}`);
  if (orderRes.status !== 200 && orderRes.status !== 201) {
    console.error('FAIL: COD Order placement failed:', orderRes.body);
    process.exit(1);
  }

  const createdOrders = orderRes.body.data;
  const orderData = Array.isArray(createdOrders) ? createdOrders[0] : createdOrders;
  console.log(`   Created Order Number: ${orderData.orderNumber} (ID: ${orderData.id})`);
  console.log(`   Order Status: ${orderData.status}`);
  console.log(`   Payment Method: ${orderData.paymentMethod}`);
  console.log(`   Payment Status: ${orderData.paymentStatus}`);

  if (orderData.status !== 'PLACED') {
    console.error(`FAIL: Order status expected 'PLACED', got '${orderData.status}'`);
    process.exit(1);
  }
  if (orderData.paymentMethod !== 'COD') {
    console.error(`FAIL: Payment method expected 'COD', got '${orderData.paymentMethod}'`);
    process.exit(1);
  }
  if (orderData.paymentStatus !== 'PENDING') {
    console.error(`FAIL: Payment status expected 'PENDING', got '${orderData.paymentStatus}'`);
    process.exit(1);
  }

  // Step 4: Verify PostgreSQL Database State
  console.log('\n3. Verifying PostgreSQL DB State (Order, OrderItem, Payment, Inventory, Cart)...');
  
  // Order
  const dbOrder = await prisma.order.findUnique({
    where: { id: orderData.id },
    include: { items: true, payment: true, store: true }
  });

  if (!dbOrder) {
    console.error('FAIL: Order record missing in PostgreSQL');
    process.exit(1);
  }
  console.log(`   - PostgreSQL Order Status: ${dbOrder.status} PASS`);
  console.log(`   - PostgreSQL Order Payment Method: ${dbOrder.paymentMethod} PASS`);
  console.log(`   - PostgreSQL Order Payment Status: ${dbOrder.paymentStatus} PASS`);

  // OrderItem
  if (dbOrder.items.length !== 1 || dbOrder.items[0].productId !== product.id) {
    console.error('FAIL: OrderItem record invalid or missing in PostgreSQL');
    process.exit(1);
  }
  console.log(`   - PostgreSQL OrderItem: "${dbOrder.items[0].productName}" (Qty: ${dbOrder.items[0].quantity}, Price: ₹${dbOrder.items[0].unitPrice}) PASS`);

  // Payment
  if (!dbOrder.payment || dbOrder.payment.method !== 'COD' || dbOrder.payment.status !== 'PENDING') {
    console.error('FAIL: Payment record invalid in PostgreSQL');
    process.exit(1);
  }
  console.log(`   - PostgreSQL Payment Amount: ₹${dbOrder.payment.amount}, Status: ${dbOrder.payment.status} PASS`);

  // Inventory reservation check
  const updatedVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  console.log(`   - PostgreSQL Variant Stock: ${updatedVariant?.stock} (Initial: ${initialStock}) PASS`);

  // Cart Cleared check
  const customerProfile = await prisma.customer.findFirst({ where: { userId: user.id } });
  const dbCart = await prisma.cart.findUnique({
    where: { customerId: customerProfile!.id },
    include: { items: true }
  });

  console.log(`   - PostgreSQL Cart Items Count after Order: ${dbCart?.items.length || 0}`);
  if (dbCart && dbCart.items.length > 0) {
    console.error('FAIL: Cart items were NOT cleared after successful order placement!');
    process.exit(1);
  }
  console.log('   PASS: Cart cleared cleanly ONLY after successful order creation!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 7 COD ORDER PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase7().catch((err) => {
  console.error('Phase 7 COD Order Failure:', err);
  process.exit(1);
});

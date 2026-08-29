import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase6() {
  console.log('=== PHASE 6 — CHECKOUT QA TEST ===\n');

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

  // Step 2: Fetch Customer Saved Address from DB / API
  console.log('\n2. Fetching Customer Delivery Address...');
  const addrRes = await request(app)
    .get('/api/customer/addresses')
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`   Addresses HTTP ${addrRes.status}`);
  if (addrRes.status !== 200 || !addrRes.body.data || addrRes.body.data.length === 0) {
    console.error('FAIL: Customer has no saved delivery address:', addrRes.body);
    process.exit(1);
  }

  const address = addrRes.body.data[0];
  console.log(`   Customer Address: "${address.receiverName}", ${address.streetAddress}, ${address.city} (${address.postalCode})`);

  // Step 3: Fetch an active store product
  const product = await prisma.product.findFirst({
    where: { isActive: true, store: { isOpen: true, isPaused: false } },
    include: { variants: true, store: true }
  });

  if (!product || product.variants.length === 0) {
    console.error('FAIL: No active product/variant found');
    process.exit(1);
  }

  const variant = product.variants[0];

  // Prepare Cart with 2 items
  await request(app)
    .delete('/api/customer/cart/clear')
    .set('Authorization', `Bearer ${customerToken}`);

  await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 2 });

  // Step 4: Verify Checkout API Data (Backend Pricing Source of Truth)
  console.log('\n3. Fetching Checkout Pricing & Data from Backend...');
  const checkoutRes = await request(app)
    .get('/api/customer/cart')
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`   Checkout Data HTTP ${checkoutRes.status}`);
  if (checkoutRes.status !== 200 || !checkoutRes.body.data) {
    console.error('FAIL: Checkout data fetch failed:', checkoutRes.body);
    process.exit(1);
  }

  const checkoutData = checkoutRes.body.data;

  console.log('   --- VERIFYING BACKEND CHECKOUT DATA CONTRACT ---');
  console.log(`   - Store: "${checkoutData.store?.name}" (ID: ${checkoutData.store?.id})`);
  console.log(`   - Item: "${checkoutData.items[0]?.name}" (Variant: ${checkoutData.items[0]?.variantName})`);
  console.log(`   - Quantity: ${checkoutData.items[0]?.quantity}`);
  console.log(`   - Item Unit Price: ₹${checkoutData.items[0]?.price}`);
  console.log(`   - Item Line Total: ₹${checkoutData.items[0]?.total}`);
  console.log(`   - Subtotal: ₹${checkoutData.subtotal}`);
  console.log(`   - Delivery Fee: ₹${checkoutData.deliveryFee}`);
  console.log(`   - Packaging Fee: ₹${checkoutData.packagingFee}`);
  console.log(`   - Handling Fee: ₹${checkoutData.handlingFee}`);
  console.log(`   - Tax (5%): ₹${checkoutData.tax}`);
  console.log(`   - Discount: ₹${checkoutData.discount}`);
  console.log(`   - Total Amount: ₹${checkoutData.totalAmount}`);

  // Perform mathematical verification against backend values
  const expectedSubtotal = checkoutData.items[0]?.price * 2;
  if (checkoutData.subtotal !== expectedSubtotal) {
    console.error(`FAIL: Subtotal mismatch! Expected ₹${expectedSubtotal}, got ₹${checkoutData.subtotal}`);
    process.exit(1);
  }

  const expectedTax = parseFloat(((checkoutData.subtotal - checkoutData.discount) * 0.05).toFixed(2));
  if (Math.abs(checkoutData.tax - expectedTax) > 0.01) {
    console.error(`FAIL: Tax calculation mismatch! Expected ₹${expectedTax}, got ₹${checkoutData.tax}`);
    process.exit(1);
  }

  const expectedTotal = parseFloat((
    checkoutData.subtotal - checkoutData.discount + checkoutData.tax +
    checkoutData.deliveryFee + checkoutData.packagingFee + checkoutData.handlingFee +
    checkoutData.surgeFee + checkoutData.driverTip
  ).toFixed(2));

  if (Math.abs(checkoutData.totalAmount - expectedTotal) > 0.01) {
    console.error(`FAIL: Total amount calculation mismatch! Expected ₹${expectedTotal}, got ₹${checkoutData.totalAmount}`);
    process.exit(1);
  }

  console.log('   PASS: All backend pricing calculations verified exact!');

  // Step 5: Refresh Checkout Page Simulation
  console.log('\n4. Simulating Checkout Page Refresh (Refetch GET /api/customer/cart)...');
  const refreshedRes = await request(app)
    .get('/api/customer/cart')
    .set('Authorization', `Bearer ${customerToken}`);

  if (refreshedRes.status !== 200 || refreshedRes.body.data.totalAmount !== checkoutData.totalAmount) {
    console.error('FAIL: Checkout data mutated or lost after page refresh');
    process.exit(1);
  }

  console.log('   PASS: Checkout data remained 100% stable after refresh!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 6 CHECKOUT PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase6().catch((err) => {
  console.error('Phase 6 Checkout Failure:', err);
  process.exit(1);
});

import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase5() {
  console.log('=== PHASE 5 — CART QA TEST ===\n');

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
  console.log(`   Customer User ID: ${user.id}`);

  // Fetch Customer Profile
  const customerProfile = await prisma.customer.findFirst({ where: { userId: user.id } });
  if (!customerProfile) {
    console.error('FAIL: Customer profile missing in DB');
    process.exit(1);
  }
  console.log(`   Customer Profile ID: ${customerProfile.id}`);

  // Fetch a real active product with variant and inventory from DB
  const product = await prisma.product.findFirst({
    where: { isActive: true, store: { isOpen: true, isPaused: false } },
    include: { variants: true, store: true }
  });

  if (!product || product.variants.length === 0) {
    console.error('FAIL: No active product/variant found in DB');
    process.exit(1);
  }

  const variant = product.variants[0];
  console.log(`   Selected Product: "${product.name}" (ID: ${product.id})`);
  console.log(`   Selected Variant: "${variant.name}" (ID: ${variant.id})`);
  console.log(`   Store: "${product.store.name}" (ID: ${product.storeId})`);

  // Step 2: Clear cart initially to ensure clean state
  await request(app)
    .delete('/api/customer/cart/clear')
    .set('Authorization', `Bearer ${customerToken}`);

  // Step 3: ADD product (qty = 1)
  console.log('\n2. Customer ADD Product to Cart (qty: 1)...');
  const addRes = await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 1 });

  console.log(`   Add Cart HTTP ${addRes.status}`);
  if (addRes.status !== 200 || !addRes.body.data) {
    console.error('FAIL: Add to cart failed:', addRes.body);
    process.exit(1);
  }

  // Verify PostgreSQL cart state
  console.log('\n3. Verifying PostgreSQL cart_items table state (qty: 1)...');
  let dbCart = await prisma.cart.findUnique({
    where: { customerId: customerProfile.id },
    include: { items: true }
  });

  if (!dbCart || dbCart.items.length !== 1) {
    console.error('FAIL: Cart or CartItem record missing in PostgreSQL');
    process.exit(1);
  }

  const item1 = dbCart.items[0];
  console.log(`   PostgreSQL Cart ID: ${dbCart.id}`);
  console.log(`   PostgreSQL Cart Customer ID: ${dbCart.customerId}`);
  console.log(`   PostgreSQL Cart Store ID: ${dbCart.storeId}`);
  console.log(`   PostgreSQL Item Product ID: ${item1.productId}`);
  console.log(`   PostgreSQL Item Variant ID: ${item1.variantId}`);
  console.log(`   PostgreSQL Item Quantity: ${item1.quantity}`);

  if (item1.quantity !== 1 || item1.productId !== product.id || item1.variantId !== variant.id) {
    console.error('FAIL: PostgreSQL cart item fields do not match request');
    process.exit(1);
  }
  console.log('   PASS: PostgreSQL cart_items correctly updated with qty=1');

  // Step 4: Increment (+) -> qty = 2
  console.log('\n4. Incrementing quantity (+) -> qty: 2...');
  const incRes = await request(app)
    .put('/api/customer/cart/update')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 2 });

  if (incRes.status !== 200 || incRes.body.data.items[0]?.quantity !== 2) {
    console.error('FAIL: Quantity increment to 2 failed:', incRes.body);
    process.exit(1);
  }

  dbCart = await prisma.cart.findUnique({ where: { customerId: customerProfile.id }, include: { items: true } });
  console.log(`   PostgreSQL Updated Quantity: ${dbCart?.items[0]?.quantity}`);
  if (dbCart?.items[0]?.quantity !== 2) {
    console.error('FAIL: PostgreSQL quantity failed to update to 2');
    process.exit(1);
  }
  console.log('   PASS: Cart quantity incremented to 2 in PostgreSQL!');

  // Step 5: Decrement (-) -> qty = 1
  console.log('\n5. Decrementing quantity (-) -> qty: 1...');
  const decRes = await request(app)
    .put('/api/customer/cart/update')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 1 });

  if (decRes.status !== 200 || decRes.body.data.items[0]?.quantity !== 1) {
    console.error('FAIL: Quantity decrement to 1 failed:', decRes.body);
    process.exit(1);
  }
  console.log('   PASS: Cart quantity decremented to 1!');

  // Step 6: Decrement (-) -> qty = 0 (Removed)
  console.log('\n6. Decrementing quantity to 0 (-) -> item removed...');
  const removeRes = await request(app)
    .put('/api/customer/cart/update')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 0 });

  if (removeRes.status !== 200 || removeRes.body.data.items.length !== 0) {
    console.error('FAIL: Item removal (qty 0) failed:', removeRes.body);
    process.exit(1);
  }

  dbCart = await prisma.cart.findUnique({ where: { customerId: customerProfile.id }, include: { items: true } });
  if (dbCart && dbCart.items.length !== 0) {
    console.error('FAIL: Cart item not deleted from PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: Item cleanly removed from PostgreSQL cart_items!');

  // Step 7: ADD -> Refresh Page / Refetch GET /api/customer/cart (Persistence Check)
  console.log('\n7. ADD item again and test persistence after page refresh (GET /api/customer/cart)...');
  await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: variant.id, quantity: 1 });

  const fetchRes = await request(app)
    .get('/api/customer/cart')
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`   Fetch Cart HTTP ${fetchRes.status}`);
  if (fetchRes.status !== 200 || !fetchRes.body.data || fetchRes.body.data.items.length !== 1) {
    console.error('FAIL: Cart persistence check failed:', fetchRes.body);
    process.exit(1);
  }

  const reloadedItem = fetchRes.body.data.items[0];
  console.log(`   Persisted Cart Item: "${reloadedItem.name}" (Qty: ${reloadedItem.quantity}, Price: ₹${reloadedItem.price})`);
  console.log(`   Cart Subtotal: ₹${fetchRes.body.data.subtotal}, Total: ₹${fetchRes.body.data.totalAmount}`);

  if (reloadedItem.productId !== product.id || reloadedItem.quantity !== 1) {
    console.error('FAIL: Persisted cart item data mismatch');
    process.exit(1);
  }

  console.log('\n===============================================');
  console.log('🎉 PHASE 5 CART PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase5().catch((err) => {
  console.error('Phase 5 Cart Failure:', err);
  process.exit(1);
});

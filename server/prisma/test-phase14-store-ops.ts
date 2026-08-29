import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase14() {
  console.log('=== PHASE 14 — STORE OPERATIONS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Merchant (+918888888881) & Customer (+919876543210)
  console.log('1. Authenticating Merchant and Customer...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantToken = merchantLogin.body.data.token;

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;

  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const product = await prisma.product.findFirst({ where: { isActive: true, storeId: 'store-1' }, include: { variants: true } });

  if (!address || !product) {
    console.error('FAIL: Missing address or product for test');
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // TEST SCENARIO 1: STORE ON HOLIDAY MODE
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 1: Merchant toggles Store HOLIDAY MODE ---');
  const holidayUpdateRes = await request(app)
    .put('/api/merchant/profile')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ isHoliday: true });

  console.log(`   Merchant Profile Update HTTP ${holidayUpdateRes.status}: isHoliday=${holidayUpdateRes.body.data?.store?.isHoliday}`);

  // Customer tries adding to cart when store is on holiday
  console.log('   1a. Customer attempting to add product to cart...');
  const addCartHolidayRes = await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: product.variants[0].id, quantity: 1 });

  console.log(`       Add to Cart HTTP ${addCartHolidayRes.status}: ${addCartHolidayRes.body.error?.message}`);
  if (addCartHolidayRes.status !== 400 || !addCartHolidayRes.body.error?.message.includes('holiday')) {
    console.error('FAIL: Add to cart was not blocked during holiday mode');
    process.exit(1);
  }
  console.log('       PASS: Add to cart blocked with clear Holiday error message!');

  // ------------------------------------------------------------------
  // TEST SCENARIO 2: STORE CLOSED / PAUSED
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Merchant toggles Store PAUSED / CLOSED ---');
  
  // Temporarily reset holiday/paused to populate cart
  await request(app).put('/api/merchant/profile').set('Authorization', `Bearer ${merchantToken}`).send({ isHoliday: false, isPaused: false, isOpen: true });
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product.id, variantId: product.variants[0].id, quantity: 1 });

  // Now set store PAUSED
  await request(app)
    .put('/api/merchant/profile')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ isPaused: true });

  // Customer attempts order placement while store is paused
  console.log('   2a. Customer attempting order placement while store is paused...');
  const placeOrderPausedRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address.id, paymentMethod: 'COD' });

  console.log(`       Place Order HTTP ${placeOrderPausedRes.status}: ${placeOrderPausedRes.body.error?.message}`);
  if (placeOrderPausedRes.status !== 400 || !placeOrderPausedRes.body.error?.message.includes('closed or not accepting orders')) {
    console.error('FAIL: Order placement was not blocked while store is paused');
    process.exit(1);
  }
  console.log('       PASS: Order placement blocked with clear Store Closed error message!');

  // ------------------------------------------------------------------
  // TEST SCENARIO 3: STORE RE-OPENS FOR NORMAL ORDERING
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Merchant RE-OPENS Store ---');
  const openUpdateRes = await request(app)
    .put('/api/merchant/profile')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({ isHoliday: false, isOpen: true, isPaused: false });

  console.log(`   Merchant Profile Update HTTP ${openUpdateRes.status}: isOpen=${openUpdateRes.body.data?.store?.isOpen}`);

  // Customer adds to cart
  console.log('   3a. Customer adding product to cart...');
  const addCartOpenRes = await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: product.id, variantId: product.variants[0].id, quantity: 1 });

  console.log(`       Add to Cart HTTP ${addCartOpenRes.status}`);
  if (addCartOpenRes.status !== 200) {
    console.error('FAIL: Add to cart failed after store re-opened:', addCartOpenRes.body);
    process.exit(1);
  }

  // Customer places order
  console.log('   3b. Customer placing order after store re-opened...');
  const placeOrderOpenRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ addressId: address.id, paymentMethod: 'COD' });

  console.log(`       Place Order HTTP ${placeOrderOpenRes.status}`);
  if (placeOrderOpenRes.status !== 200 && placeOrderOpenRes.status !== 201) {
    console.error('FAIL: Order placement failed after store re-opened:', placeOrderOpenRes.body);
    process.exit(1);
  }
  console.log('       PASS: Normal ordering resumed smoothly after store re-opened!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 14 STORE OPERATIONS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase14().catch((err) => {
  console.error('Phase 14 Store Operations Failure:', err);
  process.exit(1);
});

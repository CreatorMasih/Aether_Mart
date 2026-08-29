import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';
import { cartService } from '../src/modules/cart/cart.service';

async function testPhase18() {
  console.log('=== PHASE 18 — PROMO CODES / DISCOUNTS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Customer (+919876543210)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const customerUser = custLogin.body.data.user;
  const customerProfile = await prisma.customer.findFirst({ where: { userId: customerUser.id } });
  const address = await prisma.address.findFirst({ where: { userId: customerUser.id } });

  // Seed Test Coupons
  const now = new Date();
  const futureExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const pastExpiry = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.coupon.deleteMany({ where: { code: { in: ['FLAT50QA', 'EXPIREDQA', 'MIN500QA', 'USEDQA'] } } });

  const validCoupon = await prisma.coupon.create({
    data: {
      code: 'FLAT50QA',
      type: 'FLAT',
      value: 50.0,
      minOrderValue: 100.0,
      expiry: futureExpiry,
      isActive: true,
    }
  });

  await prisma.coupon.create({
    data: {
      code: 'EXPIREDQA',
      type: 'FLAT',
      value: 20.0,
      minOrderValue: 50.0,
      expiry: pastExpiry,
      isActive: true,
    }
  });

  await prisma.coupon.create({
    data: {
      code: 'MIN500QA',
      type: 'FLAT',
      value: 100.0,
      minOrderValue: 500.0,
      expiry: futureExpiry,
      isActive: true,
    }
  });

  console.log('Test Coupons created: FLAT50QA, EXPIREDQA, MIN500QA');

  // ------------------------------------------------------------------
  // TEST 1: INVALID COUPON CODE
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Invalid Coupon Code ---');
  try {
    await cartService.validateCoupon('NONEXISTENT99', customerProfile!.id, 200);
    console.error('FAIL: Invalid coupon did not throw error');
    process.exit(1);
  } catch (err: any) {
    console.log(`   Validation Error Message: "${err.message}"`);
    if (!err.message.includes('Invalid coupon')) {
      console.error('FAIL: Expected Invalid coupon error message');
      process.exit(1);
    }
    console.log('   PASS: Invalid coupon code rejected with clear error!');
  }

  // ------------------------------------------------------------------
  // TEST 2: EXPIRED COUPON
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Expired Coupon ---');
  try {
    await cartService.validateCoupon('EXPIREDQA', customerProfile!.id, 200);
    console.error('FAIL: Expired coupon did not throw error');
    process.exit(1);
  } catch (err: any) {
    console.log(`   Validation Error Message: "${err.message}"`);
    if (!err.message.includes('expired')) {
      console.error('FAIL: Expected Expired coupon error message');
      process.exit(1);
    }
    console.log('   PASS: Expired coupon rejected with clear error!');
  }

  // ------------------------------------------------------------------
  // TEST 3: MIN ORDER VALUE NOT MET
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Min Order Value Not Met ---');
  try {
    await cartService.validateCoupon('MIN500QA', customerProfile!.id, 200); // Subtotal 200 < Min 500
    console.error('FAIL: Min order value failure did not throw error');
    process.exit(1);
  } catch (err: any) {
    console.log(`   Validation Error Message: "${err.message}"`);
    if (!err.message.includes('Minimum order value')) {
      console.error('FAIL: Expected Min order value error message');
      process.exit(1);
    }
    console.log('   PASS: Min order value constraint blocked coupon!');
  }

  // ------------------------------------------------------------------
  // TEST 4: VALID COUPON DISCOUNT & ORDER MATH VERIFICATION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Valid Coupon & Order Math Verification ---');
  const store = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  const cat = await prisma.category.findFirst();

  const product = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Promo Coupon Test Product',
      description: 'Fresh Coupon Product',
      unit: 'pc',
      price: 150,
      sku: `PROMO-PROD-${Date.now()}`,
      isActive: true,
    }
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: 'Standard Variant',
      price: 150,
      sku: `VAR-PROMO-${Date.now()}`,
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

  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product.id, variantId: variant.id, quantity: 2 });

  const orderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address!.id,
      paymentMethod: 'COD',
      couponCode: 'FLAT50QA',
      driverTip: 10,
    });

  console.log(`   Place Order with FLAT50QA HTTP ${orderRes.status}`);
  if (orderRes.status !== 200 && orderRes.status !== 201) {
    console.error('FAIL: Order placement with coupon failed:', orderRes.body);
    process.exit(1);
  }

  const order = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
  console.log(`   Order Created: ${order.orderNumber}`);
  console.log(`   - Subtotal: ₹${order.subtotal}`);
  console.log(`   - Discount: ₹${order.discount}`);
  console.log(`   - Tax: ₹${order.tax}`);
  console.log(`   - Delivery Fee: ₹${order.deliveryFee}`);
  console.log(`   - Handling Fee: ₹${order.handlingFee}`);
  console.log(`   - Driver Tip: ₹${order.driverTip}`);
  console.log(`   - Total Amount: ₹${order.totalAmount}`);

  if (order.discount !== 50.0) {
    console.error(`FAIL: Coupon discount expected ₹50, got ₹${order.discount}`);
    process.exit(1);
  }

  const packagingFee = (order as any).packagingFee || 10.0;
  const expectedTotal = parseFloat(
    (order.subtotal - order.discount + order.tax + packagingFee + order.deliveryFee + order.handlingFee + order.driverTip).toFixed(2)
  );

  console.log(`   Calculated Expected Total Math: ₹${expectedTotal}`);
  if (order.totalAmount !== expectedTotal) {
    console.error(`FAIL: Order total math mismatch! DB Total: ₹${order.totalAmount}, Formula Total: ₹${expectedTotal}`);
    process.exit(1);
  }
  console.log('   PASS: Order math formula perfectly matches Subtotal - Discount + Tax + Fees + Tip!');

  // ------------------------------------------------------------------
  // TEST 5: SINGLE-USE COUPON RE-USE BLOCKED
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Single-use Coupon Re-use Blocked ---');
  try {
    await cartService.validateCoupon('FLAT50QA', customerProfile!.id, 200);
    console.error('FAIL: Coupon re-use was not blocked');
    process.exit(1);
  } catch (err: any) {
    console.log(`   Validation Error Message: "${err.message}"`);
    if (!err.message.includes('already used')) {
      console.error('FAIL: Expected Already used coupon error message');
      process.exit(1);
    }
    console.log('   PASS: Re-using single-use promo code blocked cleanly!');
  }

  console.log('\n===============================================');
  console.log('🎉 PHASE 18 PROMO CODES / DISCOUNTS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase18().catch((err) => {
  console.error('Phase 18 Promo Discounts Failure:', err);
  process.exit(1);
});

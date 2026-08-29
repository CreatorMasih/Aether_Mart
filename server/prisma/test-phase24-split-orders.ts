import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase24() {
  console.log('=== PHASE 24 — MULTI-STORE / SPLIT ORDERS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Create Merchant A & Merchant B with Store A & Store B
  console.log('1. Setting up Store A and Store B with Merchant A and Merchant B...');
  
  // Authenticate Merchant A (+918888888881)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantALogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantAToken = merchantALogin.body.data.token;
  const merchantAUser = merchantALogin.body.data.user;
  const merchantAProfile = await prisma.merchant.findFirst({ where: { userId: merchantAUser.id } });
  const storeA = await prisma.store.findFirst({ where: { merchantId: merchantAProfile!.id } });
  await prisma.store.update({ where: { id: storeA!.id }, data: { isOpen: true, isPaused: false, isHoliday: false } });

  // Create Merchant B (+918888888882)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+918888888882', type: 'SMS', role: 'SHOPKEEPER' });
  const merchantBLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+918888888882', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });
  const merchantBToken = merchantBLogin.body.data.token;
  const merchantBUser = merchantBLogin.body.data.user;

  let merchantBProfile = await prisma.merchant.findFirst({ where: { userId: merchantBUser.id } });
  if (!merchantBProfile) {
    merchantBProfile = await prisma.merchant.create({
      data: {
        userId: merchantBUser.id,
        fullName: 'Merchant B Owner',
        isApproved: true,
      }
    });
  } else {
    await prisma.merchant.update({ where: { id: merchantBProfile.id }, data: { isApproved: true } });
  }

  let storeB = await prisma.store.findFirst({ where: { merchantId: merchantBProfile.id } });
  if (!storeB) {
    storeB = await prisma.store.create({
      data: {
        merchantId: merchantBProfile.id,
        name: 'Store B Organic Goods',
        address: 'B Market Road, Mahasamund',
        latitude: 21.1120,
        longitude: 82.0990,
        isOpen: true,
        isPaused: false,
        isHoliday: false,
      }
    });
  } else {
    await prisma.store.update({ where: { id: storeB.id }, data: { isOpen: true, isPaused: false, isHoliday: false } });
  }

  console.log(`   Store A: "${storeA!.name}" (ID: ${storeA!.id})`);
  console.log(`   Store B: "${storeB.name}" (ID: ${storeB.id})`);

  // Authenticate Customer (+919876543210)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });
  const cat = await prisma.category.findFirst();

  // Create Product A in Store A
  const productA = await prisma.product.create({
    data: {
      storeId: storeA!.id,
      categoryId: cat!.id,
      name: 'Store A Item',
      description: 'Store A Item Description',
      unit: 'pc',
      price: 100,
      sku: `STORE-A-${Date.now()}`,
      isActive: true,
    }
  });

  const variantA = await prisma.productVariant.create({
    data: {
      productId: productA.id,
      name: 'Standard Variant',
      price: 100,
      sku: `VAR-A-${Date.now()}`,
      stock: 50,
    }
  });

  await prisma.inventory.create({
    data: { storeId: storeA!.id, productId: productA.id, variantId: variantA.id, stockQty: 50 }
  });

  // Create Product B in Store B
  const productB = await prisma.product.create({
    data: {
      storeId: storeB.id,
      categoryId: cat!.id,
      name: 'Store B Item',
      description: 'Store B Item Description',
      unit: 'pc',
      price: 200,
      sku: `STORE-B-${Date.now()}`,
      isActive: true,
    }
  });

  const variantB = await prisma.productVariant.create({
    data: {
      productId: productB.id,
      name: 'Standard Variant',
      price: 200,
      sku: `VAR-B-${Date.now()}`,
      stock: 50,
    }
  });

  await prisma.inventory.create({
    data: { storeId: storeB.id, productId: productB.id, variantId: variantB.id, stockQty: 50 }
  });

  // ------------------------------------------------------------------
  // TEST 1: MULTI-STORE CART CHECKOUT (SPLIT ORDER CREATION)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Multi-Store Checkout (Split Orders Creation) ---');
  const placeRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address!.id,
      paymentMethod: 'COD',
      items: [
        { productId: productA.id, variantId: variantA.id, quantity: 1 }, // Store A item
        { productId: productB.id, variantId: variantB.id, quantity: 2 }, // Store B item
      ]
    });

  console.log(`   Place Multi-Store Order HTTP ${placeRes.status}`);
  if (placeRes.status !== 200 && placeRes.status !== 201) {
    console.error('FAIL: Multi-store checkout failed:', placeRes.body);
    process.exit(1);
  }

  const createdOrders = placeRes.body.data;
  console.log(`   Created Orders Count: ${createdOrders.length}`);
  if (!Array.isArray(createdOrders) || createdOrders.length !== 2) {
    console.error('FAIL: Expected exactly 2 split orders for 2 distinct stores');
    process.exit(1);
  }

  const orderA = createdOrders.find((o: any) => o.storeId === storeA!.id);
  const orderB = createdOrders.find((o: any) => o.storeId === storeB.id);

  console.log(`   Order A Number: ${orderA?.orderNumber} (Store A: ${storeA!.id})`);
  console.log(`   Order B Number: ${orderB?.orderNumber} (Store B: ${storeB.id})`);

  if (!orderA || !orderB) {
    console.error('FAIL: Split orders missing store mapping');
    process.exit(1);
  }

  if (orderA.orderNumber === orderB.orderNumber) {
    console.error('FAIL: Split orders must have unique order numbers');
    process.exit(1);
  }
  console.log('   PASS: Multi-store cart split into 2 isolated order records with unique order numbers!');

  // ------------------------------------------------------------------
  // TEST 2: MERCHANT STORE ISOLATION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Merchant Store Isolation ---');
  const merchantAOrdersRes = await request(app).get('/api/merchant/orders').set('Authorization', `Bearer ${merchantAToken}`);
  const merchantBOrdersRes = await request(app).get('/api/merchant/orders').set('Authorization', `Bearer ${merchantBToken}`);

  const merchantAOrderIds = (merchantAOrdersRes.body.data?.orders || merchantAOrdersRes.body.data || []).map((o: any) => o.id);
  const merchantBOrderIds = (merchantBOrdersRes.body.data?.orders || merchantBOrdersRes.body.data || []).map((o: any) => o.id);

  console.log(`   Merchant A Orders: ${merchantAOrderIds.length} orders visible (Includes Order A: ${merchantAOrderIds.includes(orderA.id)}, Order B: ${merchantAOrderIds.includes(orderB.id)})`);
  console.log(`   Merchant B Orders: ${merchantBOrderIds.length} orders visible (Includes Order B: ${merchantBOrderIds.includes(orderB.id)}, Order A: ${merchantBOrderIds.includes(orderA.id)})`);

  if (!merchantAOrderIds.includes(orderA.id) || merchantAOrderIds.includes(orderB.id)) {
    console.error('FAIL: Merchant A visible orders violated store boundary isolation');
    process.exit(1);
  }

  if (!merchantBOrderIds.includes(orderB.id) || merchantBOrderIds.includes(orderA.id)) {
    console.error('FAIL: Merchant B visible orders violated store boundary isolation');
    process.exit(1);
  }
  console.log('   PASS: Merchant A sees Order A ONLY; Merchant B sees Order B ONLY!');

  // ------------------------------------------------------------------
  // TEST 3: INDEPENDENT FULFILLMENT FLOWS
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Independent Fulfillment Flows ---');
  // Merchant A confirms & advances Order A
  console.log('   3a. Merchant A confirming Order A...');
  await request(app).put(`/api/orders/${orderA.id}/status`).set('Authorization', `Bearer ${merchantAToken}`).send({ status: 'CONFIRMED' });
  await request(app).put(`/api/orders/${orderA.id}/status`).set('Authorization', `Bearer ${merchantAToken}`).send({ status: 'PACKING' });

  // Merchant B cancels Order B
  console.log('   3b. Merchant B rejecting/cancelling Order B...');
  await request(app).post(`/api/customer/orders/${orderB.id}/merchant-cancel`).set('Authorization', `Bearer ${merchantBToken}`).send({ reason: 'Out of stock at Store B' });

  const dbOrderA = await prisma.order.findUnique({ where: { id: orderA.id } });
  const dbOrderB = await prisma.order.findUnique({ where: { id: orderB.id } });

  console.log(`       PostgreSQL Order A Status: ${dbOrderA?.status}`);
  console.log(`       PostgreSQL Order B Status: ${dbOrderB?.status}`);

  if (dbOrderA?.status !== 'PACKING' || dbOrderB?.status !== 'CANCELLED') {
    console.error('FAIL: Independent fulfillment states mismatch');
    process.exit(1);
  }
  console.log('   PASS: Order A (PACKING) and Order B (CANCELLED) operated completely independently!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 24 MULTI-STORE / SPLIT ORDERS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase24().catch((err) => {
  console.error('Phase 24 Multi-Store Split Orders Failure:', err);
  process.exit(1);
});

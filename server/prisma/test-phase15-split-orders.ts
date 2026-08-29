import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase15() {
  console.log('=== PHASE 15 — SPLIT ORDERS QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Customer (+919876543210)
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const address = await prisma.address.findFirst({ where: { userId: custLogin.body.data.user.id } });

  // Ensure Store A (store-1) and Store B (store-2) exist
  const storeA = await prisma.store.findUnique({ where: { id: 'store-1' } });
  
  // Fetch or create Store B for multi-store test
  let storeB = await prisma.store.findFirst({ where: { id: { not: 'store-1' } } });
  if (!storeB) {
    const merchantB = await prisma.merchant.findFirst();
    storeB = await prisma.store.create({
      data: {
        id: 'store-2',
        merchantId: merchantB!.id,
        name: 'Aether Express Supermarket',
        address: 'Station Road, Mahasamund',
        latitude: 21.1100,
        longitude: 82.0980,
        isOpen: true,
        isPaused: false,
        openingTime: '06:00',
        closingTime: '23:30',
      }
    });
  }

  // Fetch product from Store A and Store B
  const productA = await prisma.product.findFirst({ where: { storeId: storeA!.id, isActive: true }, include: { variants: true } });
  
  let productB = await prisma.product.findFirst({ where: { storeId: storeB!.id, isActive: true }, include: { variants: true } });
  if (!productB) {
    const cat = await prisma.category.findFirst();
    productB = await prisma.product.create({
      data: {
        storeId: storeB!.id,
        categoryId: cat!.id,
        name: 'Store B UAT Organic Juice',
        description: 'Fresh Store B Juice',
        price: 120,
        sku: 'STOREB-JUICE-101',
        isActive: true,
        variants: {
          create: [{ name: '500ml', price: 120, sku: 'STOREB-JUICE-500ML', stock: 50 }]
        },
        inventories: {
          create: [{ storeId: storeB!.id, stockQty: 50 }]
        }
      },
      include: { variants: true }
    });
  }

  // ------------------------------------------------------------------
  // OPTION 1 TEST: SINGLE-STORE CART CONFLICT ENFORCEMENT
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Single-Store Cart Conflict (Option 1) ---');
  
  // Clear cart and add Store A product
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${customerToken}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: productA!.id, variantId: productA!.variants[0].id, quantity: 1 });

  // Attempt to add Store B product to same cart
  console.log('1a. Attempting to add Store B product to Store A cart...');
  const addConflictRes = await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ productId: productB!.id, variantId: productB!.variants[0].id, quantity: 1 });

  console.log(`    Add Store B Product HTTP ${addConflictRes.status}: ${addConflictRes.body.error?.message}`);
  if (addConflictRes.status !== 400 || !addConflictRes.body.error?.message.includes('another store')) {
    console.error('FAIL: Multi-store cart conflict was not enforced');
    process.exit(1);
  }
  console.log('    PASS: Single-store cart conflict enforced cleanly with STORE_CONFLICT error!');

  // ------------------------------------------------------------------
  // OPTION 2 TEST: MULTI-STORE SPLIT ORDER CREATION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Multi-Store Split Order Placement (Option 2) ---');
  console.log('2a. Customer placing multi-store order directly via item payload...');

  const splitOrderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address!.id,
      paymentMethod: 'COD',
      items: [
        { productId: productA!.id, variantId: productA!.variants[0].id, quantity: 1 },
        { productId: productB!.id, variantId: productB!.variants[0].id, quantity: 2 },
      ]
    });

  console.log(`    Split Order HTTP ${splitOrderRes.status}`);
  if (splitOrderRes.status !== 200 && splitOrderRes.status !== 201) {
    console.error('FAIL: Multi-store order placement failed:', splitOrderRes.body);
    process.exit(1);
  }

  const createdOrders = splitOrderRes.body.data;
  console.log(`    Total Sub-orders Created: ${Array.isArray(createdOrders) ? createdOrders.length : 1}`);

  if (!Array.isArray(createdOrders) || createdOrders.length !== 2) {
    console.error(`FAIL: Expected 2 sub-orders, got ${Array.isArray(createdOrders) ? createdOrders.length : 1}`);
    process.exit(1);
  }

  const subOrderA = createdOrders.find((o: any) => o.storeId === storeA!.id);
  const subOrderB = createdOrders.find((o: any) => o.storeId === storeB!.id);

  console.log(`    - Sub-order A (Store A: ${storeA!.name}): ${subOrderA.orderNumber} (Total: ₹${subOrderA.totalAmount})`);
  console.log(`    - Sub-order B (Store B: ${storeB!.name}): ${subOrderB.orderNumber} (Total: ₹${subOrderB.totalAmount})`);

  if (!subOrderA || !subOrderB) {
    console.error('FAIL: Sub-orders missing for individual stores');
    process.exit(1);
  }

  // Verify independent fulfillment tracking
  const trackResA = await request(app).get(`/api/customer/orders/${subOrderA.id}`).set('Authorization', `Bearer ${customerToken}`);
  const trackResB = await request(app).get(`/api/customer/orders/${subOrderB.id}`).set('Authorization', `Bearer ${customerToken}`);

  console.log(`    Sub-order A Status: ${trackResA.body.data.status}, Store: ${trackResA.body.data.store?.name}`);
  console.log(`    Sub-order B Status: ${trackResB.body.data.status}, Store: ${trackResB.body.data.store?.name}`);

  if (trackResA.body.data.storeId !== storeA!.id || trackResB.body.data.storeId !== storeB!.id) {
    console.error('FAIL: Store isolation mismatch in sub-orders');
    process.exit(1);
  }

  console.log('    PASS: Multi-store split orders created with independent fulfillment & store isolation!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 15 SPLIT ORDERS PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase15().catch((err) => {
  console.error('Phase 15 Split Orders Failure:', err);
  process.exit(1);
});

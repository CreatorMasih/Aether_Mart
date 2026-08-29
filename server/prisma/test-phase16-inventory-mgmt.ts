import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase16() {
  console.log('=== PHASE 16 — INVENTORY MANAGEMENT QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Authenticate 2 Customers for concurrency test
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin1 = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const token1 = custLogin1.body.data.token;
  const address1 = await prisma.address.findFirst({ where: { userId: custLogin1.body.data.user.id } });

  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543211', type: 'SMS', role: 'CUSTOMER' });
  const custLogin2 = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543211', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const token2 = custLogin2.body.data.token;

  // Add address for Customer 2 if needed
  let address2 = await prisma.address.findFirst({ where: { userId: custLogin2.body.data.user.id } });
  if (!address2) {
    address2 = await prisma.address.create({
      data: {
        userId: custLogin2.body.data.user.id,
        receiverName: 'Customer Two',
        receiverPhone: '+919876543211',
        streetAddress: 'Station Road',
        city: 'Mahasamund',
        state: 'Chhattisgarh',
        postalCode: '493445',
        country: 'India',
        latitude: 21.1085,
        longitude: 82.0965,
      }
    });
  }

  const store = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  
  // Create a dedicated isolated test product for inventory testing
  const cat = await prisma.category.findFirst();
  const testProduct = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Inventory Test Product',
      description: 'Fresh Inventory Test Product',
      unit: 'pc',
      price: 150,
      sku: `INV-TEST-${Date.now()}`,
      isActive: true,
    }
  });

  const testVariant = await prisma.productVariant.create({
    data: {
      productId: testProduct.id,
      name: 'Default Variant',
      price: 150,
      sku: `VAR-INV-${Date.now()}`,
      stock: 10,
    }
  });

  await prisma.inventory.create({
    data: {
      storeId: store!.id,
      productId: testProduct.id,
      variantId: testVariant.id,
      stockQty: 10,
    }
  });

  console.log(`Test Product Created: ${testProduct.name} (Initial Stock: 10)`);

  // ------------------------------------------------------------------
  // TEST 1: STOCK DECREMENT ON ORDER PLACEMENT
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Stock Decrement on Order Placement ---');
  await request(app).delete('/api/customer/cart/clear').set('Authorization', `Bearer ${token1}`);
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${token1}`).send({ productId: testProduct.id, variantId: testVariant.id, quantity: 2 });

  const order1Res = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${token1}`)
    .send({ addressId: address1!.id, paymentMethod: 'COD' });

  const order1 = Array.isArray(order1Res.body.data) ? order1Res.body.data[0] : order1Res.body.data;
  console.log(`   Order Placed: ${order1.orderNumber} (Qty: 2)`);

  let dbVariant = await prisma.productVariant.findUnique({ where: { id: testVariant.id } });
  let dbInv = await prisma.inventory.findFirst({ where: { storeId: store!.id, productId: testProduct.id, variantId: testVariant.id } });

  console.log(`   PostgreSQL Stock after order: Variant Stock=${dbVariant?.stock}, Inventory Stock=${dbInv?.stockQty}`);
  if (dbVariant?.stock !== 8 || dbInv?.stockQty !== 8) {
    console.error('FAIL: Stock did not decrement correctly (expected 8)');
    process.exit(1);
  }
  console.log('   PASS: Stock decremented cleanly from 10 -> 8 in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 2: STOCK RESTORED ON ORDER CANCELLATION
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Stock Restored on Order Cancellation ---');
  const cancelRes = await request(app)
    .post(`/api/customer/orders/${order1.id}/cancel`)
    .set('Authorization', `Bearer ${token1}`);

  console.log(`   Cancel Order HTTP ${cancelRes.status}: status=${cancelRes.body.data?.status}`);

  dbVariant = await prisma.productVariant.findUnique({ where: { id: testVariant.id } });
  dbInv = await prisma.inventory.findFirst({ where: { storeId: store!.id, productId: testProduct.id } });

  console.log(`   PostgreSQL Stock after cancellation: Variant Stock=${dbVariant?.stock}, Inventory Stock=${dbInv?.stockQty}`);
  if (dbVariant?.stock !== 10 || dbInv?.stockQty !== 10) {
    console.error('FAIL: Stock was not restored on cancellation (expected 10)');
    process.exit(1);
  }
  console.log('   PASS: Stock restored cleanly from 8 -> 10 in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 3: OUT OF STOCK (Stock = 0)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Out of Stock (Stock = 0) ---');
  await prisma.productVariant.update({ where: { id: testVariant.id }, data: { stock: 0 } });
  await prisma.inventory.updateMany({ where: { productId: testProduct.id }, data: { stockQty: 0 } });

  const addOosRes = await request(app)
    .post('/api/customer/cart/add')
    .set('Authorization', `Bearer ${token1}`)
    .send({ productId: testProduct.id, variantId: testVariant.id, quantity: 1 });

  console.log(`   Add OOS Item HTTP ${addOosRes.status}: ${addOosRes.body.error?.message}`);
  if (addOosRes.status !== 400 || (!addOosRes.body.error?.message.includes('Insufficient inventory') && !addOosRes.body.error?.message.includes('exceeds available stock'))) {
    console.error('FAIL: Out of stock validation failed');
    process.exit(1);
  }
  console.log('   PASS: Out of Stock validation blocked cart addition!');

  // ------------------------------------------------------------------
  // TEST 4: CONCURRENT ORDERS FOR LAST ITEM (ACID RACE CONDITION SAFETY)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Concurrent Orders for Last Item (ACID Safety) ---');
  
  // Set stock = 1
  await prisma.productVariant.update({ where: { id: testVariant.id }, data: { stock: 1 } });
  await prisma.inventory.updateMany({ where: { productId: testProduct.id }, data: { stockQty: 1 } });

  console.log('   4a. Firing 2 concurrent order requests for the last remaining 1 item...');
  const [resA, resB] = await Promise.all([
    request(app).post('/api/customer/orders').set('Authorization', `Bearer ${token1}`).send({ addressId: address1!.id, paymentMethod: 'COD', items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }] }),
    request(app).post('/api/customer/orders').set('Authorization', `Bearer ${token2}`).send({ addressId: address2!.id, paymentMethod: 'COD', items: [{ productId: testProduct.id, variantId: testVariant.id, quantity: 1 }] }),
  ]);

  console.log(`   Concurrent Order Request A Status: HTTP ${resA.status}`);
  console.log(`   Concurrent Order Request B Status: HTTP ${resB.status}`);

  const successCount = (resA.status === 200 || resA.status === 201 ? 1 : 0) + (resB.status === 200 || resB.status === 201 ? 1 : 0);
  const failureCount = (resA.status === 400 ? 1 : 0) + (resB.status === 400 ? 1 : 0);

  console.log(`   Successes: ${successCount}, Failures: ${failureCount}`);
  if (successCount !== 1 || failureCount !== 1) {
    console.error(`FAIL: Concurrency race condition failed! Successes: ${successCount}, Failures: ${failureCount}`);
    process.exit(1);
  }

  dbVariant = await prisma.productVariant.findUnique({ where: { id: testVariant.id } });
  dbInv = await prisma.inventory.findFirst({ where: { storeId: store!.id, productId: testProduct.id } });
  console.log(`   Final Stock in PostgreSQL DB: Variant Stock=${dbVariant?.stock}, Inventory Stock=${dbInv?.stockQty}`);

  if (dbVariant?.stock !== 0 || dbInv?.stockQty !== 0) {
    console.error('FAIL: Final stock mismatch after concurrency test');
    process.exit(1);
  }
  console.log('   PASS: ACID concurrency safety verified! Exactly 1 order succeeded, stock = 0, zero race conditions!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 16 INVENTORY MANAGEMENT PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase16().catch((err) => {
  console.error('Phase 16 Inventory Management Failure:', err);
  process.exit(1);
});

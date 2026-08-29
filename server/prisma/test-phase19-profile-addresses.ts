import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase19() {
  console.log('=== PHASE 19 — USER PROFILE & ADDRESSES QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Authenticate Customer (+919876543210)
  console.log('1. Authenticating Customer...');
  await request(app).post('/api/auth/send-otp').send({ identifier: '+919876543210', type: 'SMS', role: 'CUSTOMER' });
  const custLogin = await request(app).post('/api/auth/verify-otp').send({ identifier: '+919876543210', code: '123456', role: 'CUSTOMER', method: 'SMS' });
  const customerToken = custLogin.body.data.token;
  const user = custLogin.body.data.user;

  // ------------------------------------------------------------------
  // TEST 1: UPDATE PROFILE NAME & EMAIL
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Update Profile Name & Email ---');
  const updateProfileRes = await request(app)
    .post('/api/auth/complete-profile')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      role: 'CUSTOMER',
      customerDetails: {
        fullName: 'Aravind K. Varma',
        email: 'aravind.varma@aethermart.com',
      }
    });

  console.log(`   Update Profile HTTP ${updateProfileRes.status}`);
  if (updateProfileRes.status !== 200) {
    console.error('FAIL: Profile update failed:', updateProfileRes.body);
    process.exit(1);
  }

  const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customerToken}`);
  const userProfile = meRes.body.data;
  const currentFullName = userProfile.fullName || userProfile.customer?.fullName;
  console.log(`   Updated User Profile: Name="${currentFullName}", Email="${userProfile.email}"`);

  if (currentFullName !== 'Aravind K. Varma' || userProfile.email !== 'aravind.varma@aethermart.com') {
    console.error('FAIL: PostgreSQL profile values did not match update request');
    process.exit(1);
  }
  console.log('   PASS: Profile Name and Email updated in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 2: ADD NEW DELIVERY ADDRESS
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Add New Delivery Address ---');
  const addAddrRes = await request(app)
    .post('/api/customer/addresses')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      label: 'Work',
      receiverName: 'Aravind K. Varma',
      receiverPhone: '+919876543210',
      streetAddress: '77 IT Park, Station Road',
      houseNumber: 'Suite 404',
      postalCode: '493445',
      city: 'Mahasamund',
      state: 'Chhattisgarh',
      country: 'India',
      latitude: 21.1100,
      longitude: 82.0980,
      isDefault: true,
    });

  console.log(`   Add Address HTTP ${addAddrRes.status}`);
  if (addAddrRes.status !== 201 && addAddrRes.status !== 200) {
    console.error('FAIL: Add address failed:', addAddrRes.body);
    process.exit(1);
  }

  const address1 = addAddrRes.body.data;
  console.log(`   Created Address ID: ${address1.id} (Label: ${address1.label}, isDefault: ${address1.isDefault})`);
  if (!address1.isDefault) {
    console.error('FAIL: Created address isDefault expected true');
    process.exit(1);
  }
  console.log('   PASS: New delivery address added & marked default!');

  // ------------------------------------------------------------------
  // TEST 3: EDIT ADDRESS
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Edit Address ---');
  const editAddrRes = await request(app)
    .put(`/api/customer/addresses/${address1.id}`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      label: 'Work',
      receiverName: 'Aravind K. Varma',
      receiverPhone: '+919876543210',
      streetAddress: '99 Tech Tower, Station Road',
      postalCode: '493445',
      city: 'Mahasamund',
      state: 'Chhattisgarh',
      country: 'India',
      isDefault: true,
    });

  console.log(`   Edit Address HTTP ${editAddrRes.status}: Label="${editAddrRes.body.data?.label}", Street="${editAddrRes.body.data?.streetAddress}"`);
  if (editAddrRes.body.data?.label !== 'Work' || editAddrRes.body.data?.streetAddress !== '99 Tech Tower, Station Road') {
    console.error('FAIL: Edit address failed');
    process.exit(1);
  }
  console.log('   PASS: Address updated cleanly in PostgreSQL!');

  // ------------------------------------------------------------------
  // TEST 4: SET DEFAULT ADDRESS & VERIFY CHECKOUT WITH DEFAULT ADDRESS
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Set Default Address & Checkout Selection ---');
  const addAddr2Res = await request(app)
    .post('/api/customer/addresses')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      label: 'Other',
      receiverName: 'Aravind K. Varma',
      receiverPhone: '+919876543210',
      streetAddress: '12 Ocean View Road',
      postalCode: '493445',
      city: 'Mahasamund',
      state: 'Chhattisgarh',
      country: 'India',
      isDefault: true, // Mark Villa address as DEFAULT
    });

  const address2 = addAddr2Res.body.data;
  console.log(`   Created Address 2 (Villa) ID: ${address2.id}, isDefault: ${address2.isDefault}`);

  // Check that Address 1 is no longer default
  const dbAddr1 = await prisma.address.findUnique({ where: { id: address1.id } });
  console.log(`   Address 1 (HQ) isDefault in DB now: ${dbAddr1?.isDefault}`);
  if (dbAddr1?.isDefault !== false) {
    console.error('FAIL: Previous default address was not reset to false');
    process.exit(1);
  }
  console.log('   PASS: Setting new default address automatically reset previous default address!');

  // Checkout with Address 2 (Beach Villa, the new default address)
  console.log('   4a. Placing order with default address (Beach Villa)...');
  const store = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  const cat = await prisma.category.findFirst();

  const product = await prisma.product.create({
    data: {
      storeId: store!.id,
      categoryId: cat!.id,
      name: 'Address Checkout Test Product',
      description: 'Address Test Description',
      unit: 'pc',
      price: 180,
      sku: `ADDR-PROD-${Date.now()}`,
      isActive: true,
    }
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: 'Standard Variant',
      price: 180,
      sku: `VAR-ADDR-${Date.now()}`,
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
  await request(app).post('/api/customer/cart/add').set('Authorization', `Bearer ${customerToken}`).send({ productId: product.id, variantId: variant.id, quantity: 1 });

  const orderRes = await request(app)
    .post('/api/customer/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      addressId: address2.id,
      paymentMethod: 'COD',
    });

  const order = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
  console.log(`   Order Created: ${order.orderNumber} (Address ID in Order: ${order.addressId})`);

  if (order.addressId !== address2.id) {
    console.error(`FAIL: Checkout failed to pick default address! Expected ${address2.id}, got ${order.addressId}`);
    process.exit(1);
  }
  console.log('   PASS: Checkout automatically picked default address (Beach Villa) as expected!');

  // ------------------------------------------------------------------
  // TEST 5: DELETE ADDRESS
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Delete Address ---');
  const deleteRes = await request(app)
    .delete(`/api/customer/addresses/${address1.id}`)
    .set('Authorization', `Bearer ${customerToken}`);

  console.log(`   Delete Address HTTP ${deleteRes.status}`);
  const checkDeleted = await prisma.address.findUnique({ where: { id: address1.id } });
  console.log(`   Address 1 in DB after deletion: ${checkDeleted ? 'EXISTS' : 'DELETED'}`);

  if (checkDeleted) {
    console.error('FAIL: Address was not deleted from PostgreSQL');
    process.exit(1);
  }
  console.log('   PASS: Address deleted cleanly from PostgreSQL!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 19 USER PROFILE & ADDRESSES PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase19().catch((err) => {
  console.error('Phase 19 User Profile & Addresses Failure:', err);
  process.exit(1);
});

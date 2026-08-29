import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase4() {
  console.log('=== PHASE 4 — PRODUCT CATALOG QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  // Step 1: Login Shopkeeper to get Merchant Token
  console.log('1. Authenticating Shopkeeper (+918888888881)...');
  await request(app)
    .post('/api/auth/send-otp')
    .send({ identifier: '+918888888881', type: 'SMS', role: 'SHOPKEEPER' });

  const loginRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ identifier: '+918888888881', code: '123456', role: 'SHOPKEEPER', method: 'SMS' });

  console.log(`   Login HTTP ${loginRes.status}`);
  if (loginRes.status !== 200) {
    console.error('FAIL: Merchant login failed:', loginRes.body);
    process.exit(1);
  }

  const merchantToken = loginRes.body.data.token;

  // Fetch valid category ID from DB
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  if (!category) {
    console.error('FAIL: No active category found in PostgreSQL');
    process.exit(1);
  }

  const testProductName = `UAT Organic Honey ${Date.now()}`;
  const testSku = `SKU-HONEY-${Date.now()}`;

  // Step 2: Merchant adds product to store catalog
  console.log(`\n2. Merchant adding product "${testProductName}" to store...`);
  const createRes = await request(app)
    .post('/api/merchant/products')
    .set('Authorization', `Bearer ${merchantToken}`)
    .send({
      name: testProductName,
      description: '100% Pure Raw Organic Honey from Mahasamund Farms',
      brand: 'Mahasamund Organics',
      isVeg: true,
      isOrganic: true,
      categoryId: category.id,
      weightGrams: 500,
      images: [
        { url: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38', isPrimary: true }
      ],
      variants: [
        { name: '500g Glass Jar', price: 350, stock: 45, sku: testSku }
      ]
    });

  console.log(`   Create Product HTTP ${createRes.status}`);
  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error('FAIL: Product creation failed:', createRes.body);
    process.exit(1);
  }

  const createdProduct = createRes.body.data;
  console.log(`   Created Product ID: ${createdProduct.id}`);

  // Step 3: Verify PostgreSQL State directly
  console.log('\n3. Verifying PostgreSQL State (Product, Variant, Inventory)...');
  const dbProduct = await prisma.product.findUnique({
    where: { id: createdProduct.id },
    include: { variants: true, inventories: true }
  });

  if (!dbProduct) {
    console.error('FAIL: Product not found in PostgreSQL database');
    process.exit(1);
  }

  console.log(`   - PostgreSQL Product: "${dbProduct.name}" (${dbProduct.id})`);
  console.log(`   - PostgreSQL Store ID: ${dbProduct.storeId}`);
  console.log(`   - PostgreSQL Variants Count: ${dbProduct.variants.length}`);
  console.log(`   - PostgreSQL Variant Price: ₹${dbProduct.variants[0]?.price}, Stock: ${dbProduct.variants[0]?.stock}`);
  console.log(`   - PostgreSQL Inventory Stock: ${dbProduct.inventories[0]?.stockQty}`);

  if (dbProduct.variants.length === 0 || dbProduct.inventories.length === 0) {
    console.error('FAIL: Variant or Inventory row missing in PostgreSQL');
    process.exit(1);
  }

  // Step 4: Customer views Store Products
  console.log(`\n4. Customer querying Store Products (Store ID: ${dbProduct.storeId})...`);
  const customerCatalogRes = await request(app)
    .get(`/api/customer/products?storeId=${dbProduct.storeId}`);

  console.log(`   Customer API HTTP ${customerCatalogRes.status}`);
  if (customerCatalogRes.status !== 200 || !customerCatalogRes.body.data?.products) {
    console.error('FAIL: Customer catalog fetch failed:', customerCatalogRes.body);
    process.exit(1);
  }

  const customerProducts = customerCatalogRes.body.data.products;
  const foundProduct = customerProducts.find((p: any) => p.id === createdProduct.id);

  if (!foundProduct) {
    console.error(`FAIL: Merchant-created product (${createdProduct.id}) was NOT returned in Customer catalog listing!`);
    process.exit(1);
  }

  console.log(`   PASS: Merchant-created product appeared in Customer Catalog!`);
  console.log(`   - Name: "${foundProduct.name}"`);
  console.log(`   - Price: ₹${foundProduct.price}`);
  console.log(`   - InStock: ${foundProduct.inStock}`);

  // Step 5: Customer views Product Details Page
  console.log(`\n5. Customer querying Product Detail API (/api/customer/products/${createdProduct.id})...`);
  const detailRes = await request(app)
    .get(`/api/customer/products/${createdProduct.id}`);

  console.log(`   Product Detail HTTP ${detailRes.status}`);
  if (detailRes.status !== 200 || detailRes.body.data?.id !== createdProduct.id) {
    console.error('FAIL: Product detail fetch failed:', detailRes.body);
    process.exit(1);
  }
  console.log('   PASS: Product Detail returned exact matching merchant-created product data!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 4 PRODUCT CATALOG PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase4().catch((err) => {
  console.error('Phase 4 Product Catalog Failure:', err);
  process.exit(1);
});

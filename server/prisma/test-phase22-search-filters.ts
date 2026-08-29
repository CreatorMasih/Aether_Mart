import request from 'supertest';
import { createApp } from '../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../src/config/database.config';
import { initializeCache, disconnectCache } from '../src/config/redis.config';

async function testPhase22() {
  console.log('=== PHASE 22 — SEARCH & FILTER SYSTEM QA TEST ===\n');

  await connectDatabase();
  await initializeCache();
  const app = createApp();

  const storeHigh = await prisma.store.findFirst({ where: { isOpen: true, isPaused: false } });
  await prisma.store.update({ where: { id: storeHigh!.id }, data: { rating: 4.8 } });

  // Create second store with lower rating
  let storeLow = await prisma.store.findFirst({ where: { id: { not: storeHigh!.id } } });
  if (!storeLow) {
    const merchant = await prisma.merchant.findFirst();
    storeLow = await prisma.store.create({
      data: {
        merchantId: merchant!.id,
        name: 'Low Rating Store',
        address: 'Side Street',
        latitude: 21.1100,
        longitude: 82.0980,
        rating: 3.5,
        isOpen: true,
      }
    });
  } else {
    await prisma.store.update({ where: { id: storeLow.id }, data: { rating: 3.5 } });
  }

  const catGroceries = await prisma.category.findFirst({ where: { name: { contains: 'Grocery', mode: 'insensitive' } } })
    || await prisma.category.create({ data: { name: 'Groceries QA', slug: `groceries-qa-${Date.now()}` } });
  
  const catDairy = await prisma.category.findFirst({ where: { name: { contains: 'Dairy', mode: 'insensitive' } } })
    || await prisma.category.create({ data: { name: 'Dairy QA', slug: `dairy-qa-${Date.now()}` } });

  // Seed Product A (Organic Honey, Groceries, ₹250, Store Rating 4.8)
  const productA = await prisma.product.create({
    data: {
      storeId: storeHigh!.id,
      categoryId: catGroceries.id,
      name: 'Organic Himalayan Wild Honey QA',
      description: 'Pure organic mountain honey',
      brand: 'Organic India',
      unit: '500g',
      price: 250,
      sku: `SEARCH-A-${Date.now()}`,
      isActive: true,
    }
  });

  // Seed Product B (Organic Almond Milk, Dairy, ₹120, Store Rating 4.8)
  const productB = await prisma.product.create({
    data: {
      storeId: storeHigh!.id,
      categoryId: catDairy.id,
      name: 'Organic Almond Milk Creamy QA',
      description: 'Fresh organic plant milk',
      brand: 'Urban Platter',
      unit: '1L',
      price: 120,
      sku: `SEARCH-B-${Date.now()}`,
      isActive: true,
    }
  });

  // Seed Product C (Standard Refined Sugar, Groceries, ₹40, Store Rating 3.5)
  const productC = await prisma.product.create({
    data: {
      storeId: storeLow.id,
      categoryId: catGroceries.id,
      name: 'Standard Refined White Sugar QA',
      description: 'Fine grain sugar',
      brand: 'Madhur',
      unit: '1kg',
      price: 40,
      sku: `SEARCH-C-${Date.now()}`,
      isActive: true,
    }
  });

  console.log('Seeded Products for Search Testing:');
  console.log(`- Product A: "${productA.name}" (Price: ₹250, Category: Groceries, Rating: 4.8)`);
  console.log(`- Product B: "${productB.name}" (Price: ₹120, Category: Dairy, Rating: 4.8)`);
  console.log(`- Product C: "${productC.name}" (Price: ₹40, Category: Groceries, Rating: 3.5)`);

  // ------------------------------------------------------------------
  // TEST 1: QUERY SEARCH (Product Name / Brand / Text)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 1: Query Text Search (search=Organic) ---');
  const search1Res = await request(app).get('/api/products?search=Organic');
  console.log(`   Search "Organic" HTTP ${search1Res.status}, count: ${search1Res.body.data.products.length}`);
  
  const ids1 = search1Res.body.data.products.map((p: any) => p.id);
  if (!ids1.includes(productA.id) || !ids1.includes(productB.id) || ids1.includes(productC.id)) {
    console.error('FAIL: Text search query did not match expected products');
    process.exit(1);
  }
  console.log('   PASS: Text search matched Product A & Product B, excluded Product C!');

  // ------------------------------------------------------------------
  // TEST 2: CATEGORY FILTER
  // ------------------------------------------------------------------
  console.log('\n--- TEST 2: Category Filter (search=Organic & category=catGroceries) ---');
  const search2Res = await request(app).get(`/api/products?search=Organic&category=${catGroceries.id}`);
  console.log(`   Category Filter HTTP ${search2Res.status}, count: ${search2Res.body.data.products.length}`);

  const ids2 = search2Res.body.data.products.map((p: any) => p.id);
  if (!ids2.includes(productA.id) || ids2.includes(productB.id)) {
    console.error('FAIL: Category filter failed');
    process.exit(1);
  }
  console.log('   PASS: Category filter returned ONLY Product A from Groceries category!');

  // ------------------------------------------------------------------
  // TEST 3: PRICE RANGE FILTER (minPrice=100 & maxPrice=300)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 3: Price Range Filter (minPrice=100 & maxPrice=300) ---');
  const search3Res = await request(app).get('/api/products?minPrice=100&maxPrice=300');
  console.log(`   Price Filter [100 - 300] count: ${search3Res.body.data.products.length}`);

  const prices3 = search3Res.body.data.products.map((p: any) => p.price);
  if (prices3.some((p: number) => p < 100 || p > 300)) {
    console.error('FAIL: Price range filter allowed out-of-bounds prices');
    process.exit(1);
  }
  console.log('   PASS: Price range filter enforced strictly (100 <= price <= 300)!');

  // ------------------------------------------------------------------
  // TEST 4: RATING FILTER (rating=4.0)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 4: Rating Filter (rating=4.0) ---');
  const search4Res = await request(app).get('/api/products?rating=4.0');
  console.log(`   Rating Filter (>= 4.0) count: ${search4Res.body.data.products.length}`);

  const ids4 = search4Res.body.data.products.map((p: any) => p.id);
  if (!ids4.includes(productA.id) || !ids4.includes(productB.id) || ids4.includes(productC.id)) {
    console.error('FAIL: Rating filter failed');
    process.exit(1);
  }
  console.log('   PASS: Rating filter (>= 4.0 stars) filtered stores cleanly!');

  // ------------------------------------------------------------------
  // TEST 5: SORT PRICE ASCENDING (sort=price_asc)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 5: Sort Price Ascending (sort=price_asc) ---');
  const search5Res = await request(app).get('/api/products?search=QA&sort=price_asc');
  const prices5 = search5Res.body.data.products.map((p: any) => p.price);
  console.log(`   Prices sorted ASC: ${prices5.join(', ')}`);

  for (let i = 0; i < prices5.length - 1; i++) {
    if (prices5[i] > prices5[i + 1]) {
      console.error('FAIL: Price ascending sort failed');
      process.exit(1);
    }
  }
  console.log('   PASS: Products sorted by Price Low -> High cleanly!');

  // ------------------------------------------------------------------
  // TEST 6: SORT RATING DESCENDING (sort=rating)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 6: Sort Rating Descending (sort=rating) ---');
  const search6Res = await request(app).get('/api/products?search=QA&sort=rating');
  const ratings6 = search6Res.body.data.products.map((p: any) => p.rating || p.store?.rating || 0);
  console.log(`   Ratings sorted DESC: ${ratings6.join(', ')}`);

  for (let i = 0; i < ratings6.length - 1; i++) {
    if (ratings6[i] < ratings6[i + 1]) {
      console.error('FAIL: Rating descending sort failed');
      process.exit(1);
    }
  }
  console.log('   PASS: Products sorted by Rating High -> Low cleanly!');

  // ------------------------------------------------------------------
  // TEST 7: EMPTY STATE (NO MATCHING QUERY)
  // ------------------------------------------------------------------
  console.log('\n--- TEST 7: Empty State (No Match) ---');
  const search7Res = await request(app).get('/api/products?search=NonExistentUnicorn99');
  console.log(`   Empty State HTTP ${search7Res.status}, products: ${search7Res.body.data.products.length}, total: ${search7Res.body.data.total}`);

  if (search7Res.body.data.products.length !== 0 || search7Res.body.data.total !== 0) {
    console.error('FAIL: Empty state failed');
    process.exit(1);
  }
  console.log('   PASS: Empty state returned cleanly with zero products!');

  console.log('\n===============================================');
  console.log('🎉 PHASE 22 SEARCH & FILTER SYSTEM PASSED PERFECTLY!');
  console.log('===============================================\n');

  await disconnectDatabase();
  await disconnectCache();
}

testPhase22().catch((err) => {
  console.error('Phase 22 Search & Filter Failure:', err);
  process.exit(1);
});

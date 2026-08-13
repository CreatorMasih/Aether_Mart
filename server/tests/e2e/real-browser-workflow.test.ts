import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/config/database.config';
import { generateTokenPair } from '../../src/utils/jwt.util';
import { createApp } from '../../src/config/app.config';
import request from 'supertest';

const app = createApp();

describe('Real Store -> Product -> Customer Discovery End-to-End Workflow', () => {
  it('Executes complete real user lifecycle on Neon PostgreSQL without test fixtures', async () => {
    console.log('🚀 Starting Real Store -> Product -> Customer Discovery Workflow Verification...');

    const timestamp = Date.now();
    const merchantEmail = `merchant.real.${timestamp}@aetheruat.com`;
    const customerEmail = `customer.real.${timestamp}@aetheruat.com`;

    // 1. Create real Merchant User
    console.log('1️⃣ Creating real Merchant User...');
    const merchantUser = await prisma.user.create({
      data: {
        email: merchantEmail,
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'SHOPKEEPER',
      },
    });

    const merchantToken = generateTokenPair({ userId: merchantUser.id, role: 'SHOPKEEPER' }).accessToken;

    // 2. Merchant completes Store Setup / Profile in Mahasamund
    console.log('2️⃣ Merchant completing Store Profile in Mahasamund (lat: 21.1085, lng: 82.0965, radius: 10km)...');
    const setupRes = await request(app)
      .put('/api/merchant/profile')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        storeName: 'Mahasamund Fresh Supermart',
        ownerName: 'Ram Sahu',
        storeAddress: 'Main Market Road, Mahasamund, CG 493445',
        latitude: 21.1085,
        longitude: 82.0965,
        deliveryRadiusKm: 10.0,
        openingTime: '07:00',
        closingTime: '22:00',
        isOpen: true,
        isPaused: false,
        isHoliday: false,
        minimumOrderValue: 0,
        deliveryFee: 15,
        logoUrl: '🏪',
        bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e',
      });

    expect(setupRes.status).toBe(200);
    expect(setupRes.body.success).toBe(true);

    const storeId = setupRes.body.data.store.id;
    console.log(`✅ Real Store created with ID: ${storeId}`);

    // 3. Fetch Category ID
    const categories = await prisma.category.findMany({ where: { isActive: true } });
    expect(categories.length).toBeGreaterThan(0);
    const categoryId = categories[0].id;

    // 4. Merchant Adds Real Product to Store
    console.log('3️⃣ Merchant adding real Product to Store...');
    const addProductRes = await request(app)
      .post('/api/merchant/products')
      .set('Authorization', `Bearer ${merchantToken}`)
      .send({
        name: 'Fresh Organic Mahasamund Tomatoes 1kg',
        description: 'Locally grown organic red ripe tomatoes.',
        categoryId,
        brand: 'Mahasamund Organics',
        isVeg: true,
        isOrganic: true,
        weightGrams: 1000,
        sku: `AM-VEG-${timestamp}`,
        variants: [
          {
            name: '1 kg Pack',
            price: 40,
            sku: `AM-VEG-${timestamp}`,
            stock: 100,
          },
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
            isPrimary: true,
          },
        ],
      });

    expect(addProductRes.status).toBe(201);
    expect(addProductRes.body.success).toBe(true);

    const productId = addProductRes.body.data.id;
    console.log(`✅ Real Product created with ID: ${productId}`);

    // 5. Create real Customer User
    console.log('4️⃣ Creating real Customer User...');
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        phone: `91234${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'CUSTOMER',
      },
    });

    const customerToken = generateTokenPair({ userId: customerUser.id, role: 'CUSTOMER' }).accessToken;

    // 6. Customer Discovers Store via Mahasamund Location
    console.log('5️⃣ Customer querying nearby stores at Mahasamund location (21.1085, 82.0965)...');
    const homeRes = await request(app)
      .get('/api/customer/home?lat=21.1085&lng=82.0965')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(homeRes.status).toBe(200);
    expect(homeRes.body.success).toBe(true);

    const nearbyStores = homeRes.body.data.nearbyStores;
    expect(nearbyStores.length).toBeGreaterThan(0);

    const discoveredStore = nearbyStores.find((s: any) => s.id === storeId);
    expect(discoveredStore).toBeDefined();
    console.log(`✅ Customer discovered store: '${discoveredStore.name}' (Distance: ${discoveredStore.distance} km)`);

    // 7. Customer Views Store Products
    console.log(`6️⃣ Customer browsing products for store ${storeId}...`);
    const productsRes = await request(app)
      .get(`/api/products?storeId=${storeId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(productsRes.status).toBe(200);
    expect(productsRes.body.success).toBe(true);

    const storeProducts = productsRes.body.data.products;
    expect(storeProducts.length).toBeGreaterThan(0);
    console.log(`✅ Store products retrieved successfully. Found: '${storeProducts[0].name}' (Price: ₹${storeProducts[0].price})`);

    // 8. Customer Adds Product to Cart
    console.log('7️⃣ Customer adding product to cart...');
    const addCartRes = await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        productId,
        quantity: 2,
      });

    expect(addCartRes.status).toBe(200);
    expect(addCartRes.body.success).toBe(true);
    console.log('✅ Product added to cart successfully.');

    // 9. Customer Fetches Cart (Simulating page refresh)
    console.log('8️⃣ Customer fetching cart (verifying persistence)...');
    const getCartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getCartRes.status).toBe(200);
    expect(getCartRes.body.success).toBe(true);

    const cart = getCartRes.body.data;
    expect(cart.items.length).toBeGreaterThan(0);
    expect(cart.items[0].productId).toBe(productId);
    console.log(`✅ Cart persisted cleanly across requests. Total: ₹${cart.totalAmount}, Items: ${cart.items.length}`);

    // Cleanup test verification data
    console.log('9️⃣ Cleaning up test verification records...');
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.deleteMany({ where: { id: cart.id } });
    await prisma.inventory.deleteMany({ where: { storeId } });
    await prisma.productVariant.deleteMany({ where: { productId } });
    await prisma.productImage.deleteMany({ where: { productId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.merchant.deleteMany({ where: { userId: merchantUser.id } });
    await prisma.customer.deleteMany({ where: { userId: customerUser.id } });
    await prisma.user.deleteMany({ where: { id: { in: [merchantUser.id, customerUser.id] } } });

    console.log('🎉 ALL REAL WORKFLOW VERIFICATION STEPS PASSED PERFECTLY!');
  });
});

import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/config/database.config';
import { generateTokenPair } from '../../src/utils/jwt.util';
import { createApp } from '../../src/config/app.config';
import request from 'supertest';

const app = createApp();

describe('🏠 Customer Delivery Address Real End-to-End Persistence', () => {
  it('Executes complete Address CRUD and Order placement integration using real PostgreSQL records', async () => {
    console.log('🚀 Starting Customer Address Lifecycle Verification...');

    const timestamp = Date.now();
    const customerEmail = `customer.addr.${timestamp}@aetheruat.com`;

    // 1. Create real Customer User
    console.log('1️⃣ Creating real Customer User...');
    const customerUser = await prisma.user.create({
      data: {
        email: customerEmail,
        phone: `93456${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'CUSTOMER',
      },
    });

    const customerToken = generateTokenPair({ userId: customerUser.id, role: 'CUSTOMER' }).accessToken;

    // 2. GET /api/customer/addresses (Initial empty check + Customer profile auto-provisioning)
    console.log('2️⃣ Fetching customer addresses (expecting empty array initially)...');
    const initRes = await request(app)
      .get('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(initRes.status).toBe(200);
    expect(initRes.body.success).toBe(true);
    expect(Array.isArray(initRes.body.data)).toBe(true);
    expect(initRes.body.data.length).toBe(0);

    // Verify Customer profile auto-provisioning
    const customerProfile = await prisma.customer.findUnique({ where: { userId: customerUser.id } });
    expect(customerProfile).not.toBeNull();
    console.log(`✅ Customer profile auto-provisioned cleanly: ${customerProfile?.id}`);

    // 3. POST /api/customer/addresses — Create Home Address
    console.log('3️⃣ Creating Home Address in Mahasamund (PIN: 493445)...');
    const homeRes = await request(app)
      .post('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        label: 'Home',
        receiverName: 'Ramesh Kumar',
        receiverPhone: '9876543210',
        streetAddress: 'House 42, Nayapara Main Road',
        apartmentSuite: 'Floor 1',
        landmark: 'Near City Park',
        postalCode: '493445',
        city: 'Mahasamund',
        district: 'Mahasamund',
        state: 'Chhattisgarh',
        country: 'India',
        latitude: 21.1085,
        longitude: 82.0965,
        isDefault: true,
      });

    expect(homeRes.status).toBe(201);
    expect(homeRes.body.success).toBe(true);
    const homeAddr = homeRes.body.data;
    expect(homeAddr.id).toBeDefined();
    expect(homeAddr.streetAddress).toBe('House 42, Nayapara Main Road');
    console.log(`✅ Home Address created in PostgreSQL with ID: ${homeAddr.id}`);

    // 4. POST /api/customer/addresses — Create Work Address
    console.log('4️⃣ Creating Work Address...');
    const workRes = await request(app)
      .post('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        label: 'Work',
        receiverName: 'Ramesh Kumar',
        receiverPhone: '9876543210',
        streetAddress: 'Shop 12, Market Yard',
        postalCode: '493445',
        city: 'Mahasamund',
        district: 'Mahasamund',
        state: 'Chhattisgarh',
        country: 'India',
        latitude: 21.1090,
        longitude: 82.0970,
        isDefault: false,
      });

    expect(workRes.status).toBe(201);
    const workAddr = workRes.body.data;
    console.log(`✅ Work Address created with ID: ${workAddr.id}`);

    // 5. GET /api/customer/addresses — Confirm 2 addresses persist
    console.log('5️⃣ Fetching updated addresses (expecting 2 addresses)...');
    const getRes = await request(app)
      .get('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBe(2);

    // 6. PUT /api/customer/addresses/:id — Edit Work Address
    console.log('6️⃣ Updating Work Address...');
    const updateRes = await request(app)
      .put(`/api/customer/addresses/${workAddr.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        label: 'Work',
        streetAddress: 'Updated Shop 15, Station Road Market',
        postalCode: '493445',
        city: 'Mahasamund',
        latitude: 21.1100,
        longitude: 82.0980,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.streetAddress).toBe('Updated Shop 15, Station Road Market');
    console.log('✅ Work Address updated cleanly.');

    // 7. DELETE /api/customer/addresses/:id — Delete Work Address
    console.log('7️⃣ Deleting Work Address...');
    const delRes = await request(app)
      .delete(`/api/customer/addresses/${workAddr.id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(delRes.status).toBe(200);

    const getAfterDel = await request(app)
      .get('/api/customer/addresses')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getAfterDel.body.data.length).toBe(1);
    expect(getAfterDel.body.data[0].id).toBe(homeAddr.id);
    console.log('✅ Address deleted successfully from PostgreSQL.');

    // 8. Place real Order using saved Home Address ID
    console.log('8️⃣ Creating real Merchant, Store, Product & Placing Order using saved Home Address...');
    const merchantUser = await prisma.user.create({
      data: {
        email: `merchant.addr.${timestamp}@aetheruat.com`,
        phone: `98761${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'SHOPKEEPER',
      },
    });

    const store = await prisma.store.create({
      data: {
        merchantId: (
          await prisma.merchant.create({
            data: { userId: merchantUser.id, fullName: 'Test Merchant' },
          })
        ).id,
        name: 'Mahasamund Address Test Store',
        address: 'Main Market, Mahasamund',
        latitude: 21.1085,
        longitude: 82.0965,
        deliveryRadiusKm: 10.0,
        isOpen: true,
      },
    });

    const category = (await prisma.category.findFirst({ where: { isActive: true } }))!;

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: 'Fresh Mahasamund Apples 1kg',
        description: 'Fresh organic apples from Mahasamund',
        price: 120,
        unit: '1 kg',
        sku: `SKU-APP-${timestamp}`,
        variants: {
          create: [{ name: '1kg Pack', price: 120, sku: `SKU-APP-VAR-${timestamp}`, stock: 50 }],
        },
      },
    });

    const variant = await prisma.productVariant.findFirst({ where: { productId: product.id } });

    await prisma.inventory.create({
      data: {
        storeId: store.id,
        productId: product.id,
        variantId: variant?.id || null,
        stockQty: 100,
        reservedQty: 0,
      },
    });

    // Add product to cart
    await request(app)
      .post('/api/cart/add')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId: product.id, quantity: 1 });

    // Place Order using homeAddr.id
    const orderRes = await request(app)
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        addressId: homeAddr.id,
        paymentMethod: 'COD',
      });

    if (orderRes.status !== 200) {
      console.log('ORDER RES ERROR BODY:', orderRes.body);
    }
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.success).toBe(true);

    const placedOrder = Array.isArray(orderRes.body.data) ? orderRes.body.data[0] : orderRes.body.data;
    expect(placedOrder.id).toBeDefined();

    // Verify order address data persisted in PostgreSQL
    const dbOrder = await prisma.order.findUnique({
      where: { id: placedOrder.id },
      include: { deliveryAddress: true },
    });
    expect(dbOrder).not.toBeNull();
    expect(dbOrder?.deliveryAddress).toBeDefined();
    expect(dbOrder?.deliveryAddress?.streetAddress).toContain('House 42, Nayapara Main Road');
    expect(dbOrder?.deliveryAddress?.postalCode).toBe('493445');
    expect(dbOrder?.deliveryAddress?.city).toBe('Mahasamund');
    console.log(`✅ Order placed successfully! Order ID: ${dbOrder?.id}, Address: '${dbOrder?.deliveryAddress?.streetAddress}'`);

    // Teardown test data
    console.log('9️⃣ Teardown verification test records...');
    await prisma.orderItem.deleteMany({ where: { orderId: dbOrder!.id } });
    await prisma.order.deleteMany({ where: { id: dbOrder!.id } });
    await prisma.cartItem.deleteMany({ where: { cart: { customerId: customerProfile.id } } });
    await prisma.cart.deleteMany({ where: { customerId: customerProfile.id } });
    await prisma.inventory.deleteMany({ where: { storeId: store.id } });
    await prisma.productVariant.deleteMany({ where: { productId: product.id } });
    await prisma.product.deleteMany({ where: { id: product.id } });
    await prisma.store.deleteMany({ where: { id: store.id } });
    await prisma.merchant.deleteMany({ where: { userId: merchantUser.id } });
    await prisma.address.deleteMany({ where: { userId: customerUser.id } });
    await prisma.wallet.deleteMany({ where: { customerId: customerProfile.id } });
    await prisma.customer.deleteMany({ where: { userId: customerUser.id } });
    await prisma.user.deleteMany({ where: { id: { in: [customerUser.id, merchantUser.id] } } });

    console.log('🎉 ALL CUSTOMER ADDRESS LIFECYCLE TESTS PASSED PERFECTLY!');
  }, 60000);
});

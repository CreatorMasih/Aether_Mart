import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Explicit list of temporary UAT / QA test user identifiers
const uatTestEmails = [
  '123pratikkumar@gmail.com',
  'admin@aethermart.com',
  'customer1@gmail.com',
  'customer2@gmail.com',
  'merchant1@aethermart.com',
  'merchant2@aethermart.com',
  'merchant3@aethermart.com',
  'rider1@aethermart.com',
  'rider2@aethermart.com',
  'test-admin@aethermart.com',
  'test-customer@aethermart.com',
  'test-merchant@aethermart.com',
  'test-rider@aethermart.com',
  'test-new-customer@aethermart.com',
  'test-new-merchant@aethermart.com',
  'test-new-rider@aethermart.com',
  'uat-customer@aethermart.com',
  'uat-merchant@aethermart.com',
  'uat-rider@aethermart.com',
  'uat-admin@aethermart.com',
];

const uatTestPhones = [
  '+919999999999',
  '+919876543210',
  '+919876543211',
  '+918888888881',
  '+918888888882',
  '+918888888883',
  '+917777777771',
  '+917777777772',
  '+919999988888',
];

async function main() {
  console.log('🧹 UAT / Test Account Cleanup Script');
  console.log('====================================\n');

  // Find all target UAT user IDs
  const uatUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: uatTestEmails } },
        { phone: { in: uatTestPhones } },
        { email: { startsWith: 'test-' } },
        { email: { startsWith: 'uat-' } },
      ],
    },
    select: { id: true, email: true, phone: true, role: true },
  });

  const uatUserIds = uatUsers.map((u) => u.id);

  if (uatUserIds.length === 0) {
    console.log('✨ No UAT test accounts found in the database. Nothing to clean up.');
    return;
  }

  // Count related dependent records
  const countRefreshTokens = await prisma.refreshToken.count({ where: { userId: { in: uatUserIds } } });
  const countAddresses = await prisma.address.count({ where: { userId: { in: uatUserIds } } });
  const countCustomers = await prisma.customer.count({ where: { userId: { in: uatUserIds } } });
  const countMerchants = await prisma.merchant.count({ where: { userId: { in: uatUserIds } } });
  const countRiders = await prisma.rider.count({ where: { userId: { in: uatUserIds } } });
  const countOtps = await prisma.oTPVerification.count({
    where: {
      OR: [
        { identifier: { in: uatTestEmails } },
        { identifier: { in: uatTestPhones } },
        { identifier: { startsWith: 'test-' } },
        { identifier: { startsWith: 'uat-' } },
      ],
    },
  });

  console.log('📋 UAT Summary of records targeted for deletion:');
  console.log(`- UAT Users: ${uatUsers.length}`);
  uatUsers.forEach((u) => console.log(`  • ${u.role}: ${u.email || u.phone}`));
  console.log(`- Refresh Tokens: ${countRefreshTokens}`);
  console.log(`- Addresses: ${countAddresses}`);
  console.log(`- Customer Profiles: ${countCustomers}`);
  console.log(`- Merchant Profiles: ${countMerchants}`);
  console.log(`- Rider Profiles: ${countRiders}`);
  console.log(`- OTP Verification Log Entries: ${countOtps}\n`);

  const isConfirmed = process.argv.includes('--confirm') || process.env.CONFIRM_CLEANUP_UAT === 'true';

  if (!isConfirmed) {
    console.log('⚠️ CONFIRMATION REQUIRED:');
    console.log('To execute deletion of the above UAT records, re-run with:');
    console.log('  npm run db:cleanup:uat -- --confirm');
    console.log('  OR set env var CONFIRM_CLEANUP_UAT=true\n');
    console.log('Execution safely aborted.');
    return;
  }

  console.log('🚀 Executing safe UAT cleanup...');

  // Safe cascaded deletion of UAT records ONLY
  await prisma.refreshToken.deleteMany({ where: { userId: { in: uatUserIds } } });
  await prisma.address.deleteMany({ where: { userId: { in: uatUserIds } } });
  
  // Find customer/merchant/rider IDs for clean store/order cleanup
  const uatCustomerRecords = await prisma.customer.findMany({ where: { userId: { in: uatUserIds } }, select: { id: true } });
  const uatCustomerIds = uatCustomerRecords.map((c) => c.id);
  const uatMerchantRecords = await prisma.merchant.findMany({ where: { userId: { in: uatUserIds } }, select: { id: true } });
  const uatMerchantIds = uatMerchantRecords.map((m) => m.id);
  const uatRiderRecords = await prisma.rider.findMany({ where: { userId: { in: uatUserIds } }, select: { id: true } });
  const uatRiderIds = uatRiderRecords.map((r) => r.id);

  if (uatCustomerIds.length > 0) {
    await prisma.cartItem.deleteMany({ where: { cart: { customerId: { in: uatCustomerIds } } } });
    await prisma.cart.deleteMany({ where: { customerId: { in: uatCustomerIds } } });
    await prisma.wishlist.deleteMany({ where: { customerId: { in: uatCustomerIds } } });
    await prisma.walletTransaction.deleteMany({ where: { wallet: { customerId: { in: uatCustomerIds } } } });
    await prisma.wallet.deleteMany({ where: { customerId: { in: uatCustomerIds } } });
  }

  if (uatMerchantIds.length > 0 || uatCustomerIds.length > 0 || uatRiderIds.length > 0) {
    const uatStores = await prisma.store.findMany({ where: { merchantId: { in: uatMerchantIds } }, select: { id: true } });
    const uatStoreIds = uatStores.map((s) => s.id);

    const uatOrders = await prisma.order.findMany({
      where: {
        OR: [
          { customerId: { in: uatCustomerIds } },
          { storeId: { in: uatStoreIds } },
        ],
      },
      select: { id: true },
    });
    const uatOrderIds = uatOrders.map((o) => o.id);

    if (uatOrderIds.length > 0) {
      await prisma.deliveryTracking.deleteMany({ where: { assignment: { orderId: { in: uatOrderIds } } } });
      await prisma.deliveryAssignment.deleteMany({ where: { orderId: { in: uatOrderIds } } });
      await prisma.transaction.deleteMany({ where: { payment: { orderId: { in: uatOrderIds } } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: uatOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: uatOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: uatOrderIds } } });
    }

    if (uatStoreIds.length > 0) {
      await prisma.inventory.deleteMany({ where: { storeId: { in: uatStoreIds } } });
      await prisma.productImage.deleteMany({ where: { product: { storeId: { in: uatStoreIds } } } });
      await prisma.productVariant.deleteMany({ where: { product: { storeId: { in: uatStoreIds } } } });
      await prisma.product.deleteMany({ where: { storeId: { in: uatStoreIds } } });
      await prisma.store.deleteMany({ where: { id: { in: uatStoreIds } } });
    }
  }

  await prisma.customer.deleteMany({ where: { userId: { in: uatUserIds } } });
  await prisma.merchant.deleteMany({ where: { userId: { in: uatUserIds } } });
  await prisma.rider.deleteMany({ where: { userId: { in: uatUserIds } } });
  await prisma.oTPVerification.deleteMany({
    where: {
      OR: [
        { identifier: { in: uatTestEmails } },
        { identifier: { in: uatTestPhones } },
        { identifier: { startsWith: 'test-' } },
        { identifier: { startsWith: 'uat-' } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: uatUserIds } } });

  console.log('✅ UAT records successfully cleaned up! Production records were preserved untouched.');
}

main()
  .catch((e) => {
    console.error('❌ Error during UAT cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

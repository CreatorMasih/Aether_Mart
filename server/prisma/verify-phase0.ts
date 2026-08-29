import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== PHASE 0: CLEAN QA BASELINE VERIFICATION ===\n');

  // 1. PostgreSQL Connection Test
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    console.log('1. PostgreSQL Connection: PASS');
  } catch (err: any) {
    console.error('1. PostgreSQL Connection: FAIL -', err.message);
    process.exit(1);
  }

  // 2. OTP_MODE env check
  const otpMode = process.env.OTP_MODE || (process.env.NODE_ENV === 'production' ? 'production' : 'dev');
  console.log(`2. OTP_MODE: ${otpMode} (${otpMode === 'dev' ? 'PASS' : 'WARNING'})`);

  // 3. Verify UAT Users for each role
  const roles: UserRole[] = [UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SHOPKEEPER, UserRole.RIDER];
  const userCounts: Record<string, number> = {};

  for (const role of roles) {
    const users = await prisma.user.findMany({
      where: { role, isVerified: true },
      select: { id: true, phone: true, email: true, role: true }
    });
    userCounts[role] = users.length;
    console.log(`3. Users with role [${role}]: ${users.length} found`);
    if (users.length > 0) {
      console.log(`   Sample [${role}]: id=${users[0].id}, identifier=${users[0].phone || users[0].email}`);
    }
  }

  // 4. Verify canonical profiles for each role
  // Customer
  const customerProfile = await prisma.customer.findFirst({
    include: { user: true }
  });
  console.log(`4a. Customer Profile: ${customerProfile ? `PASS (id=${customerProfile.id}, userId=${customerProfile.userId})` : 'FAIL (No customer profile)'}`);

  // Shopkeeper / Merchant profile
  const merchantProfile = await prisma.merchant.findFirst({
    include: { user: true, store: true }
  });
  console.log(`4b. Merchant Profile: ${merchantProfile ? `PASS (id=${merchantProfile.id}, userId=${merchantProfile.userId})` : 'FAIL (No merchant profile)'}`);

  // Rider profile
  const riderProfile = await prisma.rider.findFirst({
    include: { user: true }
  });
  console.log(`4c. Rider Profile: ${riderProfile ? `PASS (id=${riderProfile.id}, userId=${riderProfile.userId})` : 'FAIL (No rider profile)'}`);

  // 5. Active UAT Merchant Store
  const activeStore = await prisma.store.findFirst({
    where: { isOpen: true, isPaused: false },
    include: { merchant: true }
  });
  console.log(`5. Active UAT Merchant Store: ${activeStore ? `PASS (id=${activeStore.id}, name="${activeStore.name}", city=${activeStore.city})` : 'FAIL (No active store)'}`);

  // 6. Active Product + Variant + Inventory Row
  const productWithInventory = await prisma.product.findFirst({
    where: { isActive: true },
    include: {
      variants: {
        include: {
          inventories: true
        }
      },
      store: true
    }
  });

  if (productWithInventory && productWithInventory.variants.length > 0 && productWithInventory.variants[0].inventories.length > 0) {
    const variant = productWithInventory.variants[0];
    const inventory = variant.inventories[0];
    console.log(`6. Product + Variant + Inventory: PASS`);
    console.log(`   Product: "${productWithInventory.title}" (${productWithInventory.id})`);
    console.log(`   Variant: "${variant.variantName}" (${variant.id})`);
    console.log(`   Inventory: qty=${inventory.availableQuantity}, storeId=${inventory.storeId}`);
  } else {
    console.log(`6. Product + Variant + Inventory: FAIL (Missing product/variant/inventory record)`);
  }

  // 7. Active Customer Cart
  if (customerProfile) {
    let cart = await prisma.cart.findUnique({
      where: { customerId: customerProfile.id },
      include: { items: true }
    });
    if (!cart) {
      // Ensure one active UAT customer cart exists
      cart = await prisma.cart.create({
        data: {
          customerId: customerProfile.id
        },
        include: { items: true }
      });
    }
    console.log(`7. Active UAT Customer Cart: PASS (id=${cart.id}, customerId=${cart.customerId}, itemsCount=${cart.items.length})`);
  } else {
    console.log(`7. Active UAT Customer Cart: FAIL (No customer profile to attach cart to)`);
  }

  console.log('\n===============================================');
}

main()
  .catch((e) => {
    console.error('Phase 0 Verification Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

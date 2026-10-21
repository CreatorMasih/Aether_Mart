import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Clearing development/UAT database...');

  // Delete all records in correct order respecting foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.deliveryTracking.deleteMany();
  await prisma.deliveryAssignment.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Database cleared successfully. 0 demo records remain.');

  // Seed base product categories required for real product categorization
  console.log('📦 Seeding standard categories...');
  const categories = [
    { slug: 'daily-essentials',           name: 'Daily Essentials',     imageUrl: '🥛' },
    { slug: 'fresh-fruits-and-vegetables', name: 'Fresh Produce',        imageUrl: '🍎' },
    { slug: 'pharmacy',                   name: 'Pharmacy',              imageUrl: '💊' },
    { slug: 'personal-care',              name: 'Personal Care',         imageUrl: '🧴' },
    { slug: 'dairy-and-eggs',             name: 'Dairy & Eggs',          imageUrl: '🥚' },
    { slug: 'pet-care',                   name: 'Pet Care',              imageUrl: '🐶' },
    { slug: 'electronics',               name: 'Electronics',            imageUrl: '📱' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, imageUrl: cat.imageUrl },
      create: cat,
    });
  }

  console.log('✨ Base categories created cleanly.');
}

clearDatabase()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

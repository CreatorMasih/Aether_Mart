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
    {
      id: 'cat-grocery',
      slug: 'daily-essentials',
      name: 'Daily Essentials & Grocery',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
    },
    {
      id: 'cat-fruits-veg',
      slug: 'fresh-fruits-and-vegetables',
      name: 'Fresh Fruits & Vegetables',
      imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=500&q=80',
    },
    {
      id: 'cat-pharmacy',
      slug: 'pharmacy',
      name: 'Pharmacy & Wellness',
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&q=80',
    },
    {
      id: 'cat-personal-care',
      slug: 'personal-care',
      name: 'Personal Care & Hygiene',
      imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&q=80',
    },
    {
      id: 'cat-dairy-eggs',
      slug: 'dairy-and-eggs',
      name: 'Dairy, Milk & Eggs',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80',
    },
    {
      id: 'cat-pet-care',
      slug: 'pet-care',
      name: 'Pet Care & Supplies',
      imageUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&q=80',
    },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
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

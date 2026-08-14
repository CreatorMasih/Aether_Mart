import { PrismaClient, UserRole, AddressLabel, VehicleType, OrderStatus, PaymentMethod, PaymentStatus, DeliveryStatus, CouponType, LinkType, TicketStatus, TicketPriority, WalletTxType, TransactionType, TransactionStatus, ReferralStatus, OtpChannel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Clearing old data...');
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

  // Create default password hash
  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Users
  console.log('👤 Seeding Users...');
  
  // Admin
  const adminUser = await prisma.user.create({
    data: {
      phone: '+919999999999',
      email: 'admin@aethermart.com',
      passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  // Customers
  const customerUser1 = await prisma.user.create({
    data: {
      phone: '+919876543210',
      email: 'customer1@gmail.com',
      passwordHash,
      role: UserRole.CUSTOMER,
      isVerified: true,
    },
  });

  const customerUser2 = await prisma.user.create({
    data: {
      phone: '+919876543211',
      email: 'customer2@gmail.com',
      passwordHash,
      role: UserRole.CUSTOMER,
      isVerified: true,
    },
  });

  // Shopkeepers
  const shopkeeperUser1 = await prisma.user.create({
    data: {
      phone: '+918888888881',
      email: 'merchant1@aethermart.com',
      passwordHash,
      role: UserRole.SHOPKEEPER,
      isVerified: true,
    },
  });

  const shopkeeperUser2 = await prisma.user.create({
    data: {
      phone: '+918888888882',
      email: 'merchant2@aethermart.com',
      passwordHash,
      role: UserRole.SHOPKEEPER,
      isVerified: true,
    },
  });

  const shopkeeperUser3 = await prisma.user.create({
    data: {
      phone: '+918888888883',
      email: 'merchant3@aethermart.com',
      passwordHash,
      role: UserRole.SHOPKEEPER,
      isVerified: true,
    },
  });

  // Riders
  const riderUser1 = await prisma.user.create({
    data: {
      phone: '+917777777771',
      email: 'rider1@aethermart.com',
      passwordHash,
      role: UserRole.RIDER,
      isVerified: true,
    },
  });

  const riderUser2 = await prisma.user.create({
    data: {
      phone: '+917777777772',
      email: 'rider2@aethermart.com',
      passwordHash,
      role: UserRole.RIDER,
      isVerified: true,
    },
  });

  // 2. Saved Addresses
  console.log('📍 Seeding Addresses...');
  const addr1 = await prisma.address.create({
    data: {
      userId: customerUser1.id,
      label: AddressLabel.Home,
      receiverName: 'Aravind K.',
      receiverPhone: '+919876543210',
      streetAddress: 'Flat 204, Station Road',
      apartmentSuite: '2nd Floor',
      postalCode: '493445',
      city: 'Mahasamund',
      latitude: 21.1120,
      longitude: 82.0990,
      isDefault: true,
    },
  });

  const addr2 = await prisma.address.create({
    data: {
      userId: customerUser1.id,
      label: AddressLabel.Work,
      receiverName: 'Aravind K.',
      receiverPhone: '+919876543210',
      streetAddress: 'Aether Store Hub, Bus Stand Road',
      apartmentSuite: 'Cabin 12',
      postalCode: '493445',
      city: 'Mahasamund',
      latitude: 21.1090,
      longitude: 82.0970,
      isDefault: false,
    },
  });

  const addr3 = await prisma.address.create({
    data: {
      userId: customerUser2.id,
      label: AddressLabel.Home,
      receiverName: 'Meera Sen',
      receiverPhone: '+919876543211',
      streetAddress: '12, Civil Lines Road',
      postalCode: '493445',
      city: 'Mahasamund',
      latitude: 21.1100,
      longitude: 82.0980,
      isDefault: true,
    },
  });

  // 3. Customers
  console.log('🛍️ Seeding Customers...');
  const customer1 = await prisma.customer.create({
    data: {
      userId: customerUser1.id,
      fullName: 'Aravind K.',
      loyaltyPoints: 120,
      referralCode: 'ARAVIND120',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      userId: customerUser2.id,
      fullName: 'Meera Sen',
      loyaltyPoints: 50,
      referralCode: 'MEERA50',
    },
  });

  // 4. Merchants
  console.log('🏢 Seeding Merchants...');
  const merchant1 = await prisma.merchant.create({
    data: {
      userId: shopkeeperUser1.id,
      fullName: 'Rajesh Kumar',
      gstNumber: '29AAAAA1111A1Z1',
      panNumber: 'ABCDE1234F',
      fssaiNumber: '10012011000122',
      bankAccount: '123456789012',
      bankName: 'HDFC Bank',
      isApproved: true,
    },
  });

  const merchant2 = await prisma.merchant.create({
    data: {
      userId: shopkeeperUser2.id,
      fullName: 'Anjali Sharma',
      gstNumber: '29BBBBB2222B2Z2',
      panNumber: 'FGHIJ5678K',
      fssaiNumber: '20015011000344',
      isApproved: true,
    },
  });

  const merchant3 = await prisma.merchant.create({
    data: {
      userId: shopkeeperUser3.id,
      fullName: 'Vikram Singh',
      gstNumber: '29CCCCC3333C3Z3',
      panNumber: 'LMNOP9012Q',
      fssaiNumber: '30018011000566',
      isApproved: true,
    },
  });

  // 5. Stores
  console.log('🏪 Seeding Stores...');
  const store1 = await prisma.store.create({
    data: {
      id: 'store-1',
      merchantId: merchant1.id,
      name: 'Aether Fresh Market',
      logoUrl: '🥬',
      bannerUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      rating: 4.8,
      deliveryTimeMins: 10,
      address: 'Main Market Road, Mahasamund',
      latitude: 21.1085,
      longitude: 82.0965,
      isOpen: true,
      commissionRate: 0.10,
      minimumOrderValue: 150.0,
      deliveryFee: 25.0,
      openingTime: '00:00',
      closingTime: '23:59',
    },
  });

  const store2 = await prisma.store.create({
    data: {
      id: 'store-2',
      merchantId: merchant2.id,
      name: 'Apollo Pharmacy Express',
      logoUrl: '💊',
      bannerUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=1200&q=80',
      rating: 4.6,
      deliveryTimeMins: 12,
      address: 'Hospital Road, Mahasamund',
      latitude: 21.1070,
      longitude: 82.0950,
      isOpen: true,
      commissionRate: 0.08,
      openingTime: '00:00',
      closingTime: '23:59',
    },
  });

  const store3 = await prisma.store.create({
    data: {
      id: 'store-3',
      merchantId: merchant3.id,
      name: 'Super Pet Stop',
      logoUrl: '🐾',
      bannerUrl: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=1200&q=80',
      rating: 4.7,
      deliveryTimeMins: 15,
      address: 'Station Road, Mahasamund',
      latitude: 21.1060,
      longitude: 82.0940,
      isOpen: true,
      commissionRate: 0.12,
      openingTime: '00:00',
      closingTime: '23:59',
    },
  });

  // 6. Riders
  console.log('🛵 Seeding Riders...');
  const rider1 = await prisma.rider.create({
    data: {
      userId: riderUser1.id,
      fullName: 'Ramesh Gowda',
      vehicleType: VehicleType.MOTORBIKE,
      vehiclePlateNumber: 'CG-04-EQ-9999',
      isOnline: true,
      isApproved: true,
      currentLatitude: 21.1090,
      currentLongitude: 82.0970,
      rating: 4.9,
      licenseNumber: 'KA-51/D-0099881',
      rcNumber: 'KA-51-EH-8822',
      isRcUploaded: true,
      isInsuranceUploaded: true,
      isLicenseUploaded: true,
      balance: 870.0,
      bankAccount: '987654321098',
      bankName: 'ICICI Bank',
    },
  });

  const rider2 = await prisma.rider.create({
    data: {
      userId: riderUser2.id,
      fullName: 'Suresh Patil',
      vehicleType: VehicleType.BICYCLE,
      isOnline: false,
      isApproved: true,
      rating: 4.5,
    },
  });

  // 7. Categories
  console.log('🗂️ Seeding Categories...');
  const catDaily = await prisma.category.create({
    data: { name: 'Daily Essentials', slug: 'daily-essentials', imageUrl: '🥛' },
  });
  const catFresh = await prisma.category.create({
    data: { name: 'Fresh Produce', slug: 'fresh-fruits-and-vegetables', imageUrl: '🍎' },
  });
  const catPharmacy = await prisma.category.create({
    data: { name: 'Pharmacy', slug: 'pharmacy', imageUrl: '💊' },
  });
  const catPersonal = await prisma.category.create({
    data: { name: 'Personal Care', slug: 'personal-care', imageUrl: '🧴' },
  });
  const catPet = await prisma.category.create({
    data: { name: 'Pet Care', slug: 'pet-care', imageUrl: '🐶' },
  });
  const catElectronics = await prisma.category.create({
    data: { name: 'Electronics', slug: 'electronics', imageUrl: '📱' },
  });

  // 8. Products, Images, Variants & Inventory
  console.log('🍎 Seeding Products, Variants & Inventory...');
  
  // Prod 1: Organic Milk
  const prodMilk = await prisma.product.create({
    data: {
      id: 'prod-milk-1',
      storeId: store1.id,
      categoryId: catDaily.id,
      name: 'Organic Whole Milk',
      description: 'Fresh organic pasteurized whole cow milk, sourced from local green pasture farms. No added preservatives.',
      price: 68.0,
      discountPrice: 60.0,
      brand: 'Aether Farms',
      unit: 'packet',
      weightGrams: 500,
      isOrganic: true,
      isVegetarian: true,
      calories: 310,
      proteinGrams: 16,
      carbGrams: 24,
      fatGrams: 17,
      sku: 'MILK-ORG-500',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodMilk.id, url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const milkV1 = await prisma.productVariant.create({
    data: { productId: prodMilk.id, name: '500 ml', price: 68.0, sku: 'MILK-ORG-500', stock: 25 },
  });

  const milkV2 = await prisma.productVariant.create({
    data: { productId: prodMilk.id, name: '1 Litre', price: 125.0, sku: 'MILK-ORG-1000', stock: 15 },
  });

  await prisma.inventory.createMany({
    data: [
      { storeId: store1.id, productId: prodMilk.id, variantId: milkV1.id, stockQty: 25, lowStockThreshold: 5 },
      { storeId: store1.id, productId: prodMilk.id, variantId: milkV2.id, stockQty: 15, lowStockThreshold: 5 },
    ],
  });

  // Prod 2: Sourdough Bread
  const prodBread = await prisma.product.create({
    data: {
      id: 'prod-bread-1',
      storeId: store1.id,
      categoryId: catDaily.id,
      name: 'Sourdough Whole Wheat Bread',
      description: 'Artisanal stone-baked whole wheat sourdough bread with high fiber and low glycemic index.',
      price: 95.0,
      discountPrice: 85.0,
      brand: 'Baker Fresh',
      unit: 'loaf',
      weightGrams: 400,
      isOrganic: false,
      isVegetarian: true,
      calories: 240,
      proteinGrams: 9,
      carbGrams: 42,
      fatGrams: 1.5,
      sku: 'BREAD-SDR-400',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodBread.id, url: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const breadV1 = await prisma.productVariant.create({
    data: { productId: prodBread.id, name: '400g Loaf', price: 95.0, sku: 'BREAD-SDR-400', stock: 12 },
  });

  const breadV2 = await prisma.productVariant.create({
    data: { productId: prodBread.id, name: '800g Family Loaf', price: 180.0, sku: 'BREAD-SDR-800', stock: 6 },
  });

  await prisma.inventory.createMany({
    data: [
      { storeId: store1.id, productId: prodBread.id, variantId: breadV1.id, stockQty: 12, lowStockThreshold: 3 },
      { storeId: store1.id, productId: prodBread.id, variantId: breadV2.id, stockQty: 6, lowStockThreshold: 2 },
    ],
  });

  // Prod 3: Gala Apples
  const prodApple = await prisma.product.create({
    data: {
      id: 'prod-apple-1',
      storeId: store1.id,
      categoryId: catFresh.id,
      name: 'Royal Gala Apples',
      description: 'Crisp, sweet, and juicy gala apples imported from Himachal orchards. Rich in antioxidants.',
      price: 180.0,
      discountPrice: 160.0,
      brand: 'Himachal Orchards',
      unit: 'pack',
      weightGrams: 1000,
      isOrganic: true,
      isVegetarian: true,
      calories: 95,
      proteinGrams: 0.5,
      carbGrams: 25,
      fatGrams: 0.3,
      sku: 'FRT-APL-GALA',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodApple.id, url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const appleV1 = await prisma.productVariant.create({
    data: { productId: prodApple.id, name: '1 kg Pack', price: 180.0, sku: 'FRT-APL-GALA-1K', stock: 15 },
  });

  const appleV2 = await prisma.productVariant.create({
    data: { productId: prodApple.id, name: '500g Pack', price: 95.0, sku: 'FRT-APL-GALA-500', stock: 30 },
  });

  await prisma.inventory.createMany({
    data: [
      { storeId: store1.id, productId: prodApple.id, variantId: appleV1.id, stockQty: 15, lowStockThreshold: 4 },
      { storeId: store1.id, productId: prodApple.id, variantId: appleV2.id, stockQty: 30, lowStockThreshold: 4 },
    ],
  });

  // Prod 4: Avocados
  const prodAvocado = await prisma.product.create({
    data: {
      id: 'prod-avocado-1',
      storeId: store1.id,
      categoryId: catFresh.id,
      name: 'Organic Hass Avocados',
      description: 'Rich, creamy Hass avocados loaded with healthy monounsaturated fats and potassium.',
      price: 240.0,
      unit: 'pack',
      weightGrams: 500,
      isOrganic: true,
      isVegetarian: true,
      calories: 160,
      proteinGrams: 2,
      carbGrams: 8.5,
      fatGrams: 14.7,
      sku: 'FRT-AVO-HASS',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodAvocado.id, url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const avoV1 = await prisma.productVariant.create({
    data: { productId: prodAvocado.id, name: '500g (2-3 Pieces)', price: 240.0, sku: 'FRT-AVO-HASS-500', stock: 4 },
  });

  await prisma.inventory.create({
    data: { storeId: store1.id, productId: prodAvocado.id, variantId: avoV1.id, stockQty: 4, lowStockThreshold: 2 },
  });

  // Prod 5: Vitamin C (Store 2)
  const prodVitC = await prisma.product.create({
    data: {
      id: 'prod-vitamin-c',
      storeId: store2.id,
      categoryId: catPharmacy.id,
      name: 'Vitamin C 500mg Chewable',
      description: 'Immunity boosting vitamin C supplement to aid general health and energy levels.',
      price: 120.0,
      unit: 'strip',
      weightGrams: 50,
      isOrganic: false,
      isVegetarian: true,
      sku: 'MED-VIT-C500',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodVitC.id, url: 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const vitCV1 = await prisma.productVariant.create({
    data: { productId: prodVitC.id, name: '15 Tablets Strip', price: 120.0, sku: 'MED-VIT-C500', stock: 50 },
  });

  await prisma.inventory.create({
    data: { storeId: store2.id, productId: prodVitC.id, variantId: vitCV1.id, stockQty: 50, lowStockThreshold: 10 },
  });

  // Prod 6: Shampoo
  const prodShampoo = await prisma.product.create({
    data: {
      id: 'prod-shampoo-1',
      storeId: store1.id,
      categoryId: catPersonal.id,
      name: 'Tea Tree Cleansing Shampoo',
      description: 'Anti-dandruff sulfate-free tea tree oil shampoo for clean, refreshed hair.',
      price: 349.0,
      unit: 'bottle',
      weightGrams: 300,
      isOrganic: true,
      isVegetarian: true,
      sku: 'PC-SHM-TT300',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodShampoo.id, url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const shampooV1 = await prisma.productVariant.create({
    data: { productId: prodShampoo.id, name: '300 ml Bottle', price: 349.0, sku: 'PC-SHM-TT300', stock: 20 },
  });

  await prisma.inventory.create({
    data: { storeId: store1.id, productId: prodShampoo.id, variantId: shampooV1.id, stockQty: 20, lowStockThreshold: 5 },
  });

  // Prod 7: Dog Food (Store 3)
  const prodDogFood = await prisma.product.create({
    data: {
      id: 'prod-dog-food',
      storeId: store3.id,
      categoryId: catPet.id,
      name: 'Premium Salmon Dog Food',
      description: 'Grain-free kibble with real salmon meat to promote skin and coat health.',
      price: 899.0,
      unit: 'bag',
      weightGrams: 1200,
      isOrganic: false,
      isVegetarian: false,
      sku: 'PET-DOG-SLM12',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodDogFood.id, url: 'https://images.unsplash.com/photo-1589723900909-5e3942b355ec?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const dogFoodV1 = await prisma.productVariant.create({
    data: { productId: prodDogFood.id, name: '1.2 kg Bag', price: 899.0, sku: 'PET-DOG-SLM12-1.2', stock: 10 },
  });

  const dogFoodV2 = await prisma.productVariant.create({
    data: { productId: prodDogFood.id, name: '3 kg Family Bag', price: 1999.0, sku: 'PET-DOG-SLM12-3', stock: 4 },
  });

  await prisma.inventory.createMany({
    data: [
      { storeId: store3.id, productId: prodDogFood.id, variantId: dogFoodV1.id, stockQty: 10, lowStockThreshold: 2 },
      { storeId: store3.id, productId: prodDogFood.id, variantId: dogFoodV2.id, stockQty: 4, lowStockThreshold: 1 },
    ],
  });

  // Prod 8: Fast Charger
  const prodCharger = await prisma.product.create({
    data: {
      id: 'prod-charger-1',
      storeId: store1.id,
      categoryId: catElectronics.id,
      name: '20W USB-C PD Fast Charger',
      description: 'High-speed compact power adapter compatible with all major smartphone models.',
      price: 699.0,
      unit: 'piece',
      weightGrams: 100,
      isOrganic: false,
      isVegetarian: false,
      sku: 'ELE-CHG-20W',
      isActive: true,
    },
  });

  await prisma.productImage.create({
    data: { productId: prodCharger.id, url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80', isPrimary: true },
  });

  const chargerV1 = await prisma.productVariant.create({
    data: { productId: prodCharger.id, name: 'Single Adapter Piece', price: 699.0, sku: 'ELE-CHG-20W', stock: 0 },
  });

  await prisma.inventory.create({
    data: { storeId: store1.id, productId: prodCharger.id, variantId: chargerV1.id, stockQty: 0, lowStockThreshold: 5 },
  });

  // 9. Coupons
  console.log('🎟️ Seeding Coupons...');
  const couponWelcome = await prisma.coupon.create({
    data: {
      code: 'WELCOME50',
      type: CouponType.FLAT,
      value: 50.0,
      minOrderValue: 200.0,
      usageLimit: 1,
      expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
    },
  });

  const couponSuper = await prisma.coupon.create({
    data: {
      code: 'SUPER10',
      type: CouponType.PERCENTAGE,
      value: 10.0, // 10%
      minOrderValue: 150.0,
      maxDiscount: 100.0,
      usageLimit: 5,
      expiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      isActive: true,
    },
  });

  // 10. Banners
  console.log('🖼️ Seeding Banners...');
  await prisma.banner.createMany({
    data: [
      {
        title: 'Fresh Fruits Up To 30% Off',
        imageUrl: 'https://images.unsplash.com/photo-1610832958506-ee5633619141?auto=format&fit=crop&w=1000&q=80',
        linkType: LinkType.CATEGORY,
        linkTarget: 'fresh-fruits-and-vegetables',
        isActive: true,
        displayOrder: 1,
      },
      {
        title: 'Daily Essentials Delivery In 10 Mins',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80',
        linkType: LinkType.CATEGORY,
        linkTarget: 'daily-essentials',
        isActive: true,
        displayOrder: 2,
      },
    ],
  });

  // 11. Wishlists & Carts
  console.log('🛒 Seeding Wishlists & Carts...');
  await prisma.wishlist.create({
    data: { customerId: customer1.id, productId: prodMilk.id },
  });

  const cart = await prisma.cart.create({
    data: { customerId: customer1.id, storeId: store1.id },
  });

  await prisma.cartItem.create({
    data: { cartId: cart.id, productId: prodMilk.id, variantId: milkV1.id, quantity: 2 },
  });

  // 12. Wallets & Transactions
  console.log('💳 Seeding Wallets...');
  const wallet1 = await prisma.wallet.create({
    data: { customerId: customer1.id, balance: 150.0 },
  });

  await prisma.walletTransaction.create({
    data: { walletId: wallet1.id, amount: 150.0, type: WalletTxType.CREDIT, description: 'Welcome Sign-up Bonus' },
  });

  const wallet2 = await prisma.wallet.create({
    data: { customerId: customer2.id, balance: 50.0 },
  });

  await prisma.walletTransaction.create({
    data: { walletId: wallet2.id, amount: 50.0, type: WalletTxType.CREDIT, description: 'Welcome Sign-up Bonus' },
  });

  // 13. Orders, Items, Payments & Assignments
  console.log('📦 Seeding Orders & Assignments...');
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20260710-001',
      customerId: customer1.id,
      storeId: store1.id,
      addressId: addr1.id,
      status: OrderStatus.DELIVERED,
      paymentMethod: PaymentMethod.UPI,
      paymentStatus: PaymentStatus.PAID,
      subtotal: 136.0, // 2 milk packets
      tax: 6.8,
      deliveryFee: 15.0,
      handlingFee: 5.0,
      discount: 0.0,
      totalAmount: 162.8,
      deliveryInstruction: 'Leave at the gate',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order1.id,
      productId: prodMilk.id,
      variantId: milkV1.id,
      productName: 'Organic Whole Milk',
      quantity: 2,
      unitPrice: 68.0,
      variantLabel: '500 ml',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    },
  });

  const payment1 = await prisma.payment.create({
    data: {
      orderId: order1.id,
      gatewayOrderId: 'order_pay_12345',
      gatewayPaymentId: 'pay_12345_success',
      amount: 162.8,
      status: PaymentStatus.PAID,
      method: 'UPI',
    },
  });

  await prisma.transaction.create({
    data: {
      paymentId: payment1.id,
      type: TransactionType.CREDIT,
      amount: 162.8,
      status: TransactionStatus.SUCCESS,
      gatewayRef: 'UPI-TXN-987654',
    },
  });

  const assignment1 = await prisma.deliveryAssignment.create({
    data: {
      orderId: order1.id,
      riderId: rider1.id,
      status: DeliveryStatus.DELIVERED,
      pickupOtp: '1234',
      deliveryOtp: '5678',
      acceptedAt: new Date(Date.now() - 110 * 60 * 1000),
      pickedAt: new Date(Date.now() - 100 * 60 * 1000),
      deliveredAt: new Date(Date.now() - 85 * 60 * 1000),
    },
  });

  await prisma.deliveryTracking.createMany({
    data: [
      { assignmentId: assignment1.id, latitude: 12.9355, longitude: 77.6247, speed: 20.0 },
      { assignmentId: assignment1.id, latitude: 12.9345, longitude: 77.6238, speed: 15.5 },
    ],
  });

  // Historic Review
  await prisma.review.create({
    data: {
      customerId: customer1.id,
      productId: prodMilk.id,
      orderId: order1.id,
      rating: 5,
      comment: 'Super fresh and thick! Tastes much better than regular packet milk.',
      isVerified: true,
    },
  });

  // 14. Support Tickets
  console.log('🎫 Seeding Support Tickets...');
  await prisma.supportTicket.create({
    data: {
      userId: customerUser1.id,
      subject: 'Damaged item delivered',
      description: 'The milk packet was leaking when the rider handed it over.',
      status: TicketStatus.OPEN,
      priority: TicketPriority.HIGH,
    },
  });

  // 15. App Settings
  console.log('⚙️ Seeding App Settings...');
  await prisma.appSetting.createMany({
    data: [
      { key: 'platform_commission_percent', value: '10.0', description: 'Default percentage charged to merchants' },
      { key: 'free_delivery_threshold', value: '199.0', description: 'Minimum cart value to waive delivery fee' },
      { key: 'platform_active_surge_fee', value: '0.0', description: 'Active surge fees added to delivery' },
    ],
  });
  // 16. Payouts / Settlements History
  console.log('💰 Seeding Payouts / Settlements...');
  await prisma.payout.create({
    data: {
      merchantId: merchant1.id,
      amount: 8400,
      status: 'SUCCESS',
      createdAt: new Date('2026-07-01T10:00:00Z'),
    },
  });

  await prisma.payout.create({
    data: {
      merchantId: merchant1.id,
      amount: 10050,
      status: 'SUCCESS',
      createdAt: new Date('2026-06-24T10:00:00Z'),
    },
  });

  await prisma.payout.create({
    data: {
      riderId: rider1.id,
      amount: 560,
      status: 'SUCCESS',
      createdAt: new Date('2026-07-12T16:00:00Z'),
    },
  });

  await prisma.payout.create({
    data: {
      riderId: rider1.id,
      amount: 980,
      status: 'SUCCESS',
      createdAt: new Date('2026-07-01T16:00:00Z'),
    },
  });
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

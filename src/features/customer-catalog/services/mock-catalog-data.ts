import type { Product, Category, Store } from '../../../types';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "500g", "1kg"
  price: number;
  weightGrams: number;
  stock: number;
}

export interface ReviewRating {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  isVerifiedPurchase: boolean;
  photos?: string[];
}

export interface EnhancedProduct extends Product {
  rating: number;
  reviewsCount: number;
  isSponsored?: boolean;
  fssaiCode?: string;
  ingredients?: string;
  nutritionalInfo?: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  storageInstructions?: string;
  returnPolicy?: string;
  manufacturerDetails?: string;
  priceHistory?: number[];
  cashbackPoints?: number;
  variantsList?: ProductVariant[];
  reviews?: ReviewRating[];
}

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-daily', name: 'Daily Essentials', slug: 'daily-essentials', imageUrl: '🥛' },
  { id: 'cat-fresh', name: 'Fresh Produce', slug: 'fresh-fruits-and-vegetables', imageUrl: '🍎' },
  { id: 'cat-pharmacy', name: 'Pharmacy', slug: 'pharmacy', imageUrl: '💊' },
  { id: 'cat-personal', name: 'Personal Care', slug: 'personal-care', imageUrl: '🧴' },
  { id: 'cat-pet', name: 'Pet Care', slug: 'pet-care', imageUrl: '🐶' },
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics', imageUrl: '📱' },
];

export const MOCK_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Aether Fresh Market',
    logoUrl: '🥬',
    rating: 4.8,
    deliveryTimeMins: 10,
    address: 'Block 2, Koramangala, Bangalore',
    coordinates: { latitude: 12.9352, longitude: 77.6245 },
    isOpen: true,
    commissionRate: 0.1,
  },
  {
    id: 'store-2',
    name: 'Apollo Pharmacy Express',
    logoUrl: '💊',
    rating: 4.6,
    deliveryTimeMins: 12,
    address: '15th Cross, HSR Layout, Bangalore',
    coordinates: { latitude: 12.9102, longitude: 77.645 },
    isOpen: true,
    commissionRate: 0.08,
  },
  {
    id: 'store-3',
    name: 'Super Pet Stop',
    logoUrl: '🐾',
    rating: 4.7,
    deliveryTimeMins: 15,
    address: 'Indiranagar 80ft Road, Bangalore',
    coordinates: { latitude: 12.9716, longitude: 77.5946 },
    isOpen: true,
    commissionRate: 0.12,
  },
];

export const MOCK_PRODUCTS: EnhancedProduct[] = [
  {
    id: 'prod-milk-1',
    categorySlug: 'daily-essentials',
    name: 'Organic Whole Milk',
    description: 'Fresh organic pasteurized whole cow milk, sourced from local green pasture farms. No added preservatives.',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
    price: 68,
    unit: 'packet',
    weightGrams: 500,
    isOrganic: true,
    isVegetarian: true,
    stock: 25,
    sku: 'MILK-ORG-500',
    rating: 4.7,
    reviewsCount: 142,
    isSponsored: true,
    fssaiCode: '10012011000122',
    ingredients: 'Organic pasteurized cow milk (3.5% fat, 8.5% SNF)',
    nutritionalInfo: { calories: 310, proteinGrams: 16, carbsGrams: 24, fatGrams: 17 },
    storageInstructions: 'Keep refrigerated below 4°C. Consume within 2 days of opening.',
    returnPolicy: 'Non-returnable. Fresh product items are covered under instant refunds if spoiled on delivery.',
    manufacturerDetails: 'Aether Dairy Farms Ltd., Doddaballapur Industrial Area, Bengaluru, KA - 561203',
    priceHistory: [72, 70, 68],
    cashbackPoints: 5,
    variantsList: [
      { id: 'v1', name: '500 ml', price: 68, weightGrams: 500, stock: 25 },
      { id: 'v2', name: '1 Litre', price: 125, weightGrams: 1000, stock: 15 }
    ],
    reviews: [
      { id: 'r1', userName: 'Aravind K.', rating: 5, comment: 'Super fresh and thick! Tastes much better than regular packet milk.', date: '2026-06-25', isVerifiedPurchase: true },
      { id: 'r2', userName: 'Meera Sen', rating: 4, comment: 'Very good quality, but sometimes delivery gets delayed by 5 mins.', date: '2026-06-21', isVerifiedPurchase: true }
    ]
  },
  {
    id: 'prod-bread-1',
    categorySlug: 'daily-essentials',
    name: 'Sourdough Whole Wheat Bread',
    description: 'Artisanal stone-baked whole wheat sourdough bread with high fiber and low glycemic index.',
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=600&q=80',
    price: 95,
    unit: 'loaf',
    weightGrams: 400,
    isOrganic: false,
    isVegetarian: true,
    stock: 12,
    sku: 'BREAD-SDR-400',
    rating: 4.5,
    reviewsCount: 88,
    fssaiCode: '10819005000456',
    ingredients: 'Stoneground whole wheat flour, active wild sourdough starter, purified water, sea salt.',
    nutritionalInfo: { calories: 240, proteinGrams: 9, carbsGrams: 42, fatGrams: 1.5 },
    storageInstructions: 'Store in a cool dry place. Keep wrapped to maintain softness.',
    returnPolicy: '7-day product return policy does not apply. Spoilt/damaged packages eligible for instant replacement.',
    manufacturerDetails: 'Artisan Bakery Co., Indiranagar, Bengaluru, KA - 560038',
    priceHistory: [100, 95, 95],
    cashbackPoints: 8,
    variantsList: [
      { id: 'v3', name: '400g Loaf', price: 95, weightGrams: 400, stock: 12 },
      { id: 'v4', name: '800g Family Loaf', price: 180, weightGrams: 800, stock: 6 }
    ],
    reviews: [
      { id: 'r3', userName: 'Rajesh P.', rating: 5, comment: 'Amazing crust and perfect sourdough tang. Reminds me of European cafes.', date: '2026-06-28', isVerifiedPurchase: true }
    ]
  },
  {
    id: 'prod-apple-1',
    categorySlug: 'fresh-fruits-and-vegetables',
    name: 'Royal Gala Apples',
    description: 'Crisp, sweet, and juicy gala apples imported from Himachal orchards. Rich in antioxidants.',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80',
    price: 180,
    unit: 'pack',
    weightGrams: 1000,
    isOrganic: true,
    isVegetarian: true,
    stock: 15,
    sku: 'FRT-APL-GALA',
    rating: 4.8,
    reviewsCount: 320,
    isSponsored: true,
    fssaiCode: '10018022000889',
    ingredients: 'Fresh royal gala apples.',
    nutritionalInfo: { calories: 95, proteinGrams: 0.5, carbsGrams: 25, fatGrams: 0.3 },
    storageInstructions: 'For maximum crispness, store in the vegetable crisper compartment of your refrigerator.',
    returnPolicy: 'Instant refund if fresh fruits show physical damage on arrival.',
    manufacturerDetails: 'Himachal Growers Cooperatives, Shimla, HP - 171001',
    priceHistory: [200, 190, 180],
    cashbackPoints: 10,
    variantsList: [
      { id: 'v5', name: '1 kg Pack', price: 180, weightGrams: 1000, stock: 15 },
      { id: 'v6', name: '500g Pack', price: 95, weightGrams: 500, stock: 30 }
    ],
    reviews: [
      { id: 'r4', userName: 'Sanjay Dutt', rating: 5, comment: 'Super crisp, sweet and no wax coating. 10/10.', date: '2026-06-29', isVerifiedPurchase: true }
    ]
  },
  {
    id: 'prod-avocado-1',
    categorySlug: 'fresh-fruits-and-vegetables',
    name: 'Organic Hass Avocados',
    description: 'Rich, creamy Hass avocados loaded with healthy monounsaturated fats and potassium.',
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80',
    price: 240,
    unit: 'pack',
    weightGrams: 500,
    isOrganic: true,
    isVegetarian: true,
    stock: 4, // Live stock status warning test case (Only 4 left)
    sku: 'FRT-AVO-HASS',
    rating: 4.6,
    reviewsCount: 204,
    fssaiCode: '10019011000451',
    ingredients: 'Organic raw Hass avocados.',
    nutritionalInfo: { calories: 160, proteinGrams: 2, carbsGrams: 8.5, fatGrams: 14.7 },
    storageInstructions: 'Ripen at room temperature. Once ripe, store in refrigerator.',
    returnPolicy: 'Refunds accepted if delivered overripe or damaged.',
    manufacturerDetails: 'Grown and packed by Nature Fresh Farms, Ooty, TN - 643001',
    priceHistory: [280, 260, 240],
    cashbackPoints: 15,
    variantsList: [
      { id: 'v7', name: '500g (2-3 Pieces)', price: 240, weightGrams: 500, stock: 4 }
    ],
    reviews: [
      { id: 'r5', userName: 'Kavitha R.', rating: 4, comment: 'Creamy and soft, great for guacamole. One piece was slightly raw but ripened in 2 days.', date: '2026-06-27', isVerifiedPurchase: true }
    ]
  },
  {
    id: 'prod-vitamin-c',
    categorySlug: 'pharmacy',
    name: 'Vitamin C 500mg Chewable',
    description: 'Immunity boosting vitamin C supplement to aid general health and energy levels.',
    imageUrl: 'https://images.unsplash.com/photo-1616679911721-eff6eec18fcd?auto=format&fit=crop&w=600&q=80',
    price: 120,
    unit: 'strip',
    weightGrams: 50,
    isOrganic: false,
    isVegetarian: true,
    stock: 50,
    sku: 'MED-VIT-C500',
    rating: 4.4,
    reviewsCount: 72,
    ingredients: 'Ascorbic acid 500mg, orange flavor stabilizers.',
    storageInstructions: 'Store in a cool dry place away from direct sunlight.',
    returnPolicy: 'Eligible for return only if seal is intact.',
    manufacturerDetails: 'Aether Wellness Labs, HSR Layout, Bengaluru, KA - 560102',
    priceHistory: [120, 120, 120],
    cashbackPoints: 6,
    variantsList: [
      { id: 'v8', name: '15 Tablets Strip', price: 120, weightGrams: 50, stock: 50 }
    ],
    reviews: [
      { id: 'r6', userName: 'Nikhil G.', rating: 4, comment: 'Tasty orange flavor, helps keep daily immunity in check.', date: '2026-06-24', isVerifiedPurchase: true }
    ]
  },
  {
    id: 'prod-shampoo-1',
    categorySlug: 'personal-care',
    name: 'Tea Tree Cleansing Shampoo',
    description: 'Anti-dandruff sulfate-free tea tree oil shampoo for clean, refreshed hair.',
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
    price: 349,
    unit: 'bottle',
    weightGrams: 300,
    isOrganic: true,
    isVegetarian: true,
    stock: 20,
    sku: 'PC-SHM-TT300',
    rating: 4.3,
    reviewsCount: 56,
    ingredients: 'Pure tea tree extract, aloe vera leaf juice, organic surfactant base.',
    storageInstructions: 'Store in cool shower cabinets. Avoid contact with eyes.',
    returnPolicy: 'Non-returnable once opened.',
    manufacturerDetails: 'Organix Care Pvt. Ltd., Electronic City, Bengaluru, KA - 560100',
    priceHistory: [380, 360, 349],
    cashbackPoints: 12,
    variantsList: [
      { id: 'v9', name: '300 ml Bottle', price: 349, weightGrams: 300, stock: 20 }
    ]
  },
  {
    id: 'prod-dog-food',
    categorySlug: 'pet-care',
    name: 'Premium Salmon Dog Food',
    description: 'Grain-free kibble with real salmon meat to promote skin and coat health.',
    imageUrl: 'https://images.unsplash.com/photo-1589723900909-5e3942b355ec?auto=format&fit=crop&w=600&q=80',
    price: 899,
    unit: 'bag',
    weightGrams: 1200,
    isOrganic: false,
    isVegetarian: false,
    stock: 10,
    sku: 'PET-DOG-SLM12',
    rating: 4.9,
    reviewsCount: 110,
    ingredients: 'Deboned salmon, sweet potatoes, peas, rosemary extracts, vitamin premixes.',
    storageInstructions: 'Store in airtight containers to preserve crunch and freshness.',
    returnPolicy: 'Returnable within 7 days if dog rejects the taste.',
    manufacturerDetails: 'Pet Nutrition Inc., Global Logistics Park, Chennai, TN - 600110',
    priceHistory: [999, 950, 899],
    cashbackPoints: 40,
    variantsList: [
      { id: 'v10', name: '1.2 kg Bag', price: 899, weightGrams: 1200, stock: 10 },
      { id: 'v11', name: '3 kg Family Bag', price: 1999, weightGrams: 3000, stock: 4 }
    ]
  },
  {
    id: 'prod-charger-1',
    categorySlug: 'electronics',
    name: '20W USB-C PD Fast Charger',
    description: 'High-speed compact power adapter compatible with all major smartphone models.',
    imageUrl: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80',
    price: 699,
    unit: 'piece',
    weightGrams: 100,
    isOrganic: false,
    isVegetarian: false,
    stock: 0, // Lock / out of stock to simulate expansion
    sku: 'ELE-CHG-20W',
    rating: 4.2,
    reviewsCount: 38,
    ingredients: 'Polycarbonate body, copper plugs, semiconductor controller.',
    storageInstructions: 'Keep dry. Do not overload current grids.',
    returnPolicy: '1-year product warranty. 10-day replacement support.',
    manufacturerDetails: 'Aether Electronic Corp, Shenzhen, CN',
    priceHistory: [799, 699, 699],
    cashbackPoints: 20,
    variantsList: [
      { id: 'v12', name: 'Single Adapter Piece', price: 699, weightGrams: 100, stock: 0 }
    ]
  }
];

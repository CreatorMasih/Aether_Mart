import type { OrderStatus, UserRole } from '../core/config/constants';
export type { OrderStatus, UserRole };

// ─── Payment Method (must match backend Prisma enum exactly) ─────────────────
export type PaymentMethod = 'COD' | 'WALLET' | 'RAZORPAY';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface Address {
  id: string;
  label: AddressLabel;
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  apartmentSuite?: string;
  houseNumber?: string;
  landmark?: string;
  postalCode: string;
  city: string;
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: GeoCoordinates;
  isDefault?: boolean;
  isServiceable?: boolean;
}

export type LocationSelectionType = 'SAVED' | 'GPS' | 'SEARCH' | 'PRESET';

export interface CustomerLocation {
  id: string;
  selectionType: LocationSelectionType;
  label: string;
  savedLabel?: AddressLabel;
  receiverName?: string;
  receiverPhone?: string;
  streetAddress: string;
  apartmentSuite?: string;
  postalCode: string;
  city: string;
  district?: string;
  state?: string;
  coordinates?: GeoCoordinates;
  isServiceable: boolean;
}

export type SelectedLocation = CustomerLocation | Address;

export interface User {
  id: string;
  phone: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  walletBalance: number;
  savedAddresses: Address[];
}

export interface ProductVariant {
  id: string;
  name: string;      // E.g., "500g", "1kg"
  price: number;
  stock: number;
  sku: string;
  weightGrams?: number;
}

export interface Product {
  id: string;
  categorySlug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  discountPrice?: number;
  unit: string;
  weightGrams?: number;
  isOrganic?: boolean;
  isVegetarian?: boolean;
  calories?: number;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
  stock: number;
  variants?: ProductVariant[];
  sku: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  itemCount?: number;
}

export interface Store {
  id: string;
  name: string;
  logoUrl: string;
  coverImageUrl?: string;
  category?: string;
  bannerUrl?: string;
  rating: number;
  deliveryTimeMins: number;
  address: string;
  coordinates: GeoCoordinates;
  isOpen: boolean;
  isPaused?: boolean;
  isHoliday?: boolean;
  openingTime?: string;
  closingTime?: string;
  deliveryFee?: number;
  minOrderValue?: number;
  deliveryRadiusKm?: number;
  distance?: number;
  commissionRate: number;
}

export interface CartItem {
  product: Product;
  selectedVariantId?: string; // If undefined, applies to baseline product
  quantity: number;
}

export interface DeliverySlot {
  id: string;
  label: string;      // E.g., "Instant (10-15 mins)", "7:00 PM - 8:00 PM"
  price: number;
  isAvailable: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantLabel?: string;
  imageUrl: string;
}

export interface Order {
  id: string;
  customerId: string;
  storeId: string;
  items: OrderItem[];
  status: OrderStatus;
  deliveryAddress: Address;
  deliveryInstructionId?: string;
  paymentMethod: 'UPI' | 'CARD' | 'COD';
  deliveryFee: number;
  handlingFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  createdAt: string;
  riderId?: string;
  riderLocation?: GeoCoordinates;
  estimatedDeliveryTime?: string;
}

export interface Rider {
  id: string;
  fullName: string;
  phone: string;
  vehicleType: 'BICYCLE' | 'MOTORBIKE';
  vehiclePlateNumber?: string;
  isOnline: boolean;
  currentCoordinates?: GeoCoordinates;
  rating: number;
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

// ─── Cart (Backend-driven, single source of truth) ────────────────────────────

export interface CartItemData {
  productId: string;
  variantId: string | null;
  quantity: number;
  name: string;
  imageUrl: string;
  price: number;
  total: number;
  variantName: string | null;
}

export interface CartStoreInfo {
  id: string;
  name: string;
  rating: number;
}

export interface CouponApplied {
  id: string;
  code: string;
  discount: number;
}

export interface CartData {
  id: string | null;
  store: CartStoreInfo | null;
  items: CartItemData[];
  subtotal: number;
  discount: number;
  tax: number;
  packagingFee: number;
  handlingFee: number;
  deliveryFee: number;
  surgeFee: number;
  driverTip: number;
  ecoPackaging: boolean;
  totalAmount: number;
  coupon: CouponApplied | null;
}

export interface PricingData {
  store: CartStoreInfo | null;
  items: CartItemData[];
  subtotal: number;
  discount: number;
  tax: number;
  packagingFee: number;
  handlingFee: number;
  deliveryFee: number;
  surgeFee: number;
  driverTip: number;
  ecoPackaging: boolean;
  totalWeightGrams: number;
  totalAmount: number;
  coupon: CouponApplied | null;
}

export interface CouponValidation {
  code: string;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  maxDiscount: number | null;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface OrderItemData {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variantLabel: string | null;
  imageUrl: string;
}

export interface OrderData {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  storeName: string;
  distanceToStoreKm?: number;
  store?: {
    id: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
  } | null;
  items: OrderItemData[];
  status: OrderStatus;
  deliveryAddress: Address;
  deliveryAssignment?: {
    id?: string;
    status?: string;
    pickupOtp?: string;
    deliveryOtp?: string;
    lastLatitude?: number;
    lastLongitude?: number;
    rider?: {
      id?: string;
      fullName?: string;
      phone?: string;
      vehicleType?: string;
      vehiclePlateNumber?: string;
      currentLatitude?: number;
      currentLongitude?: number;
      isOnline?: boolean;
    } | null;
  } | null;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment?: { id: string; status: string; gatewayOrderId?: string | null } | null;
  deliveryFee: number;
  packagingFee: number;
  handlingFee: number;
  tax: number;
  discount: number;
  driverTip: number;
  totalAmount: number;
  createdAt: string;
  riderId: string | null;
  riderLocation: GeoCoordinates | null;
  estimatedDeliveryTime: string | null;
}

export interface PayoutData {
  id: string;
  date: string;
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export interface MerchantDashboardStats {
  totalRevenue: number;
  completedOrdersCount: number;
  activeOrdersCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  chartData: Array<{ label: string; val: number }>;
}

export interface RiderEarningsData {
  balance: number;
  todayEarnings: number;
  todayCompletedCount?: number;
  completedCount: number;
  rating: number;
  payoutHistory: PayoutData[];
}


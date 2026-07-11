import type { OrderStatus, UserRole } from '../core/config/constants';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  receiverName: string;
  receiverPhone: string;
  streetAddress: string;
  apartmentSuite?: string;
  postalCode: string;
  city: string;
  coordinates: GeoCoordinates;
}

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
}

export interface Product {
  id: string;
  categorySlug: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
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
  bannerUrl?: string;
  rating: number;
  deliveryTimeMins: number;
  address: string;
  coordinates: GeoCoordinates;
  isOpen: boolean;
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

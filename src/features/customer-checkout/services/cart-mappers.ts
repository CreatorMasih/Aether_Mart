/**
 * Cart Mappers — all DTO → frontend model transformations.
 * Components never see raw backend shapes.
 */
import type {
  CartData,
  CartItemData,
  CartStoreInfo,
  CouponApplied,
  PricingData,
  CouponValidation,
  OrderData,
  OrderItemData,
  Address,
  GeoCoordinates,
  PaymentMethod,
  OrderStatus,
} from '../../../types';

// ─── Backend DTO shapes (private to this module) ──────────────────────────────

interface BackendCartItem {
  productId?: string;
  variantId?: string | null;
  quantity?: number;
  name?: string;
  imageUrl?: string;
  price?: number;
  total?: number;
  variantName?: string | null;
}

interface BackendStoreInfo {
  id?: string;
  name?: string;
  rating?: number;
}

interface BackendCouponApplied {
  id?: string;
  code?: string;
  discount?: number;
}

interface BackendCartDto {
  id?: string | null;
  store?: BackendStoreInfo | null;
  items?: BackendCartItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  packagingFee?: number;
  handlingFee?: number;
  deliveryFee?: number;
  surgeFee?: number;
  driverTip?: number;
  ecoPackaging?: boolean;
  totalAmount?: number;
  coupon?: BackendCouponApplied | null;
}

interface BackendPricingDto extends BackendCartDto {
  totalWeightGrams?: number;
}

interface BackendCouponDto {
  code?: string;
  type?: string;
  value?: number;
  maxDiscount?: number | null;
}

interface BackendAddressDto {
  id?: string;
  label?: string;
  receiverName?: string;
  receiverPhone?: string;
  streetAddress?: string;
  apartmentSuite?: string;
  postalCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface BackendOrderItem {
  productId?: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  variantLabel?: string | null;
  imageUrl?: string;
}

interface BackendOrderDto {
  id?: string;
  orderNumber?: string;
  customerId?: string;
  storeId?: string;
  store?: { name?: string };
  items?: BackendOrderItem[];
  status?: string;
  deliveryAddress?: BackendAddressDto;
  paymentMethod?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payment?: { id: string; status: string; gatewayOrderId?: string | null } | null;
  deliveryFee?: number;
  packagingFee?: number;
  handlingFee?: number;
  tax?: number;
  discount?: number;
  driverTip?: number;
  totalAmount?: number;
  createdAt?: string;
  riderId?: string | null;
  riderLatitude?: number | null;
  riderLongitude?: number | null;
  estimatedDeliveryTime?: string | null;
}

// ─── Default values ───────────────────────────────────────────────────────────

const EMPTY_CART: CartData = {
  id: null,
  store: null,
  items: [],
  subtotal: 0,
  discount: 0,
  tax: 0,
  packagingFee: 0,
  handlingFee: 0,
  deliveryFee: 0,
  surgeFee: 0,
  driverTip: 0,
  ecoPackaging: false,
  totalAmount: 0,
  coupon: null,
};

// ─── Mapper functions ─────────────────────────────────────────────────────────

function mapCartItem(dto: BackendCartItem): CartItemData {
  return {
    productId: dto.productId ?? '',
    variantId: dto.variantId ?? null,
    quantity: dto.quantity ?? 1,
    name: dto.name ?? '',
    imageUrl:
      dto.imageUrl ||
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    price: dto.price ?? 0,
    total: dto.total ?? 0,
    variantName: dto.variantName ?? null,
  };
}

function mapStoreInfo(dto: BackendStoreInfo | null | undefined): CartStoreInfo | null {
  if (!dto) return null;
  return {
    id: dto.id ?? '',
    name: dto.name ?? '',
    rating: dto.rating ?? 5.0,
  };
}

function mapCouponApplied(dto: BackendCouponApplied | null | undefined): CouponApplied | null {
  if (!dto || !dto.code) return null;
  return {
    id: dto.id ?? '',
    code: dto.code,
    discount: dto.discount ?? 0,
  };
}

/**
 * Maps a backend cart response DTO to the frontend CartData model.
 */
export function mapCartDto(dto: BackendCartDto | null | undefined): CartData {
  if (!dto) return EMPTY_CART;

  return {
    id: dto.id ?? null,
    store: mapStoreInfo(dto.store),
    items: (dto.items ?? []).map(mapCartItem),
    subtotal: dto.subtotal ?? 0,
    discount: dto.discount ?? 0,
    tax: dto.tax ?? 0,
    packagingFee: dto.packagingFee ?? 0,
    handlingFee: dto.handlingFee ?? 0,
    deliveryFee: dto.deliveryFee ?? 0,
    surgeFee: dto.surgeFee ?? 0,
    driverTip: dto.driverTip ?? 0,
    ecoPackaging: dto.ecoPackaging ?? false,
    totalAmount: dto.totalAmount ?? 0,
    coupon: mapCouponApplied(dto.coupon),
  };
}

/**
 * Maps a backend pricing/recalculate DTO to the frontend PricingData model.
 */
export function mapPricingDto(dto: BackendPricingDto | null | undefined): PricingData {
  if (!dto) {
    return {
      ...EMPTY_CART,
      totalWeightGrams: 0,
    };
  }

  return {
    store: mapStoreInfo(dto.store),
    items: (dto.items ?? []).map(mapCartItem),
    subtotal: dto.subtotal ?? 0,
    discount: dto.discount ?? 0,
    tax: dto.tax ?? 0,
    packagingFee: dto.packagingFee ?? 0,
    handlingFee: dto.handlingFee ?? 0,
    deliveryFee: dto.deliveryFee ?? 0,
    surgeFee: dto.surgeFee ?? 0,
    driverTip: dto.driverTip ?? 0,
    ecoPackaging: dto.ecoPackaging ?? false,
    totalWeightGrams: dto.totalWeightGrams ?? 0,
    totalAmount: dto.totalAmount ?? 0,
    coupon: mapCouponApplied(dto.coupon),
  };
}

/**
 * Maps a backend coupon validation DTO.
 */
export function mapCouponDto(dto: BackendCouponDto | null | undefined): CouponValidation {
  return {
    code: dto?.code ?? '',
    type: (dto?.type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT') as CouponValidation['type'],
    value: dto?.value ?? 0,
    maxDiscount: dto?.maxDiscount ?? null,
  };
}

/**
 * Maps a backend address DTO to the frontend Address interface.
 */
export function mapAddressDto(dto: BackendAddressDto | null | undefined): Address {
  return {
    id: dto?.id ?? '',
    label: (dto?.label as Address['label']) ?? 'Other',
    receiverName: dto?.receiverName ?? '',
    receiverPhone: dto?.receiverPhone ?? '',
    streetAddress: dto?.streetAddress ?? '',
    apartmentSuite: dto?.apartmentSuite,
    postalCode: dto?.postalCode ?? '',
    city: dto?.city ?? '',
    coordinates: {
      latitude: dto?.latitude ?? 0,
      longitude: dto?.longitude ?? 0,
    },
  };
}

/**
 * Maps a backend order DTO to the frontend OrderData model.
 */
export function mapOrderDto(dto: BackendOrderDto | null | undefined): OrderData {
  return {
    id: dto?.id ?? '',
    orderNumber: dto?.orderNumber ?? dto?.id?.substring(0, 8).toUpperCase() ?? '',
    customerId: dto?.customerId ?? '',
    storeId: dto?.storeId ?? '',
    storeName: dto?.store?.name ?? 'Aether Mart',
    items: (dto?.items ?? []).map(
      (item): OrderItemData => ({
        productId: item.productId ?? '',
        productName: item.productName ?? '',
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? 0,
        total: item.total ?? 0,
        variantLabel: item.variantLabel ?? null,
        imageUrl:
          item.imageUrl ||
          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80',
      }),
    ),
    status: (dto?.status ?? 'PLACED') as OrderStatus,
    deliveryAddress: mapAddressDto(dto?.deliveryAddress),
    paymentMethod: (dto?.paymentMethod ?? 'COD') as PaymentMethod,
    paymentStatus: dto?.paymentStatus,
    payment: dto?.payment ? {
      id: dto.payment.id,
      status: dto.payment.status,
      gatewayOrderId: dto.payment.gatewayOrderId ?? null,
    } : null,
    deliveryFee: dto?.deliveryFee ?? 0,
    packagingFee: dto?.packagingFee ?? 0,
    handlingFee: dto?.handlingFee ?? 0,
    tax: dto?.tax ?? 0,
    discount: dto?.discount ?? 0,
    driverTip: dto?.driverTip ?? 0,
    totalAmount: dto?.totalAmount ?? 0,
    createdAt: dto?.createdAt ?? new Date().toISOString(),
    riderId: dto?.riderId ?? null,
    riderLocation:
      dto?.riderLatitude != null && dto?.riderLongitude != null
        ? ({ latitude: dto.riderLatitude, longitude: dto.riderLongitude } as GeoCoordinates)
        : null,
    estimatedDeliveryTime: dto?.estimatedDeliveryTime ?? null,
  };
}

/**
 * Maps an array of order DTOs.
 */
export function mapOrderListDto(dtos: unknown[]): OrderData[] {
  return dtos.map((dto) => mapOrderDto(dto as BackendOrderDto));
}

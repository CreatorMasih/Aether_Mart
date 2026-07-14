import type { Product, Category, Store, ReviewRating, ProductVariant } from '../../../types';

// ─── Backend DTO shapes ───────────────────────────────────────────────────────

interface BackendProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string;
  weightGrams?: number;
}

interface BackendNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface BackendStore {
  id: string;
  name: string;
  rating?: number;
  deliveryTime?: number;
  deliveryTimeMins?: number;
  distance?: number;
}

interface BackendProductDto {
  id?: string;
  sku?: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  unit?: string;
  weightGrams?: number;
  isOrganic?: boolean;
  isVegetarian?: boolean;
  nutrition?: BackendNutrition;
  totalStock?: number;
  stock?: number;
  variants?: BackendProductVariant[];
  category?: { slug?: string };
  categorySlug?: string;
  fssaiCode?: string;
  brand?: string;
  discountPrice?: number;
  gallery?: string[];
  inStock?: boolean;
  store?: BackendStore;
  rating?: number;
  reviewCount?: number;
}

interface BackendCategoryDto {
  id?: string;
  slug?: string;
  name?: string;
  imageUrl?: string;
  itemCount?: number;
}

interface BackendBannerDto {
  id?: string;
  title?: string;
  imageUrl?: string;
  linkType?: string;
  linkTarget?: string;
}

interface BackendStoreDto {
  id?: string;
  name?: string;
  logoUrl?: string;
  bannerUrl?: string;
  rating?: number;
  deliveryTime?: number;
  deliveryTimeMins?: number;
  address?: string;
  coordinates?: { latitude?: number; longitude?: number };
  isOpen?: boolean;
  commissionRate?: number;
}

interface BackendReviewDto {
  id?: string;
  customerName?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  images?: string[];
}

// ─── Extended Product type for catalog-specific fields ──────────────────────

export interface CatalogProduct extends Product {
  fssaiCode?: string;
  brand?: string;
  discountPrice?: number;
  gallery?: string[];
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  storeInfo?: {
    id: string;
    name: string;
    rating: number;
    deliveryTime: number;
  };
}

// ─── Banner type ─────────────────────────────────────────────────────────────

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkType: string;
  linkTarget: string;
  subtitle: string;
  badge: string;
  bgGradient: string;
  textColor: string;
}

// ─── Fallback Placeholders ───────────────────────────────────────────────────

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

const PRESET_GRADIENTS = [
  'from-emerald-500/20 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/20 border-emerald-500/20',
  'from-violet-500/20 to-fuchsia-500/10 dark:from-violet-950/40 dark:to-fuchsia-950/20 border-violet-500/20',
  'from-amber-500/20 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/20 border-amber-500/20',
] as const;

const PRESET_TEXT_COLORS = [
  'text-emerald-500',
  'text-brand-violet',
  'text-amber-500',
] as const;

const PRESET_BADGES = [
  'FRESH DEALS',
  'HEALTH & ESSENTIALS',
  'DAILY SAVERS',
] as const;

// ─── Mapper Functions ─────────────────────────────────────────────────────────

/**
 * Maps a backend product DTO to the unified frontend CatalogProduct model.
 * All field normalisations live here — components never see raw DTO shapes.
 */
export function mapProductDto(dto: BackendProductDto): CatalogProduct {
  const nutrition = dto.nutrition ?? {};

  const totalStock =
    dto.totalStock !== undefined
      ? dto.totalStock
      : (dto.variants?.reduce((acc, v) => acc + (v.stock ?? 0), 0) ?? dto.stock ?? 0);

  const variants: ProductVariant[] = (dto.variants ?? []).map(
    (v): ProductVariant => ({
      id: v.id,
      name: v.name,
      price: v.price,
      stock: v.stock ?? 0,
      sku: v.sku ?? '',
    }),
  );

  return {
    // Core Product fields
    id: dto.id ?? '',
    categorySlug: dto.category?.slug ?? dto.categorySlug ?? 'grocery',
    name: dto.name ?? '',
    description: dto.description ?? '',
    imageUrl: dto.imageUrl || DEFAULT_PRODUCT_IMAGE,
    price: dto.price ?? 0,
    unit: dto.unit ?? 'piece',
    weightGrams: dto.weightGrams,
    isOrganic: dto.isOrganic ?? false,
    isVegetarian: dto.isVegetarian ?? false,
    calories: nutrition.calories,
    proteinGrams: nutrition.protein,
    carbGrams: nutrition.carbs,
    fatGrams: nutrition.fat,
    stock: totalStock,
    variants: variants.length > 0 ? variants : undefined,
    sku: dto.sku ?? '',

    // Extended CatalogProduct fields
    fssaiCode: dto.fssaiCode,
    brand: dto.brand,
    discountPrice: dto.discountPrice,
    gallery:
      (dto.gallery?.length ?? 0) > 0
        ? (dto.gallery as string[])
        : [dto.imageUrl || DEFAULT_PRODUCT_IMAGE],
    inStock:
      dto.inStock !== undefined ? dto.inStock : totalStock > 0,
    rating: dto.rating,
    reviewCount: dto.reviewCount,
    storeInfo: dto.store
      ? {
          id: dto.store.id,
          name: dto.store.name,
          rating: dto.store.rating ?? 5.0,
          deliveryTime:
            dto.store.deliveryTime ?? dto.store.deliveryTimeMins ?? 10,
        }
      : undefined,
  };
}

/**
 * Maps a backend category DTO to the frontend Category model.
 */
export function mapCategoryDto(dto: BackendCategoryDto): Category {
  return {
    id: dto.id ?? '',
    slug: dto.slug ?? '',
    name: dto.name ?? '',
    imageUrl: dto.imageUrl ?? '📦',
    itemCount: dto.itemCount,
  };
}

/**
 * Maps a backend banner DTO to a styled Banner with gradient presets.
 * The index is used to cycle through the visual presets.
 */
export function mapBannerDto(dto: BackendBannerDto, index: number): Banner {
  const i = index % PRESET_GRADIENTS.length;
  return {
    id: dto.id ?? `banner-${index}`,
    title: dto.title ?? '',
    imageUrl: dto.imageUrl ?? '',
    linkType: dto.linkType ?? 'EXTERNAL',
    linkTarget: dto.linkTarget ?? '',
    subtitle:
      dto.linkType === 'EXTERNAL'
        ? 'Click to visit external partner link'
        : 'Delivered to your doorstep in 10 minutes',
    badge: PRESET_BADGES[i],
    bgGradient: PRESET_GRADIENTS[i],
    textColor: PRESET_TEXT_COLORS[i],
  };
}

/**
 * Maps a backend store DTO to the frontend Store model.
 */
export function mapStoreDto(dto: BackendStoreDto): Store {
  return {
    id: dto.id ?? '',
    name: dto.name ?? '',
    logoUrl: dto.logoUrl ?? '🏪',
    bannerUrl: dto.bannerUrl,
    rating: dto.rating ?? 5.0,
    deliveryTimeMins: dto.deliveryTime ?? dto.deliveryTimeMins ?? 10,
    address: dto.address ?? '',
    coordinates: {
      latitude: dto.coordinates?.latitude ?? 0,
      longitude: dto.coordinates?.longitude ?? 0,
    },
    isOpen: dto.isOpen !== undefined ? dto.isOpen : true,
    commissionRate: dto.commissionRate ?? 0,
  };
}

/**
 * Maps a backend review DTO to the frontend ReviewRating model.
 */
export function mapReviewDto(dto: BackendReviewDto): ReviewRating {
  return {
    id: dto.id ?? '',
    userName: dto.customerName ?? 'Anonymous User',
    rating: dto.rating ?? 5,
    comment: dto.comment ?? '',
    date: dto.createdAt
      ? new Date(dto.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Recently',
    isVerifiedPurchase: true,
    photos: dto.images ?? [],
  };
}

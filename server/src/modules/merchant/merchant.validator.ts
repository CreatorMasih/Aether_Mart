import { z } from 'zod';

export const updateMerchantProfileSchema = z.object({
  fullName: z.string().optional(),
  ownerName: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  storeName: z.string().optional(),
  name: z.string().optional(),
  storeAddress: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  deliveryRadiusKm: z.number().min(0.1).max(100).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  isOpen: z.boolean().optional(),
  isPaused: z.boolean().optional(),
  isHoliday: z.boolean().optional(),
  minimumOrderValue: z.number().min(0).optional(),
  deliveryFee: z.number().min(0).optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  upiId: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  businessType: z.string().optional(),
});

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Variant name required'),
  price: z.number().min(0, 'Price must be positive'),
  sku: z.string().min(1, 'SKU is required'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  version: z.number().int().nonnegative().optional().default(0),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  mrp: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  isVeg: z.boolean().optional().default(true),
  isVegetarian: z.boolean().optional().default(true),
  isOrganic: z.boolean().optional().default(false),
  categoryId: z.string().min(1, 'Category ID is required'),
  weightGrams: z.number().int().min(0).optional(),
  images: z
    .array(
      z.object({
        url: z.string().min(1, 'Image URL or Data string is required'),
        angle: z.string().optional(),
        isPrimary: z.boolean().optional().default(false),
      })
    )
    .optional(),
  variants: z.array(productVariantInputSchema).min(1, 'At least one variant is required'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  mrp: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  isVeg: z.boolean().optional(),
  isVegetarian: z.boolean().optional(),
  isOrganic: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
  weightGrams: z.number().int().min(0).optional(),
  images: z
    .array(
      z.object({
        url: z.string().min(1),
        angle: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).optional(),
        price: z.number().min(0).optional(),
        sku: z.string().min(1).optional(),
        stock: z.number().int().min(0).optional(),
        version: z.number().int().nonnegative().optional(),
      })
    )
    .optional(),
});

export const updateInventorySchema = z.object({
  stockQty: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  version: z.number().int().nonnegative(),
});

export const assignRiderSchema = z.object({
  strategy: z.enum(['MANUAL', 'AUTOMATIC']),
  riderId: z.string().uuid().optional(),
});

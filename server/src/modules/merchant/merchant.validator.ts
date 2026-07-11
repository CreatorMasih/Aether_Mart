import { z } from 'zod';

export const updateMerchantProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
  storeName: z.string().min(1, 'Store name is required').optional(),
  storeAddress: z.string().min(1, 'Store address is required').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  deliveryRadiusKm: z.number().min(0.1).max(50).optional(),
  openingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:MM format').optional(),
  closingTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Must be in HH:MM format').optional(),
  isHoliday: z.boolean().optional(),
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
  isVeg: z.boolean().optional().default(true),
  isOrganic: z.boolean().optional().default(false),
  categoryId: z.string().min(1, 'Category ID is required'),
  weightGrams: z.number().int().min(0).optional(),
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    isPrimary: z.boolean().optional().default(false),
  })).optional(),
  variants: z.array(productVariantInputSchema).min(1, 'At least one variant is required'),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  brand: z.string().optional(),
  isVeg: z.boolean().optional(),
  isOrganic: z.boolean().optional(),
  categoryId: z.string().min(1).optional(),
  weightGrams: z.number().int().min(0).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  variants: z.array(z.object({
    id: z.string().uuid().optional(), // If provided, update variant. If not, create new one.
    name: z.string().min(1).optional(),
    price: z.number().min(0).optional(),
    sku: z.string().min(1).optional(),
    stock: z.number().int().min(0).optional(),
    version: z.number().int().nonnegative().optional(), // Optimistic concurrency token
  })).optional(),
});

export const updateInventorySchema = z.object({
  stockQty: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  version: z.number().int().nonnegative(), // Optimistic concurrency check token
});

export const assignRiderSchema = z.object({
  strategy: z.enum(['MANUAL', 'AUTOMATIC']),
  riderId: z.string().uuid().optional(), // Required if strategy is MANUAL
});

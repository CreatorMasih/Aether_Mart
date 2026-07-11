import { z } from 'zod';

export const cartItemAddSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const cartItemUpdateSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
});

export const recalculateCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1),
  })).min(1, 'Cart items are required'),
  couponCode: z.string().optional(),
  driverTip: z.number().min(0).optional().default(0),
  ecoPackaging: z.boolean().optional().default(false),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
});

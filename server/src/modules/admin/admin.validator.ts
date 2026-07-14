import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'BLOCKED', 'SUSPENDED']),
});

export const approveMerchantSchema = z.object({
  approve: z.boolean(),
});

export const approveRiderSchema = z.object({
  approve: z.boolean(),
});

export const moderateProductSchema = z.object({
  isActive: z.boolean(),
});

export const createBannerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  imageUrl: z.string().url('Invalid image URL'),
  linkType: z.enum(['CATEGORY', 'PRODUCT', 'STORE', 'EXTERNAL']),
  linkTarget: z.string().min(1, 'Link target is required'),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().optional().default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const createCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  type: z.enum(['FLAT', 'PERCENTAGE']),
  value: z.number().min(0, 'Value must be positive'),
  minOrderValue: z.number().min(0).optional().default(0.0),
  maxDiscount: z.number().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().default(1),
  expiry: z.string().datetime('Expiry must be a valid ISO datetime'),
  isActive: z.boolean().optional().default(true),
});

export const updateCouponSchema = createCouponSchema.partial();

export const bulkSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string(),
      description: z.string().optional(),
    })
  ).min(1, 'Settings array cannot be empty'),
});

export const updateCommissionSchema = z.object({
  commissionRate: z.number().min(0, 'Commission must be positive').max(100, 'Commission cannot exceed 100%'),
});

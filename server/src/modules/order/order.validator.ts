import { z } from 'zod';
import { PaymentMethod, OrderStatus } from '@prisma/client';

export const placeOrderSchema = z.object({
  addressId: z.string().min(1, 'Address ID is required'),
  paymentMethod: z.enum(['COD', 'WALLET', 'RAZORPAY', 'UPI', 'CARD']),
  couponCode: z.string().optional(),
  driverTip: z.number().min(0).optional().default(0),
  ecoPackaging: z.boolean().optional().default(false),
  deliveryInstruction: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional(),
    quantity: z.number().int().min(1),
  })).optional(), // If not provided, checkout from user DB cart
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment Reference is required'),
  status: z.enum(['SUCCESS', 'FAILED']),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PLACED',
    'CONFIRMED',
    'PACKING',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  ]),
});

export const refundRequestSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
});

export const submitRatingSchema = z.object({
  storeRating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating max 5'),
  storeComment: z.string().optional(),
  riderRating: z.number().int().min(1).max(5).optional(),
  riderComment: z.string().optional(),
});

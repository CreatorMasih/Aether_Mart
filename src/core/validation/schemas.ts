import { z } from 'zod';

/**
 * Aether Mart Validation Schemas
 */

// 1. Auth Login Schema (Indian 10-digit mobile check)
export const loginSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, { message: 'Phone number must contain exactly 10 digits.' })
    .max(10, { message: 'Phone number must contain exactly 10 digits.' })
    .regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid Indian mobile number.' }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// 2. OTP Verification Schema
export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, { message: 'OTP must be exactly 6 characters long.' })
    .regex(/^\d+$/, { message: 'OTP must contain numbers only.' }),
});

export type OtpFormData = z.infer<typeof otpSchema>;

// 3. Saved Address Manager Schema
export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other'], {
    message: 'Please select an address label.',
  }),
  receiverName: z
    .string()
    .trim()
    .min(3, { message: 'Receiver name must contain at least 3 characters.' })
    .max(50, { message: 'Name is too long.' }),
  receiverPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, { message: 'Please enter a valid 10-digit mobile number.' }),
  streetAddress: z
    .string()
    .trim()
    .min(5, { message: 'Street address must contain at least 5 characters.' }),
  apartmentSuite: z.string().trim().optional(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: 'PIN code must be exactly 6 digits.' }),
  city: z
    .string()
    .trim()
    .min(2, { message: 'City name must contain at least 2 characters.' }),
});

export type AddressFormData = z.infer<typeof addressSchema>;

// 4. User Profile Settings Form Schema
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { message: 'Full name must contain at least 3 characters.' })
    .max(50, { message: 'Full name is too long.' }),
  email: z
    .string()
    .trim()
    .email({ message: 'Please enter a valid email address.' })
    .or(z.literal('')), // Allows empty string for optional emails
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// 5. Checkout validation Schema
export const checkoutSchema = z.object({
  addressId: z.string().min(1, { message: 'Please select a delivery address.' }),
  deliverySlotId: z.string().min(1, { message: 'Please select a delivery slot.' }),
  paymentMethod: z.enum(['UPI', 'CARD', 'COD'], {
    message: 'Please select a valid payment method.',
  }),
  couponCode: z.string().trim().optional(),
  deliveryInstructionId: z.string().optional(),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// 6. Product Schema (For merchant catalog addition/updates)
export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, { message: 'Product name must contain at least 3 characters.' }),
  description: z
    .string()
    .trim()
    .min(10, { message: 'Product description must be at least 10 characters.' }),
  price: z
    .number({ message: 'Price must be a number.' })
    .positive({ message: 'Price must be positive.' }),
  unit: z.string().trim().min(1, { message: 'Please select a unit (e.g., kg, g, packet).' }),
  weightGrams: z.number().positive().optional(),
  isOrganic: z.boolean().default(false),
  isVegetarian: z.boolean().default(true),
  stock: z
    .number({ message: 'Stock must be a number.' })
    .int()
    .nonnegative({ message: 'Stock cannot be negative.' }),
  sku: z
    .string()
    .trim()
    .min(4, { message: 'SKU must be at least 4 characters long.' }),
});

export type ProductFormData = z.infer<typeof productSchema>;

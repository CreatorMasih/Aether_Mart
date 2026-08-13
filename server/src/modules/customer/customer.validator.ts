import { z } from 'zod';

export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
  receiverName: z.string().optional(),
  receiverPhone: z.string().optional(),
  streetAddress: z.string().min(3, 'Street address is required'),
  apartmentSuite: z.string().optional(),
  houseNumber: z.string().optional(),
  street: z.string().optional(),
  landmark: z.string().optional(),
  postalCode: z.string().regex(/^\d{6}$/, 'Please enter a valid 6-digit PIN code'),
  city: z.string().min(2, 'City is required'),
  district: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional().default('India'),
  latitude: z.number().optional().default(21.1085),
  longitude: z.number().optional().default(82.0965),
  isDefault: z.boolean().optional().default(false),
});

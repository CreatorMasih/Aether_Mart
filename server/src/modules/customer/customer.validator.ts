import { z } from 'zod';

export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
  receiverName: z.string().min(1, 'Receiver name is required'),
  receiverPhone: z.string().min(8, 'Valid phone number is required'),
  streetAddress: z.string().min(3, 'Street address is required'),
  apartmentSuite: z.string().optional(),
  postalCode: z.string().min(4, 'Postal code is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.number().optional().default(12.9716),
  longitude: z.number().optional().default(77.5946),
  isDefault: z.boolean().optional().default(false),
});

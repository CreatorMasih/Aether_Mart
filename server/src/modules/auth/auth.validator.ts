import { z } from 'zod';
import { UserRole } from './auth.types';

// Regular expressions
const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 phone format

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  identifier: z.string().min(3, 'Identifier must be at least 3 characters').refine((val) => {
    const isEmail = z.string().email().safeParse(val).success;
    const isPhone = phoneRegex.test(val.replace(/\s+/g, ''));
    return isEmail || isPhone;
  }, {
    message: 'Identifier must be a valid email address or phone number (e.g. +919876543210)',
  }),
  type: z.enum(['SMS', 'EMAIL']),
  role: z.enum(['ADMIN']),
});

export const verifyOtpSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().length(6, 'Verification code must be exactly 6 digits'),
  role: z.enum(['ADMIN']),
  method: z.enum(['PHONE', 'EMAIL', 'GOOGLE', 'APPLE', 'WHATSAPP']),
});

export const googleLoginSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  role: z.enum(['CUSTOMER', 'SHOPKEEPER', 'RIDER']),
});

export const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']),
  receiverName: z.string().min(2, 'Receiver name must be at least 2 characters'),
  receiverPhone: z.string().regex(phoneRegex, 'Invalid receiver phone number'),
  streetAddress: z.string().min(5, 'Street address must be at least 5 characters'),
  apartmentSuite: z.string().optional(),
  postalCode: z.string().min(5, 'Postal code is too short').max(10),
  city: z.string().min(2, 'City name is too short'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const customerProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  defaultAddress: addressSchema.optional(),
});

export const merchantProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  storeName: z.string().min(3, 'Store name must be at least 3 characters'),
  storeAddress: z.string().min(5, 'Store address must be at least 5 characters'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  deliveryRadiusKm: z.number().positive('Delivery radius must be a positive number'),
  gstNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
});

export const riderProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address').optional(),
  vehicleType: z.enum(['BICYCLE', 'MOTORBIKE']),
  vehiclePlateNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export const completeProfileSchema = z.object({
  role: z.enum(['CUSTOMER', 'SHOPKEEPER', 'RIDER']),
  customerDetails: customerProfileSchema.optional(),
  merchantDetails: merchantProfileSchema.optional(),
  riderDetails: riderProfileSchema.optional(),
}).refine((data) => {
  if (data.role === 'CUSTOMER' && !data.customerDetails) return false;
  if (data.role === 'SHOPKEEPER' && !data.merchantDetails) return false;
  if (data.role === 'RIDER' && !data.riderDetails) return false;
  return true;
}, {
  message: 'Corresponding details are required for the selected role',
  path: ['role'],
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(phoneRegex).optional(),
});

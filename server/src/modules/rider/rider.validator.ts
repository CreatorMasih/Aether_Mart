import { z } from 'zod';
import { VehicleType } from '@prisma/client';

export const updateRiderProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').optional(),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  vehiclePlateNumber: z.string().min(1, 'Plate number is required').optional(),
  licenseNumber: z.string().min(1, 'License number is required').optional(),
});

export const riderHeartbeatSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isOnline: z.boolean(),
});

export const confirmPickupSchema = z.object({
  pickupOtp: z.string().length(4, 'OTP must be 4 digits'),
});

export const confirmDeliverySchema = z.object({
  deliveryOtp: z.string().length(4, 'OTP must be 4 digits'),
});

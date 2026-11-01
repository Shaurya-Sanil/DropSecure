import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp|heic|jpg)$/, 'Only JPEG, PNG, WEBP, and HEIC images are allowed'),
});

export const createParcelSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  imageKey: z.string().min(1, 'Image key is required'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  carrier: z.string().max(100, 'Carrier name cannot exceed 100 characters').optional(),
  campusId: z.string().max(50).optional(),
  lockerNumber: z.string().max(20).optional(),
  lockerSize: z.string().max(20).optional(),
  packageCondition: z.string().max(50).optional(),
});

export const verifyOtpSchema = z.object({
  parcelId: z.string().uuid().optional(),
  trackingCode: z.string().optional(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must contain numbers only'),
}).refine((data) => data.parcelId || data.trackingCode, {
  message: 'Either parcelId or trackingCode must be provided',
  path: ['trackingCode'],
});

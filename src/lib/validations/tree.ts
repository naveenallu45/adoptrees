import { z } from 'zod';

// Tree validation schema
export const treeSchema = z.object({
  name: z
    .string()
    .min(2, 'Tree name must be at least 2 characters')
    .max(100, 'Tree name must not exceed 100 characters')
    .trim(),
  price: z
    .number()
    .positive('Price must be positive')
    .max(1000000, 'Price seems unreasonably high'),
  info: z
    .string()
    .min(10, 'Tree information must be at least 10 characters')
    .max(500, 'Tree information must not exceed 500 characters')
    .trim(),
  oxygenKgs: z
    .number()
    .nonnegative('Oxygen production cannot be negative')
    .max(10000, 'Oxygen production value seems unreasonably high'),
  treeType: z
    .enum(['individual', 'company'])
    .refine((val) => ['individual', 'company'].includes(val), {
      message: 'Tree type must be either individual or company'
    }),
  packageQuantity: z
    .number()
    .int('Package quantity must be a whole number')
    .min(1, 'Package quantity must be at least 1')
    .max(1000, 'Package quantity seems unreasonably high')
    .optional(),
  packagePrice: z
    .number()
    .nonnegative('Package price cannot be negative')
    .max(10000000, 'Package price seems unreasonably high')
    .optional(),
});

export type TreeInput = z.infer<typeof treeSchema>;

// Tree update schema (same as create for now)
export const treeUpdateSchema = treeSchema;

export type TreeUpdateInput = z.infer<typeof treeUpdateSchema>;

// Image validation
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Image file is required' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image file size must be less than 5MB' };
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  return { valid: true };
}


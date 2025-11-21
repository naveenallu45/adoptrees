import { z } from 'zod';

// Valid local uses
export const VALID_LOCAL_USES = [
  'Natural pesticide',
  'Soil',
  'Fence',
  'Anti-wind',
  'Cosmetics',
  'Biodiversity',
  'Consumption and sales',
  'Livestock',
  'Medicine'
] as const;

// Tree validation schema
export const treeSchema = z.object({
  name: z
    .string()
    .min(2, 'Tree name must be at least 2 characters')
    .max(100, 'Tree name must not exceed 100 characters')
    .trim(),
  price: z
    .number()
    .int('Price must be a whole number')
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
  // Additional tree information fields
  scientificSpecies: z
    .string()
    .max(200, 'Scientific species name must not exceed 200 characters')
    .trim()
    .optional(),
  speciesInfoAvailable: z
    .boolean()
    .optional(),
  co2: z
    .number()
    .max(10000, 'CO₂ value seems unreasonably high')
    .min(-10000, 'CO₂ value seems unreasonably low')
    .optional(),
  foodSecurity: z
    .number()
    .int('Food security rating must be a whole number')
    .min(0, 'Food security rating must be between 0 and 10')
    .max(10, 'Food security rating must be between 0 and 10')
    .optional(),
  economicDevelopment: z
    .number()
    .int('Economic development rating must be a whole number')
    .min(0, 'Economic development rating must be between 0 and 10')
    .max(10, 'Economic development rating must be between 0 and 10')
    .optional(),
  co2Absorption: z
    .number()
    .int('CO₂ absorption rating must be a whole number')
    .min(0, 'CO₂ absorption rating must be between 0 and 10')
    .max(10, 'CO₂ absorption rating must be between 0 and 10')
    .optional(),
  environmentalProtection: z
    .number()
    .int('Environmental protection rating must be a whole number')
    .min(0, 'Environmental protection rating must be between 0 and 10')
    .max(10, 'Environmental protection rating must be between 0 and 10')
    .optional(),
  localUses: z
    .array(z.string())
    .refine((arr) => arr.every(item => VALID_LOCAL_USES.includes(item as typeof VALID_LOCAL_USES[number])), {
      message: 'All local uses must be valid'
    })
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


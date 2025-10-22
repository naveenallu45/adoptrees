import { z } from 'zod';

export const wellWisherRegistrationSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase(),
  
  phone: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[\+]?[1-9][\d]{0,15}$/.test(val);
    }, 'Invalid phone number format'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

export const wellWisherUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be less than 100 characters')
    .toLowerCase(),
  
  phone: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[\+]?[1-9][\d]{0,15}$/.test(val);
    }, 'Invalid phone number format'),
  
  password: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return val.length >= 8 && val.length <= 128;
    }, 'Password must be between 8 and 128 characters')
    .refine((val) => {
      if (!val) return true;
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val);
    }, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
});

export type WellWisherRegistrationInput = z.infer<typeof wellWisherRegistrationSchema>;
export type WellWisherUpdateInput = z.infer<typeof wellWisherUpdateSchema>;

import { z } from 'zod';

// Password validation schema
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Email validation schema
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

// Phone validation schema (basic international format)
export const phoneSchema = z
  .string()
  .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number')
  .optional();

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Registration schema
export const registerSchema = z.object({
  userType: z.enum(['individual', 'company'], {
    message: 'User type is required',
  }),
  name: z.string().optional(),
  companyName: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
}).refine(
  (data) => {
    // For individuals, name is required and must be at least 2 characters
    if (data.userType === 'individual') {
      return data.name && data.name.trim().length >= 2;
    }
    return true;
  },
  {
    message: 'Name must be at least 2 characters',
    path: ['name'],
  }
).refine(
  (data) => {
    // For companies, company name is required and must be at least 2 characters
    if (data.userType === 'company') {
      return data.companyName && data.companyName.trim().length >= 2;
    }
    return true;
  },
  {
    message: 'Company name must be at least 2 characters',
    path: ['companyName'],
  }
);

export type RegisterInput = z.infer<typeof registerSchema>;


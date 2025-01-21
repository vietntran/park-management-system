// src/lib/validations/auth.ts

import { z } from "zod";

// Password validation helpers
const hasUpperCase = (str: string) => /[A-Z]/.test(str);
const hasLowerCase = (str: string) => /[a-z]/.test(str);
const hasNumber = (str: string) => /[0-9]/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*(),.?":{}|<>]/.test(str);

// Reusable password schema with detailed error messages
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must not exceed 128 characters")
  .refine(hasUpperCase, "Password must contain at least one uppercase letter")
  .refine(hasLowerCase, "Password must contain at least one lowercase letter")
  .refine(hasNumber, "Password must contain at least one number")
  .refine(
    hasSpecialChar,
    'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
  );

// Email schema with consistent validation
export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format");

// Common schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 letters"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(
      /^[a-zA-Z\s-']+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    ),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  address: addressSchema.optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const passwordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const newPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: registerSchema.shape.password,
});

export const profileUpdateSchema = registerSchema.partial().omit({
  password: true,
  acceptTerms: true,
});

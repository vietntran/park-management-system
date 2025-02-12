// src/lib/validations/auth.ts

import { z } from "zod";

// Base validation helpers
const hasUpperCase = (str: string) => /[A-Z]/.test(str);
const hasLowerCase = (str: string) => /[a-z]/.test(str);
const hasNumber = (str: string) => /[0-9]/.test(str);
const hasSpecialChar = (str: string) => /[!@#$%^&*(),.?":{}|<>]/.test(str);

// Core schemas
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

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email address")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format");

export const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters")
  .regex(
    /^[a-zA-Z\s-']+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes",
  );

// Address schema (used for profile completion)
export const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 letters"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
});

// Phone schema (used for profile completion)
export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^\+?[1-9]\d{1,14}$/, {
    message:
      "Please enter a valid phone number (e.g., +1234567890 or 1234567890)",
  });

// Stage 1: Initial Registration
export const initialRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

// Stage 2: Profile Completion (required for reservations)
export const profileCompletionSchema = z.object({
  phone: phoneSchema,
  address: addressSchema,
});

// Combined schema for full profile
export const fullProfileSchema = initialRegistrationSchema
  .omit({ password: true })
  .merge(profileCompletionSchema);

// Common schema combinations
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordResetSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

// Types
export type InitialRegistrationData = z.infer<typeof initialRegistrationSchema>;
export type ProfileCompletionData = z.infer<typeof profileCompletionSchema>;
export type FullProfileData = z.infer<typeof fullProfileSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;
export type NewPasswordData = z.infer<typeof newPasswordSchema>;

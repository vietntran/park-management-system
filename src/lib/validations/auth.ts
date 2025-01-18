import { z } from "zod";

export const addressSchema = z.object({
  line1: z.string().min(1, "Address line 1 is required"),
  line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().length(2, "State must be 2 letters"),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code")
});

export const registerSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email address")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),
  
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password cannot exceed 128 characters")
    .regex(
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .regex(/^[a-zA-Z\s-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  
  phone: z.string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  
  address: addressSchema.optional(),
  
  acceptTerms: z.boolean()
    .refine((val) => val === true, {
      message: "You must accept the terms and conditions"
    })
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Additional validation schemas for other auth-related operations
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const emailVerificationSchema = z.object({
  token: z.string().min(1, "Verification token is required")
});

export const passwordResetSchema = z.object({
  email: z.string().email("Invalid email address")
});

export const newPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: registerSchema.shape.password
});

export const profileUpdateSchema = registerSchema.partial().omit({ 
  password: true,
  acceptTerms: true 
});
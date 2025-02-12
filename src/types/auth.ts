// src/types/auth.ts
import { z } from "zod";

import {
  loginSchema,
  initialRegistrationSchema,
  profileCompletionSchema,
  fullProfileSchema,
} from "@/lib/validations/auth";

import type { ApiResponse } from "./api";

// Form Data Types
export type LoginFormData = z.infer<typeof loginSchema>;
export type InitialRegistrationData = z.infer<typeof initialRegistrationSchema>;
export type ProfileCompletionData = z.infer<typeof profileCompletionSchema>;
export type FullProfileData = z.infer<typeof fullProfileSchema>;

export type LoginError = string | null;

// API Response Types
export interface AuthSuccess {
  token?: string;
  redirectUrl?: string;
}

export type AuthResponse = ApiResponse<AuthSuccess>;

// Loading and Error States
export interface AuthLoadingStates {
  isVerifyingEmailToken: boolean;
  isSendingVerificationEmail: boolean;
}

export interface AuthErrorStates {
  verifyingEmailTokenError: string | null;
  sendingVerificationEmailError: string | null;
}

// User Types
export interface RegisteredUser {
  id: string;
  email: string;
  name: string;
  isProfileComplete: boolean;
}

// Registration Response Types
export interface RegistrationSuccess {
  user: RegisteredUser;
}

export type RegistrationResponse = ApiResponse<RegistrationSuccess>;

// Profile Completion Response Types
export interface ProfileCompletionSuccess {
  user: RegisteredUser;
}

export type ProfileCompletionResponse = ApiResponse<ProfileCompletionSuccess>;

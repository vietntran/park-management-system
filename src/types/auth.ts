// src/types/auth.ts
import { z } from "zod";

import { loginSchema, registerSchema } from "@/lib/validations/auth";

import type { ApiResponse } from "./api";

export type LoginFormData = z.infer<typeof loginSchema>;
export type LoginError = string | null;
export type RegisterFormData = z.infer<typeof registerSchema>;

export interface AuthSuccess {
  token?: string;
  redirectUrl?: string;
}

export type AuthResponse = ApiResponse<AuthSuccess>;

export interface AuthLoadingStates {
  isVerifyingEmailToken: boolean;
  isSendingVerificationEmail: boolean;
}

export interface AuthErrorStates {
  verifyingEmailTokenError: string | null;
  sendingVerificationEmailError: string | null;
}

// Registration specific types
export interface RegisteredUser {
  id: string;
  email: string;
  name: string;
}

export interface RegistrationSuccess {
  user: RegisteredUser;
}

export type RegistrationResponse = ApiResponse<RegistrationSuccess>;

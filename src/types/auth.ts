// src/types/auth.ts
import { z } from "zod";

import { loginSchema, registerSchema } from "@/lib/validations/auth";

import type { ApiResponse } from "./api";

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

export interface AuthSuccess {
  token?: string;
  redirectUrl?: string;
}

export type AuthResponse = ApiResponse<AuthSuccess>;

export interface AuthLoadingStates {
  isVerifying: boolean;
  isResendingVerification: boolean;
}

export interface AuthErrorStates {
  verificationError: string | null;
  resendError: string | null;
}

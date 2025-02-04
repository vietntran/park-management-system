// src/hooks/useAuthLoadingStates.ts
import { useState } from "react";

import type { AuthLoadingStates, AuthErrorStates } from "@/types/auth";

export const useAuthLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<AuthLoadingStates>({
    isVerifying: false,
    isResendingVerification: false,
  });

  const [errors, setErrors] = useState<AuthErrorStates>({
    verificationError: null,
    resendError: null,
  });

  const setLoading = (key: keyof AuthLoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  const setError = (key: keyof AuthErrorStates, error: string | null) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
  };

  const clearErrors = () => {
    setErrors({
      verificationError: null,
      resendError: null,
    });
  };

  const clearError = (key: keyof AuthErrorStates) => {
    setError(key, null);
  };

  return {
    loadingStates,
    errors,
    setLoading,
    setError,
    clearErrors,
    clearError,
  };
};

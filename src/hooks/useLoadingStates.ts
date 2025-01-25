// src/hooks/useLoadingStates.ts

import { useState } from "react";

import type { LoadingStates, ErrorStates } from "@/types/reservation";

export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    isLoadingDates: false,
    isLoadingUserReservations: false,
    isValidatingUsers: false,
    isSubmitting: false,
  });

  const [errors, setErrors] = useState<ErrorStates>({
    datesError: null,
    userReservationsError: null,
    validationError: null,
    submissionError: null,
  });

  const setLoading = (key: keyof LoadingStates, value: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }));
  };

  const setError = (key: keyof ErrorStates, error: string | null) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
  };

  const clearErrors = () => {
    setErrors({
      datesError: null,
      userReservationsError: null,
      validationError: null,
      submissionError: null,
    });
  };

  const clearError = (key: keyof ErrorStates) => {
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

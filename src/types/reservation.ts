// src/types/reservation.ts
export type SelectedUser = {
  id: string;
  name: string;
  email: string;
  canModify: boolean;
  canTransfer: boolean;
};

export type ReservationFormData = {
  reservationDate: Date;
  additionalUsers: SelectedUser[];
};

// API Response types
export interface AvailabilityResponse {
  availableDates: string[];
  error?: string;
}

export interface UserReservationsResponse {
  reservations: string[];
  error?: string;
}

export interface UserValidationResponse {
  valid: boolean;
  error?: string;
}

export interface ReservationCreationResponse {
  success: boolean;
  error?: string;
  reservationId?: string;
}

// Loading states
export interface LoadingStates {
  isLoadingDates: boolean;
  isLoadingUserReservations: boolean;
  isValidatingUsers: boolean;
  isSubmitting: boolean;
}

// Error states
export interface ErrorStates {
  datesError: string | null;
  userReservationsError: string | null;
  validationError: string | null;
  submissionError: string | null;
}

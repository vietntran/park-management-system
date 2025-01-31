// src/types/reservation.ts
import type { ReservationStatus, ReservationUserStatus } from "@prisma/client";

// Re-export Prisma types
export type { ReservationStatus, ReservationUserStatus };

export interface ReservationUser {
  reservationId: string;
  userId: string;
  isPrimary: boolean;
  status: ReservationUserStatus;
  addedAt: Date;
  cancelledAt: Date | null;
  user?: {
    name: string;
    email: string;
  };
}

export interface ReservationResponse {
  id: string;
  primaryUserId: string;
  reservationDate: Date;
  createdAt: Date;
  status: ReservationStatus;
  canTransfer: boolean;
  reservationUsers: ReservationUser[];
  dateCapacity: {
    totalBookings: number;
    remainingSpots: number;
  };
}

export type SelectedUser = {
  id: string;
  name: string;
  email: string;
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

export interface ReservationUser {
  reservationId: string;
  userId: string;
  isPrimary: boolean;
  status: ReservationUserStatus;
  addedAt: Date;
  cancelledAt: Date | null;
}

export interface CancellationResponse {
  success: boolean;
  error?: string;
}

export interface ReservationDetails extends ReservationFormData {
  id: string;
  primaryUserId: string;
  createdAt: Date;
  status: ReservationStatus;
  canTransfer: boolean;
  reservationUsers: ReservationUser[];
}

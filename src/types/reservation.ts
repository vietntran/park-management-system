import type {
  ReservationStatus,
  ReservationUserStatus,
  TransferStatus,
} from "@prisma/client";

import type { ApiResponse } from "./api";

// Re-export Prisma types
export type { ReservationStatus, ReservationUserStatus };

// Base types
export interface ReservationUser {
  reservationId: string;
  userId: string;
  isPrimary: boolean;
  status: ReservationUserStatus;
  addedAt: Date;
  cancelledAt: Date | null;
  user?: {
    id: string;
    name: string;
    email: string;
    emailVerified: Date | null;
    isProfileComplete: boolean;
  };
}

export interface Reservation {
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

// User selection types
export interface SelectedUser {
  id: string;
  name: string;
  email: string;
}

// Form types
export interface ReservationFormData {
  reservationDate: Date;
  additionalUsers: SelectedUser[];
}

// Availability types
export interface Availability {
  date: string;
  isAvailable: boolean;
  remainingSpots: number;
}

// API Response types
export type ReservationResponse = ApiResponse<Reservation>;
export type AvailabilityResponse = ApiResponse<Availability>;
export type AvailabilityRangeResponse = ApiResponse<Availability[]>;
export type UserReservationsResponse = ApiResponse<Reservation[]>;
export type UserValidationResponse = ApiResponse<{ valid: boolean }>;

// Extended types
export interface ReservationDetails extends ReservationFormData {
  id: string;
  primaryUserId: string;
  createdAt: Date;
  status: ReservationStatus;
  canTransfer: boolean;
  reservationUsers: ReservationUser[];
}

// UI State types
export interface LoadingStates {
  isLoadingDates: boolean;
  isLoadingUserReservations: boolean;
  isValidatingUsers: boolean;
  isSubmitting: boolean;
}

export interface ErrorStates {
  datesError: string | null;
  userReservationsError: string | null;
  validationError: string | null;
  submissionError: string | null;
}

export interface Transfer {
  id: string;
  reservationId: string;
  fromUserId: string;
  toUserId: string;
  expiresAt: Date;
  isPrimaryTransfer: boolean;
  requestedAt: Date;
  respondedAt: Date | null;
  spotsToTransfer: string[];
  status: TransferStatus;
  fromUser?: {
    id: string;
    name: string;
    email: string;
  };
  toUser?: {
    id: string;
    name: string;
    email: string;
  };
  reservation?: Reservation;
}

export type TransferResponse = ApiResponse<Transfer>;
export type TransferListResponse = ApiResponse<Transfer[]>;

export interface TransferFormData {
  reservationId: string;
  toUserId: string;
  spotsToTransfer: string[];
  isPrimaryTransfer: boolean;
}

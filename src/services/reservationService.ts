// src/services/reservationService.ts
import {
  handleApiError,
  handleClientError,
} from "@/lib/errors/clientErrorHandler";
import type {
  AvailabilityResponse,
  UserReservationsResponse,
  UserValidationResponse,
  ReservationCreationResponse,
  ReservationFormData,
  SelectedUser,
} from "@/types/reservation";

export const reservationService = {
  async getAvailableDates(
    startDate: Date,
    endDate: Date,
  ): Promise<AvailabilityResponse> {
    try {
      const response = await fetch(
        `/api/reservations/availability?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      );
      if (!response.ok) {
        await handleApiError(response);
      }
      return response.json();
    } catch (error) {
      handleClientError(
        error instanceof Error
          ? error
          : new Error("Failed to load available dates"),
        {
          path: "/api/reservations/availability",
          method: "GET",
        },
      );
      throw error;
    }
  },

  async getUserReservations(): Promise<UserReservationsResponse> {
    try {
      const response = await fetch("/api/reservations/user");
      if (!response.ok) {
        await handleApiError(response);
      }
      return response.json();
    } catch (error) {
      handleClientError(
        error instanceof Error
          ? error
          : new Error("Failed to load user reservations"),
        {
          path: "/api/reservations/user",
          method: "GET",
        },
      );
      throw error;
    }
  },

  async validateUsers(users: SelectedUser[]): Promise<UserValidationResponse> {
    try {
      const response = await fetch("/api/users/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: users.map((u) => u.id) }),
      });
      if (!response.ok) {
        await handleApiError(response);
      }
      return response.json();
    } catch (error) {
      handleClientError(
        error instanceof Error ? error : new Error("Failed to validate users"),
        {
          path: "/api/users/validate",
          method: "POST",
        },
      );
      throw error;
    }
  },

  async checkDateAvailability(
    date: Date,
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    try {
      const response = await fetch(
        `/api/reservations/check-availability?date=${date.toISOString()}`,
      );
      if (!response.ok) {
        await handleApiError(response);
      }
      return response.json();
    } catch (error) {
      handleClientError(
        error instanceof Error
          ? error
          : new Error("Failed to check date availability"),
        {
          path: "/api/reservations/check-availability",
          method: "GET",
        },
      );
      throw error;
    }
  },

  async createReservation(
    data: ReservationFormData,
  ): Promise<ReservationCreationResponse> {
    try {
      const response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        await handleApiError(response);
      }
      return response.json();
    } catch (error) {
      handleClientError(
        error instanceof Error
          ? error
          : new Error("Failed to create reservation"),
        {
          path: "/api/reservations/create",
          method: "POST",
        },
      );
      throw error;
    }
  },
};

// src/services/reservationService.ts
import type { ApiResponse } from "@/lib/api/withErrorHandler";
import {
  handleApiError,
  handleClientError,
} from "@/lib/errors/clientErrorHandler";
import type {
  ReservationResponse,
  ReservationFormData,
  SelectedUser,
} from "@/types/reservation";

// Define the types for the availability response
interface AvailabilityRangeData {
  availableDates: string[];
  maxCapacity: number;
}

export const reservationService = {
  async getAvailableDates(
    startDate: Date,
    endDate: Date,
    signal?: AbortSignal,
  ): Promise<ApiResponse<AvailabilityRangeData>> {
    try {
      const response = await fetch(
        `/api/reservations/availability?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        { signal },
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

  async getUserReservations(
    signal?: AbortSignal,
  ): Promise<ApiResponse<ReservationResponse[]>> {
    try {
      const response = await fetch("/api/reservations/user", { signal });
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

  async validateUsers(
    users: SelectedUser[],
  ): Promise<ApiResponse<{ valid: boolean }>> {
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
  ): Promise<ApiResponse<{ isAvailable: boolean; reason?: string }>> {
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
  ): Promise<ApiResponse<ReservationResponse>> {
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

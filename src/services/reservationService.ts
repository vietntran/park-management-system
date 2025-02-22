// src/services/reservationService.ts
import type { ApiResponse } from "@/lib/api/withErrorHandler";
import { typedFetch } from "@/lib/utils";
import type {
  ReservationFormData,
  SelectedUser,
  Reservation,
  Availability,
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
    return typedFetch<AvailabilityRangeData>(
      `/api/reservations/availability?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      { signal },
    );
  },

  async getUserReservations(
    signal?: AbortSignal,
  ): Promise<ApiResponse<Reservation[]>> {
    return typedFetch<Reservation[]>("/api/reservations/user", { signal });
  },

  async validateUsers(
    users: SelectedUser[],
  ): Promise<ApiResponse<{ valid: boolean }>> {
    return typedFetch<{ valid: boolean }>("/api/users/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds: users.map((u) => u.id) }),
    });
  },

  async checkDateAvailability(date: Date): Promise<ApiResponse<Availability>> {
    return typedFetch<Availability>(
      `/api/reservations/check-availability?date=${date.toISOString()}`,
    );
  },

  async createReservation(
    data: ReservationFormData,
  ): Promise<ApiResponse<Reservation>> {
    return typedFetch<Reservation>("/api/reservations/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  async getReservationById(
    id: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<Reservation>> {
    return typedFetch<Reservation>(`/api/reservations/${id}`, {
      signal,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
};

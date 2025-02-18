// src/services/transferService.ts
import type { ApiResponse } from "@/lib/api/withErrorHandler";
import { typedFetch } from "@/lib/utils";
import type {
  Reservation,
  Transfer,
  TransferFormData,
} from "@/types/reservation";

export const transferService = {
  async getReservationForTransfer(
    reservationId: string,
    signal?: AbortSignal,
  ): Promise<ApiResponse<Reservation>> {
    return typedFetch<Reservation>(`/api/reservations/${reservationId}`, {
      signal,
    });
  },
  async getPendingTransfers(
    signal?: AbortSignal,
  ): Promise<ApiResponse<Transfer[]>> {
    return typedFetch<Transfer[]>("/api/reservations/transfer", { signal });
  },

  async createTransfer(data: TransferFormData): Promise<ApiResponse<Transfer>> {
    return typedFetch<Transfer>("/api/reservations/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  async respondToTransfer(
    transferId: string,
    action: "accept" | "decline",
  ): Promise<ApiResponse<Transfer>> {
    return typedFetch<Transfer>(`/api/reservations/transfer/${transferId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
  },
};

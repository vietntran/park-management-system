// src/services/transferService.ts
import type { ApiResponse } from "@/lib/api/withErrorHandler";
import { typedFetch } from "@/lib/utils";
import type { Transfer, TransferFormData } from "@/types/reservation";

export const transferService = {
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

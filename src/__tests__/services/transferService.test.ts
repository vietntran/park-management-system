// src/services/__tests__/transferService.test.ts
import {
  ReservationStatus,
  ReservationUserStatus,
  TransferStatus,
} from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

import { typedFetch } from "@/lib/utils";
import { transferService } from "@/services/transferService";
import type { Transfer, TransferFormData } from "@/types/reservation";

// Mock typedFetch
jest.mock("@/lib/utils", () => ({
  typedFetch: jest.fn(),
}));

describe("transferService", () => {
  const futureDateForValidTransfer = addDays(startOfDay(new Date()), 3);

  const mockTransfer = {
    id: "123e4567-e89b-12d3-a456-426614174003",
    reservationId: "123e4567-e89b-12d3-a456-426614174001",
    fromUserId: "123e4567-e89b-12d3-a456-426614174000",
    toUserId: "123e4567-e89b-12d3-a456-426614174002",
    status: TransferStatus.PENDING,
    expiresAt: addDays(new Date(), 1),
    requestedAt: new Date(),
    respondedAt: null,
    spotsToTransfer: ["123e4567-e89b-12d3-a456-426614174000"],
    isPrimaryTransfer: true,
    fromUser: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "from@example.com",
      name: "From User",
    },
    toUser: {
      id: "123e4567-e89b-12d3-a456-426614174002",
      email: "to@example.com",
      name: "To User",
    },
    reservation: {
      id: "123e4567-e89b-12d3-a456-426614174001",
      primaryUserId: "123e4567-e89b-12d3-a456-426614174000",
      reservationDate: futureDateForValidTransfer,
      createdAt: new Date(),
      status: ReservationStatus.ACTIVE,
      canTransfer: true,
      reservationUsers: [
        {
          userId: "123e4567-e89b-12d3-a456-426614174000",
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
          addedAt: new Date(),
          cancelledAt: null,
          reservationId: "123e4567-e89b-12d3-a456-426614174001",
          user: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            email: "from@example.com",
            name: "From User",
            emailVerified: new Date(),
            isProfileComplete: true,
          },
        },
      ],
      dateCapacity: {
        totalBookings: 30,
        remainingSpots: 30,
      },
    },
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPendingTransfers", () => {
    const mockTransfers = [mockTransfer];

    test("calls correct endpoint with GET method", async () => {
      (typedFetch as jest.Mock).mockResolvedValue({ data: mockTransfers });

      await transferService.getPendingTransfers();

      expect(typedFetch).toHaveBeenCalledWith(
        "/api/reservations/transfer",
        expect.objectContaining({
          signal: undefined,
        }),
      );
    });

    test("passes abort signal when provided", async () => {
      const abortController = new AbortController();
      await transferService.getPendingTransfers(abortController.signal);

      expect(typedFetch).toHaveBeenCalledWith(
        "/api/reservations/transfer",
        expect.objectContaining({
          signal: abortController.signal,
        }),
      );
    });

    test("handles fetch errors appropriately", async () => {
      const error = new Error("Network error");
      (typedFetch as jest.Mock).mockRejectedValue(error);

      await expect(transferService.getPendingTransfers()).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("createTransfer", () => {
    const mockTransferData: TransferFormData = {
      reservationId: "123e4567-e89b-12d3-a456-426614174001",
      toUserId: "123e4567-e89b-12d3-a456-426614174002",
      spotsToTransfer: ["123e4567-e89b-12d3-a456-426614174000"],
      isPrimaryTransfer: true,
    };
    const mockResponse: Transfer = mockTransfer;

    test("calls correct endpoint with POST method and data", async () => {
      (typedFetch as jest.Mock).mockResolvedValue({ data: mockResponse });

      await transferService.createTransfer(mockTransferData);

      expect(typedFetch).toHaveBeenCalledWith(
        "/api/reservations/transfer",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mockTransferData),
        }),
      );
    });

    test("handles validation errors from API", async () => {
      const validationError = {
        error: "Validation failed",
        status: 400,
      };
      (typedFetch as jest.Mock).mockRejectedValue(validationError);

      await expect(
        transferService.createTransfer(mockTransferData),
      ).rejects.toEqual(validationError);
    });
  });

  describe("respondToTransfer", () => {
    const mockTransferId = "test-transfer-id";

    test("calls correct endpoint for accept action", async () => {
      // Mock successful response
      (typedFetch as jest.Mock).mockResolvedValue({ data: mockTransfer });

      await transferService.respondToTransfer(mockTransferId, "accept");

      expect(typedFetch).toHaveBeenCalledWith(
        `/api/reservations/transfer/${mockTransferId}`,
        expect.objectContaining({
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "accept" }),
        }),
      );
    });

    test("calls correct endpoint for decline action", async () => {
      // Mock successful response
      (typedFetch as jest.Mock).mockResolvedValue({ data: mockTransfer });

      await transferService.respondToTransfer(mockTransferId, "decline");

      expect(typedFetch).toHaveBeenCalledWith(
        `/api/reservations/transfer/${mockTransferId}`,
        expect.objectContaining({
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "decline" }),
        }),
      );
    });

    // The error test case is already working correctly
    test("handles not found errors", async () => {
      const notFoundError = {
        error: "Transfer not found",
        status: 404,
      };
      (typedFetch as jest.Mock).mockRejectedValue(notFoundError);

      await expect(
        transferService.respondToTransfer(mockTransferId, "accept"),
      ).rejects.toEqual(notFoundError);
    });
  });
});

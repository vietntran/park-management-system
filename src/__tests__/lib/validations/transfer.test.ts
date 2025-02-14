import {
  ReservationStatus,
  ReservationUserStatus,
  TransferStatus,
} from "@prisma/client";
import { addDays, subDays } from "date-fns";

import {
  ValidationError,
  ConflictError,
  AuthorizationError,
} from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import { validateConsecutiveDates } from "@/lib/validations/reservation";
import {
  canInitiateTransfer,
  canAcceptTransfer,
} from "@/lib/validations/transfer";
import { getTransferDeadline } from "@/utils/dateUtils";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    reservationTransfer: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/utils/dateUtils", () => ({
  getTransferDeadline: jest.fn(),
}));

jest.mock("@/lib/validations/reservation", () => ({
  validateConsecutiveDates: jest.fn(),
}));

describe("canInitiateTransfer", () => {
  const mockReservation = {
    id: "res-1",
    status: ReservationStatus.ACTIVE,
    primaryUserId: "user-1",
    reservationDate: new Date(),
    reservationUsers: [
      { userId: "user-1", status: ReservationUserStatus.ACTIVE },
      { userId: "user-2", status: ReservationUserStatus.ACTIVE },
    ],
    transfers: [],
  };

  const mockRecipient = {
    id: "user-3",
    reservationUsers: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(
      mockReservation,
    );
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockRecipient);
    (getTransferDeadline as jest.Mock).mockReturnValue(addDays(new Date(), 1));
    (validateConsecutiveDates as jest.Mock).mockResolvedValue(true);
  });

  it("should allow primary user to transfer multiple spots", async () => {
    const result = await canInitiateTransfer({
      userId: "user-1",
      reservationId: "res-1",
      spotsToTransfer: ["user-1", "user-2"],
      toUserId: "user-3",
    });

    expect(result).toBe(true);
  });

  it("should allow non-primary user to transfer their own spot", async () => {
    const result = await canInitiateTransfer({
      userId: "user-2",
      reservationId: "res-1",
      spotsToTransfer: ["user-2"],
      toUserId: "user-3",
    });

    expect(result).toBe(true);
  });

  it("should throw ValidationError if reservation not found", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      canInitiateTransfer({
        userId: "user-1",
        reservationId: "res-1",
        spotsToTransfer: ["user-1"],
        toUserId: "user-3",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw ValidationError if transfer deadline passed", async () => {
    (getTransferDeadline as jest.Mock).mockReturnValue(subDays(new Date(), 1));

    await expect(
      canInitiateTransfer({
        userId: "user-1",
        reservationId: "res-1",
        spotsToTransfer: ["user-1"],
        toUserId: "user-3",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw ConflictError if pending transfer exists", async () => {
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue({
      ...mockReservation,
      transfers: [{ id: "transfer-1", status: TransferStatus.PENDING }],
    });

    await expect(
      canInitiateTransfer({
        userId: "user-1",
        reservationId: "res-1",
        spotsToTransfer: ["user-1"],
        toUserId: "user-3",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("should throw AuthorizationError if non-primary user attempts to transfer others", async () => {
    await expect(
      canInitiateTransfer({
        userId: "user-2",
        reservationId: "res-1",
        spotsToTransfer: ["user-1", "user-2"],
        toUserId: "user-3",
      }),
    ).rejects.toThrow(AuthorizationError);
  });
});

describe("canAcceptTransfer", () => {
  const mockTransfer = {
    id: "transfer-1",
    status: TransferStatus.PENDING,
    toUserId: "user-2",
    expiresAt: addDays(new Date(), 1),
    reservation: {
      id: "res-1",
      reservationDate: new Date(),
      reservationUsers: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValue(
      mockTransfer,
    );
    (validateConsecutiveDates as jest.Mock).mockResolvedValue(true);
  });

  it("should allow intended recipient to accept transfer", async () => {
    const result = await canAcceptTransfer({
      userId: "user-2",
      transferId: "transfer-1",
    });

    expect(result).toBe(true);
  });

  it("should throw ValidationError if transfer not found", async () => {
    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      canAcceptTransfer({
        userId: "user-2",
        transferId: "transfer-1",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw ValidationError if transfer expired", async () => {
    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValue({
      ...mockTransfer,
      expiresAt: subDays(new Date(), 1),
    });

    await expect(
      canAcceptTransfer({
        userId: "user-2",
        transferId: "transfer-1",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw AuthorizationError if user is not intended recipient", async () => {
    await expect(
      canAcceptTransfer({
        userId: "user-3",
        transferId: "transfer-1",
      }),
    ).rejects.toThrow(AuthorizationError);
  });
});

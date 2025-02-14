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
  getTransferDeadline,
  isWithinTransferDeadline,
  getTransferValidUntil,
  isTransferExpired,
} from "@/lib/validations/transfer";

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

jest.mock("@/lib/validations/reservation", () => ({
  validateConsecutiveDates: jest.fn(),
}));

describe("canInitiateTransfer", () => {
  const futureReservationDate = addDays(new Date(), 5);
  const mockReservation = {
    id: "res-1",
    status: ReservationStatus.ACTIVE,
    primaryUserId: "user-1",
    reservationDate: futureReservationDate,
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
    jest.useFakeTimers().setSystemTime(new Date("2025-02-14T12:00:00Z"));
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(
      mockReservation,
    );
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockRecipient);
    (validateConsecutiveDates as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
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
    const pastReservation = {
      ...mockReservation,
      reservationDate: subDays(new Date(), 1),
    };
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(
      pastReservation,
    );

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

describe("getTransferDeadline", () => {
  it("should set deadline to 5 PM CT day before reservation", () => {
    // February 15, 2025 noon UTC
    const reservationDate = new Date("2025-02-15T12:00:00Z");
    const deadline = getTransferDeadline(reservationDate);

    // Should be February 14, 2025 at 5 PM Central Time
    expect(deadline.toISOString()).toBe("2025-02-14T23:00:00.000Z"); // 5 PM CT = 11 PM UTC
    expect(deadline.getUTCHours()).toBe(23); // 11 PM UTC
    expect(deadline.getUTCMinutes()).toBe(0);
    expect(deadline.getUTCSeconds()).toBe(0);
    expect(deadline.getUTCMilliseconds()).toBe(0);
  });

  it("should handle Central Time DST start (Spring Forward)", () => {
    // Reservation on March 11, 2025 (after DST starts)
    const reservationDate = new Date("2025-03-11T12:00:00Z");
    const deadline = getTransferDeadline(reservationDate);

    // Should be March 10, 2025 at 5 PM CT (DST)
    expect(deadline.toISOString()).toBe("2025-03-10T22:00:00.000Z"); // 5 PM CDT = 10 PM UTC
  });

  it("should handle Central Time DST end (Fall Back)", () => {
    // Reservation on November 3, 2025 (after DST ends)
    const reservationDate = new Date("2025-11-03T12:00:00Z");
    const deadline = getTransferDeadline(reservationDate);

    // Should be November 2, 2025 at 5 PM CT (non-DST)
    expect(deadline.toISOString()).toBe("2025-11-02T23:00:00.000Z"); // 5 PM CST = 11 PM UTC
  });
});

describe("isWithinTransferDeadline", () => {
  let mockReservationDate: Date;
  let mockCurrentTime: Date;

  beforeEach(() => {
    // Reset to a known state - February 15, 2025 reservation
    mockReservationDate = new Date("2025-02-15T12:00:00Z");
    mockCurrentTime = new Date("2025-02-14T21:00:00Z"); // 3 PM CT on day before
  });

  it("should return true when current time is before deadline", () => {
    const result = isWithinTransferDeadline(
      mockReservationDate,
      mockCurrentTime,
    );
    expect(result).toBe(true);
  });

  it("should return false when current time is after deadline", () => {
    // 5:01 PM CT day before
    mockCurrentTime = new Date("2025-02-14T23:01:00Z");
    const result = isWithinTransferDeadline(
      mockReservationDate,
      mockCurrentTime,
    );
    expect(result).toBe(false);
  });

  it("should return false when current time is on reservation day", () => {
    // 8 AM CT on reservation day
    mockCurrentTime = new Date("2025-02-15T14:00:00Z");
    const result = isWithinTransferDeadline(
      mockReservationDate,
      mockCurrentTime,
    );
    expect(result).toBe(false);
  });

  it("should use current time when no time provided", () => {
    const now = new Date("2025-02-14T21:00:00Z"); // 3 PM CT day before
    jest.useFakeTimers().setSystemTime(now);

    const result = isWithinTransferDeadline(mockReservationDate);
    expect(result).toBe(true);

    jest.useRealTimers();
  });

  it("should handle DST changes", () => {
    // Reservation during DST (March 11, 2025)
    mockReservationDate = new Date("2025-03-11T12:00:00Z");

    // 4:59 PM CDT day before (should pass)
    mockCurrentTime = new Date("2025-03-10T21:59:00Z");
    expect(isWithinTransferDeadline(mockReservationDate, mockCurrentTime)).toBe(
      true,
    );

    // 5:01 PM CDT day before (should fail)
    mockCurrentTime = new Date("2025-03-10T22:01:00Z");
    expect(isWithinTransferDeadline(mockReservationDate, mockCurrentTime)).toBe(
      false,
    );
  });
});

describe("getTransferValidUntil", () => {
  let mockReservationDate: Date;
  let mockCurrentTime: Date;

  beforeEach(() => {
    // Reset to a known state - February 15, 2025 reservation
    mockReservationDate = new Date("2025-02-15T12:00:00Z");
  });

  it("should return 24 hours from current time when that's earlier than transfer deadline", () => {
    // Set current time to 9 AM CT TWO days before (so 24 hours won't exceed deadline)
    mockCurrentTime = new Date("2025-02-13T15:00:00Z");
    const expiration = getTransferValidUntil(
      mockReservationDate,
      mockCurrentTime,
    );

    // Should be 24 hours from mockCurrentTime
    const expected = new Date("2025-02-14T15:00:00Z");
    expect(expiration.toISOString()).toBe(expected.toISOString());
  });

  it("should return transfer deadline when 24 hours would exceed it", () => {
    // Set current time to 2 PM CT day before (deadline is 5 PM CT)
    mockCurrentTime = new Date("2025-02-14T20:00:00Z");
    const expiration = getTransferValidUntil(
      mockReservationDate,
      mockCurrentTime,
    );

    // Should be deadline (5 PM CT = 11 PM UTC)
    expect(expiration.toISOString()).toBe("2025-02-14T23:00:00.000Z");
  });

  it("should handle DST start (Spring Forward)", () => {
    // Reservation on March 11, 2025 (after DST starts)
    mockReservationDate = new Date("2025-03-11T12:00:00Z");
    // Current time March 9, 2025 2 PM CDT (two days before)
    mockCurrentTime = new Date("2025-03-09T19:00:00Z");

    const expiration = getTransferValidUntil(
      mockReservationDate,
      mockCurrentTime,
    );

    // Should be 24 hours later since we're well before deadline
    const expected = new Date("2025-03-10T19:00:00Z");
    expect(expiration.toISOString()).toBe(expected.toISOString());
  });

  it("should handle DST end (Fall Back)", () => {
    // Reservation on November 3, 2025 (after DST ends)
    mockReservationDate = new Date("2025-11-03T12:00:00Z");
    // Current time November 1, 2025 9 AM CST (two days before)
    mockCurrentTime = new Date("2025-11-01T14:00:00Z");

    const expiration = getTransferValidUntil(
      mockReservationDate,
      mockCurrentTime,
    );

    // Should be 24 hours later since we're well before deadline
    const expected = new Date("2025-11-02T14:00:00Z");
    expect(expiration.toISOString()).toBe(expected.toISOString());
  });

  it("should use current time when no time provided", () => {
    // Set system time to 9 AM CT two days before
    const now = new Date("2025-02-13T15:00:00Z");
    jest.useFakeTimers().setSystemTime(now);

    const expiration = getTransferValidUntil(mockReservationDate);

    // Should be 24 hours from now
    const expected = new Date("2025-02-14T15:00:00Z");
    expect(expiration.toISOString()).toBe(expected.toISOString());

    jest.useRealTimers();
  });
});

describe("isTransferExpired", () => {
  let mockTransfer: {
    expiresAt: Date;
    reservation: {
      reservationDate: Date;
    };
  };
  let mockCurrentTime: Date;

  beforeEach(() => {
    // Reset to a known state
    mockTransfer = {
      expiresAt: new Date("2025-02-14T23:00:00Z"), // 5 PM CT
      reservation: {
        reservationDate: new Date("2025-02-15T12:00:00Z"), // noon UTC
      },
    };
    mockCurrentTime = new Date("2025-02-14T22:00:00Z"); // 4 PM CT
  });

  it("should return false when current time is before expiration and deadline", () => {
    const result = isTransferExpired(mockTransfer, mockCurrentTime);
    expect(result).toBe(false);
  });

  it("should return true when current time is after expiration", () => {
    mockCurrentTime = new Date("2025-02-14T23:30:00Z"); // 5:30 PM CT
    const result = isTransferExpired(mockTransfer, mockCurrentTime);
    expect(result).toBe(true);
  });

  it("should return true when current time is after transfer deadline", () => {
    // Set expiration to later time but we're past deadline
    mockTransfer.expiresAt = new Date("2025-02-15T02:00:00Z"); // 8 PM CT
    mockCurrentTime = new Date("2025-02-14T23:30:00Z"); // 5:30 PM CT

    const result = isTransferExpired(mockTransfer, mockCurrentTime);
    expect(result).toBe(true);
  });

  it("should handle DST changes", () => {
    // During DST
    mockTransfer = {
      expiresAt: new Date("2025-03-10T22:00:00Z"), // 5 PM CDT
      reservation: {
        reservationDate: new Date("2025-03-11T12:00:00Z"),
      },
    };

    // 4:59 PM CDT (should not be expired)
    mockCurrentTime = new Date("2025-03-10T21:59:00Z");
    expect(isTransferExpired(mockTransfer, mockCurrentTime)).toBe(false);

    // 5:01 PM CDT (should be expired)
    mockCurrentTime = new Date("2025-03-10T22:01:00Z");
    expect(isTransferExpired(mockTransfer, mockCurrentTime)).toBe(true);
  });

  it("should use current time when no time provided", () => {
    const now = new Date("2025-02-14T22:00:00Z"); // 4 PM CT
    jest.useFakeTimers().setSystemTime(now);

    const result = isTransferExpired(mockTransfer);
    expect(result).toBe(false);

    jest.useRealTimers();
  });
});

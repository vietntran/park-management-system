/**
 * @jest-environment node
 */
import {
  ReservationStatus,
  ReservationUserStatus,
  TransferStatus,
} from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import { NextRequest } from "next/server";
import { act } from "react";

import { GET, POST } from "@/app/api/reservations/transfer/route";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import { ValidationError } from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import { validateConsecutiveDates } from "@/lib/validations/reservation";

// Mock Next-Auth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock validateConsecutiveDates
jest.mock("@/lib/validations/reservation", () => ({
  validateConsecutiveDates: jest.fn().mockResolvedValue(true),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    reservation: {
      findUnique: jest.fn(),
    },
    reservationTransfer: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("POST /api/transfer", () => {
  const mockSession = {
    user: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "from@example.com",
      name: "From User",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const futureDateForValidTransfer = addDays(startOfDay(new Date()), 3);

  const mockReservation = {
    id: "123e4567-e89b-12d3-a456-426614174001",
    primaryUserId: "123e4567-e89b-12d3-a456-426614174000",
    reservationDate: futureDateForValidTransfer,
    status: ReservationStatus.ACTIVE,
    reservationUsers: [
      {
        userId: "123e4567-e89b-12d3-a456-426614174000",
        status: ReservationUserStatus.ACTIVE,
        isPrimary: true,
        user: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          email: "from@example.com",
          name: "From User",
        },
      },
    ],
    transfers: [],
  };

  const mockRecipient = {
    id: "123e4567-e89b-12d3-a456-426614174002",
    email: "to@example.com",
    name: "To User",
    reservationUsers: [],
  };

  const validTransferRequest = {
    reservationId: "123e4567-e89b-12d3-a456-426614174001",
    toUserId: "123e4567-e89b-12d3-a456-426614174002",
    spotsToTransfer: ["123e4567-e89b-12d3-a456-426614174000"],
    isPrimaryTransfer: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session mock
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);
  });

  test("creates a transfer request successfully", async () => {
    const now = new Date();
    // Set fixed dates
    const mockDates = {
      expiresAt: now.toISOString(),
      requestedAt: now.toISOString(),
      reservationDate: futureDateForValidTransfer.toISOString(),
    };

    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    // First findUnique for validation
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockReservation,
      reservationUsers: [
        {
          userId: mockSession.user.id,
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
          user: mockSession.user,
        },
      ],
      transfers: [],
      dateCapacity: {
        totalBookings: 30,
      },
    });

    // Second findUnique for deadline calculation
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockReservation,
      reservationDate: mockDates.reservationDate,
      dateCapacity: {
        totalBookings: 30,
      },
    });

    // Mock recipient find
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockRecipient,
      reservationUsers: [],
    });

    // Mock validateConsecutiveDates to return true
    (validateConsecutiveDates as jest.Mock).mockResolvedValueOnce(true);

    const mockTransfer = {
      id: "123e4567-e89b-12d3-a456-426614174003",
      ...validTransferRequest,
      status: TransferStatus.PENDING,
      expiresAt: mockDates.expiresAt,
      requestedAt: mockDates.requestedAt,
      respondedAt: null,
      fromUserId: "123e4567-e89b-12d3-a456-426614174000",
      fromUser: mockSession.user,
      toUser: mockRecipient,
      reservation: {
        ...mockReservation,
        reservationDate: mockDates.reservationDate,
        dateCapacity: {
          totalBookings: 30,
        },
      },
    };

    // Enhanced mock that validates the query structure
    (prisma.reservationTransfer.create as jest.Mock).mockImplementation(
      (args) => {
        // Check if the query has correct structure (no include and select on the same level)
        if (
          args.include?.reservation?.include &&
          args.include?.reservation?.select
        ) {
          throw new Error(
            "Please either use `include` or `select`, but not both at the same time.",
          );
        }
        return mockTransfer;
      },
    );

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(validTransferRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toEqual({
      ...mockTransfer,
      reservation: {
        ...mockTransfer.reservation,
        dateCapacity: {
          totalBookings: 30,
          remainingSpots: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - 30,
        },
      },
    });

    // Verify the structure of the Prisma query
    expect(prisma.reservationTransfer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Object),
        include: expect.objectContaining({
          fromUser: expect.any(Object),
          toUser: expect.any(Object),
          reservation: expect.objectContaining({
            include: expect.any(Object),
            // Should not have 'select' here
          }),
        }),
      }),
    );
  });

  test("returns 401 when user is not authenticated", async () => {
    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(validTransferRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  test("returns 400 when request validation fails", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    const invalidRequest = {
      ...validTransferRequest,
      reservationId: "not-a-uuid",
    };

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(invalidRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid uuid");
  });

  test("detects and fails on invalid Prisma query structure", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    // First findUnique for validation
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockReservation,
      reservationUsers: [
        {
          userId: mockSession.user.id,
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
          user: mockSession.user,
        },
      ],
      transfers: [],
    });

    // Second findUnique for deadline calculation
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockReservation,
    });

    // Mock recipient find
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockRecipient,
      reservationUsers: [],
    });

    // Mock the create function to throw a Prisma validation error
    (prisma.reservationTransfer.create as jest.Mock).mockImplementation(() => {
      throw new Error(
        "Please either use `include` or `select`, but not both at the same time.",
      );
    });

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(validTransferRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });

  test("returns 400 when reservation not found", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    // Mock reservation find to return null
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(validTransferRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Reservation not found or not active");
  });

  test("returns 400 when transfer deadline has passed", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    const reservationTomorrow = {
      ...mockReservation,
      reservationDate: addDays(startOfDay(new Date()), 1),
      reservationUsers: [
        {
          userId: mockSession.user.id,
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
          user: mockSession.user,
        },
      ],
      transfers: [],
    };

    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce(
      reservationTomorrow,
    );

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(validTransferRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Transfer deadline has passed");
  });

  test("returns 403 when non-primary user tries to transfer multiple spots", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    const nonPrimaryReservation = {
      ...mockReservation,
      primaryUserId: "other-user",
      reservationUsers: [
        {
          userId: mockSession.user.id,
          status: ReservationUserStatus.ACTIVE,
          isPrimary: false,
          user: mockSession.user,
        },
      ],
      transfers: [],
    };

    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce(
      nonPrimaryReservation,
    );

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify({
        ...validTransferRequest,
        spotsToTransfer: [
          "123e4567-e89b-12d3-a456-426614174000",
          "123e4567-e89b-12d3-a456-426614174002",
        ],
      }),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "Non-primary users can only transfer their own spot",
    );
  });

  test("returns 400 when recipient has maximum consecutive reservations", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    // Mock reservation find
    (prisma.reservation.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockReservation,
      reservationUsers: [
        {
          userId: mockSession.user.id,
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
          user: mockSession.user,
        },
      ],
      transfers: [],
    });

    // Mock recipient find
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      ...mockRecipient,
      reservationUsers: Array(3).fill({
        status: ReservationUserStatus.ACTIVE,
        reservation: {
          reservationDate: futureDateForValidTransfer,
        },
      }),
    });

    // Mock validateConsecutiveDates to throw error
    (validateConsecutiveDates as jest.Mock).mockRejectedValueOnce(
      new ValidationError("User has reached maximum consecutive reservations"),
    );

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "POST",
      body: JSON.stringify(validTransferRequest),
    }) as unknown as NextRequest;

    const response = await act(async () => await POST(request));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("maximum consecutive reservations");
  });
});

describe("GET /api/reservations/transfer", () => {
  const mockSession = {
    user: {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "from@example.com",
      name: "From User",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const futureDateForValidTransfer = addDays(
    startOfDay(new Date()),
    3,
  ).toISOString();

  const mockTransfer = {
    id: "123e4567-e89b-12d3-a456-426614174003",
    reservationId: "123e4567-e89b-12d3-a456-426614174001",
    fromUserId: mockSession.user.id,
    toUserId: "123e4567-e89b-12d3-a456-426614174002",
    expiresAt: new Date().toISOString(),
    isPrimaryTransfer: true,
    requestedAt: new Date().toISOString(),
    respondedAt: null,
    spotsToTransfer: [mockSession.user.id],
    status: TransferStatus.PENDING,
    fromUser: {
      id: mockSession.user.id,
      name: "From User",
      email: "from@example.com",
    },
    toUser: {
      id: "123e4567-e89b-12d3-a456-426614174002",
      name: "To User",
      email: "to@example.com",
    },
    reservation: {
      id: "123e4567-e89b-12d3-a456-426614174001",
      primaryUserId: mockSession.user.id,
      reservationDate: futureDateForValidTransfer,
      status: ReservationStatus.ACTIVE,
      canTransfer: true,
      reservationUsers: [
        {
          userId: mockSession.user.id,
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
          user: {
            id: mockSession.user.id,
            name: "From User",
            email: "from@example.com",
            emailVerified: null,
            isProfileComplete: true,
          },
        },
      ],
      dateCapacity: {
        totalBookings: 30,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);
    (prisma.reservationTransfer.findMany as jest.Mock).mockResolvedValue([
      mockTransfer,
    ]);
  });

  test("returns pending transfers successfully", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await act(async () => await GET(request));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual([
      {
        ...mockTransfer,
        reservation: {
          ...mockTransfer.reservation,
          dateCapacity: {
            totalBookings: 30,
            remainingSpots: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - 30,
          },
        },
      },
    ]);

    expect(prisma.reservationTransfer.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fromUserId: mockSession.user.id },
          { toUserId: mockSession.user.id },
        ],
        status: TransferStatus.PENDING,
      },
      include: expect.any(Object),
      orderBy: {
        requestedAt: "desc",
      },
    });
  });

  test("returns 401 when user is not authenticated", async () => {
    const request = new Request("http://localhost:3000/api/transfers", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await act(async () => await GET(request));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: "Authentication required",
    });
  });

  test("returns empty array when no pending transfers exist", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });
    (prisma.reservationTransfer.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await act(async () => await GET(request));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: [],
    });
  });

  test("handles database errors gracefully", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });
    const dbError = new Error("Database error");
    (prisma.reservationTransfer.findMany as jest.Mock).mockRejectedValue(
      dbError,
    );

    const request = new Request("http://localhost:3000/api/transfers", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await act(async () => await GET(request));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Internal server error",
    });
  });
});

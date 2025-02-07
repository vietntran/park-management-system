/**
 * @jest-environment node
 */
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { startOfDay } from "date-fns";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/reservations/create/route";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import { prisma } from "@/lib/prisma";

// Mock the minimum required imports
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(async (callback) => callback(prisma)),
    user: {
      findMany: jest.fn(),
    },
    dateCapacity: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    reservationUser: {
      findMany: jest.fn(),
    },
  },
}));

describe("Create Reservation API Route", () => {
  const mockUserId = "test-user-id";
  const validFutureDate = "2025-02-07";

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session mock
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);

    // Reset database mocks
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.user.findMany.mockResolvedValue([]);
    prisma.dateCapacity.findUnique.mockResolvedValue(null);
    prisma.dateCapacity.create.mockResolvedValue({
      date: new Date(validFutureDate),
      totalBookings: 1,
      maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    });
    prisma.reservation.findMany.mockResolvedValue([]);
    prisma.reservationUser.findMany.mockResolvedValue([]);
  });

  it("should return 401 when user is not authenticated", async () => {
    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: validFutureDate,
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("should validate request body format", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: "invalid-date",
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("Invalid date format");
  });

  it("should validate additional users exist and are verified", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock user not found
    prisma.user.findMany.mockResolvedValue([]);

    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: validFutureDate,
          additionalUsers: [
            {
              id: "123e4567-e89b-12d3-a456-426614174000", // Valid UUID format
              name: "Test User",
              email: "test@example.com",
            },
          ],
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("One or more selected users do not exist");
  });

  it("should validate date capacity", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock capacity full
    prisma.dateCapacity.findUnique.mockResolvedValue({
      date: new Date(validFutureDate),
      totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: validFutureDate,
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe("No available spots for this date");
  });

  it("should validate consecutive dates limit", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock existing consecutive reservations
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: "1",
        reservationDate: startOfDay(new Date("2025-02-04")),
        status: ReservationStatus.ACTIVE,
      },
      {
        id: "2",
        reservationDate: startOfDay(new Date("2025-02-05")),
        status: ReservationStatus.ACTIVE,
      },
      {
        id: "3",
        reservationDate: startOfDay(new Date("2025-02-06")),
        status: ReservationStatus.ACTIVE,
      },
    ]);

    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: validFutureDate, // 2025-02-07
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe(
      "Cannot make reservation. Users are limited to 3 consecutive days.",
    );
  });

  it("should successfully create a reservation", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    const mockReservation = {
      id: "new-reservation-id",
      primaryUserId: mockUserId,
      reservationDate: new Date(validFutureDate),
      createdAt: new Date(),
      status: ReservationStatus.ACTIVE,
      canTransfer: true,
      reservationUsers: [
        {
          reservationId: "new-reservation-id",
          userId: mockUserId,
          isPrimary: true,
          status: ReservationUserStatus.ACTIVE,
          addedAt: new Date(),
          cancelledAt: null,
          user: {
            id: mockUserId,
            name: "Test User",
            email: "test@example.com",
            emailVerified: true,
            isProfileComplete: true,
          },
        },
      ],
    };

    prisma.reservation.create.mockResolvedValue(mockReservation);
    prisma.dateCapacity.create.mockResolvedValue({
      date: new Date(validFutureDate),
      totalBookings: 1,
      maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: validFutureDate,
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.data.id).toBe(mockReservation.id);
    expect(body.data.primaryUserId).toBe(mockUserId);
    expect(body.data.status).toBe(ReservationStatus.ACTIVE);
    expect(body.data.reservationUsers).toHaveLength(1);
    expect(body.data.dateCapacity.totalBookings).toBe(1);
    expect(body.data.dateCapacity.remainingSpots).toBe(
      RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - 1,
    );
  });
});

/**
 * @jest-environment node
 */
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { startOfDay } from "date-fns";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/reservations/user/route";

// Mock the minimum required imports
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      findMany: jest.fn(),
    },
  },
}));

describe("User Reservations API Route", () => {
  const mockUserId = "test-user-id";
  // Set a fixed date for all tests
  const FIXED_DATE = "2025-02-07T00:00:00.000Z";

  beforeAll(() => {
    // Mock Date.now and new Date()
    const mockDate = new Date(FIXED_DATE);
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session mock
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);
  });

  it("should return 401 when user is not authenticated", async () => {
    const request = new Request("http://localhost:3000/api/reservations/user", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("should return empty array when user has no reservations", async () => {
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

    // Mock empty reservations array
    prisma.reservation.findMany.mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/reservations/user", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("should return active reservations for authenticated user", async () => {
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
      id: "res-123",
      primaryUserId: mockUserId,
      reservationDate: new Date("2025-03-01"),
      createdAt: new Date(),
      status: ReservationStatus.ACTIVE,
      canTransfer: true,
      reservationUsers: [
        {
          reservationId: "res-123",
          userId: mockUserId,
          isPrimary: true,
          status: ReservationUserStatus.ACTIVE,
          addedAt: new Date(),
          cancelledAt: null,
          user: {
            id: mockUserId,
            name: "Test User",
            email: "test@example.com",
            emailVerified: new Date(),
            isProfileComplete: true,
          },
        },
      ],
      dateCapacity: {
        totalBookings: 30,
        maxCapacity: 60,
      },
    };

    prisma.reservation.findMany.mockResolvedValue([mockReservation]);

    const request = new Request("http://localhost:3000/api/reservations/user", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("res-123");
    expect(body.data[0].primaryUserId).toBe(mockUserId);
    expect(body.data[0].reservationUsers).toHaveLength(1);
    expect(body.data[0].dateCapacity.remainingSpots).toBe(30); // 60 - 30

    // Verify Prisma was called with correct parameters
    expect(prisma.reservation.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { primaryUserId: mockUserId },
          {
            reservationUsers: {
              some: {
                userId: mockUserId,
                status: ReservationUserStatus.ACTIVE,
              },
            },
          },
        ],
        status: ReservationStatus.ACTIVE,
        reservationDate: { gte: startOfDay(new Date(FIXED_DATE)) },
      },
      orderBy: {
        reservationDate: "asc",
      },
      include: expect.any(Object),
    });
  });

  it("should return both primary and additional user reservations", async () => {
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

    const mockReservations = [
      {
        // Primary user reservation
        id: "res-123",
        primaryUserId: mockUserId,
        reservationDate: new Date("2025-03-01"),
        createdAt: new Date(),
        status: ReservationStatus.ACTIVE,
        canTransfer: true,
        reservationUsers: [
          {
            reservationId: "res-123",
            userId: mockUserId,
            isPrimary: true,
            status: ReservationUserStatus.ACTIVE,
            addedAt: new Date(),
            cancelledAt: null,
            user: {
              id: mockUserId,
              name: "Test User",
              email: "test@example.com",
              emailVerified: new Date(),
              isProfileComplete: true,
            },
          },
        ],
        dateCapacity: {
          totalBookings: 30,
          maxCapacity: 60,
        },
      },
      {
        // Additional user reservation
        id: "res-456",
        primaryUserId: "other-user-id",
        reservationDate: new Date("2025-03-02"),
        createdAt: new Date(),
        status: ReservationStatus.ACTIVE,
        canTransfer: true,
        reservationUsers: [
          {
            reservationId: "res-456",
            userId: mockUserId,
            isPrimary: false,
            status: ReservationUserStatus.ACTIVE,
            addedAt: new Date(),
            cancelledAt: null,
            user: {
              id: mockUserId,
              name: "Test User",
              email: "test@example.com",
              emailVerified: new Date(),
              isProfileComplete: true,
            },
          },
        ],
        dateCapacity: {
          totalBookings: 25,
          maxCapacity: 60,
        },
      },
    ];

    prisma.reservation.findMany.mockResolvedValue(mockReservations);

    const request = new Request("http://localhost:3000/api/reservations/user", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveLength(2);

    // Verify both types of reservations are returned
    expect(body.data[0].id).toBe("res-123");
    expect(body.data[0].primaryUserId).toBe(mockUserId);
    expect(body.data[1].id).toBe("res-456");
    expect(body.data[1].primaryUserId).toBe("other-user-id");
  });

  it("should only return active and future/today reservations", async () => {
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

    // Create mock reservations
    const mockReservations = [
      {
        id: "future-active",
        primaryUserId: mockUserId,
        reservationDate: new Date("2025-03-01"),
        status: ReservationStatus.ACTIVE,
        reservationUsers: [],
        dateCapacity: { totalBookings: 30, maxCapacity: 60 },
      },
    ];

    prisma.reservation.findMany.mockResolvedValue(mockReservations);

    const request = new Request("http://localhost:3000/api/reservations/user", {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    const body = await response.json();

    // Verify Prisma query filters
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ReservationStatus.ACTIVE,
          reservationDate: { gte: startOfDay(new Date(FIXED_DATE)) },
        }),
      }),
    );

    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("future-active");
  });
});

/**
 * @jest-environment node
 */
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/reservations/[id]/cancel/route";
import { prisma } from "@/lib/prisma";
import { RouteContext } from "@/types/route";

// Mock the minimum required imports
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((operations) => {
      // If operations is an array, execute each operation
      if (Array.isArray(operations)) {
        return Promise.all(operations);
      }
      // If operations is a callback, execute it with prisma
      return operations(prisma);
    }),
    reservation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reservationUser: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    dateCapacity: {
      update: jest.fn(),
    },
  },
}));

describe("Cancel Reservation API Route", () => {
  const mockUserId = "123e4567-e89b-12d3-a456-426614174001";
  const mockReservationId = "123e4567-e89b-12d3-a456-426614174000";
  const mockReservationDate = new Date("2025-02-07");

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
    prisma.reservation.findUnique.mockResolvedValue(null);
  });

  it("should return 401 when user is not authenticated", async () => {
    const request = new Request(
      "http://localhost:3000/api/reservations/cancel",
      {
        method: "POST",
      },
    ) as unknown as NextRequest;

    const context = {
      params: { id: mockReservationId },
    };

    const response = await POST(request, context);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("should validate reservation exists", async () => {
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

    prisma.reservation.findUnique.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/reservations/cancel",
      {
        method: "POST",
      },
    ) as unknown as NextRequest;

    const context = {
      params: { id: mockReservationId },
    };

    const response = await POST(request, context);
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe("Reservation not found");
  });

  it("should validate user is part of the reservation", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // Mock reservation with different users
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    prisma.reservation.findUnique.mockResolvedValue({
      id: mockReservationId,
      primaryUserId: "123e4567-e89b-12d3-a456-426614174002", // different UUID
      status: ReservationStatus.ACTIVE,
      reservationDate: mockReservationDate,
      reservationUsers: [
        {
          userId: "123e4567-e89b-12d3-a456-426614174002", // different UUID
          status: ReservationUserStatus.ACTIVE,
        },
      ],
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/cancel",
      {
        method: "POST",
      },
    ) as unknown as NextRequest;

    const context = {
      params: { id: mockReservationId },
    };

    const response = await POST(request, context);
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe("User not found in reservation");
  });

  it("should validate reservation is not already cancelled", async () => {
    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // Mock cancelled reservation
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    prisma.reservation.findUnique.mockResolvedValue({
      id: mockReservationId,
      primaryUserId: mockUserId,
      status: ReservationStatus.CANCELLED,
      reservationDate: mockReservationDate,
      reservationUsers: [
        { userId: mockUserId, status: ReservationUserStatus.CANCELLED },
      ],
    });

    const request: NextRequest = new Request(
      "http://localhost:3000/api/reservations/cancel",
      {
        method: "POST",
      },
    ) as unknown as NextRequest;

    const context = {
      params: { id: mockReservationId },
    };

    const response = await POST(request, context);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Reservation is already cancelled");
  });

  it("should successfully cancel entire reservation as primary user", async () => {
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

    // Mock active reservation with primary user
    prisma.reservation.findUnique.mockResolvedValue({
      id: mockReservationId,
      primaryUserId: mockUserId,
      status: ReservationStatus.ACTIVE,
      reservationDate: mockReservationDate,
      reservationUsers: [
        { userId: mockUserId, status: ReservationUserStatus.ACTIVE },
        {
          userId: "123e4567-e89b-12d3-a456-426614174003",
          status: ReservationUserStatus.ACTIVE,
        }, // different UUID
      ],
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/cancel",
      {
        method: "POST",
      },
    ) as unknown as NextRequest;

    const context = {
      params: { id: mockReservationId },
    };

    const response = await POST(request, context);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify Prisma calls
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.reservation.update).toHaveBeenCalledWith({
      where: { id: mockReservationId },
      data: { status: ReservationStatus.CANCELLED },
    });
    expect(prisma.reservationUser.updateMany).toHaveBeenCalledWith({
      where: { reservationId: mockReservationId },
      data: {
        status: ReservationUserStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      },
    });
    expect(prisma.dateCapacity.update).toHaveBeenCalledWith({
      where: { date: mockReservationDate },
      data: { totalBookings: { decrement: 2 } },
    });
  });

  it("should successfully cancel single spot as non-primary user", async () => {
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

    // Mock active reservation where user is not primary
    prisma.reservation.findUnique.mockResolvedValue({
      id: mockReservationId,
      primaryUserId: "123e4567-e89b-12d3-a456-426614174004", // different UUID
      status: ReservationStatus.ACTIVE,
      reservationDate: mockReservationDate,
      reservationUsers: [
        {
          userId: "123e4567-e89b-12d3-a456-426614174004",
          status: ReservationUserStatus.ACTIVE,
        }, // primary user
        { userId: mockUserId, status: ReservationUserStatus.ACTIVE }, // current user
      ],
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/cancel",
      {
        method: "POST",
      },
    ) as unknown as NextRequest;

    const context = {
      params: { id: mockReservationId },
    };

    const response = await POST(request, context);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    // Verify Prisma calls
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.reservationUser.update).toHaveBeenCalledWith({
      where: {
        reservationId_userId: {
          reservationId: mockReservationId,
          userId: mockUserId,
        },
      },
      data: {
        status: ReservationUserStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      },
    });
    expect(prisma.dateCapacity.update).toHaveBeenCalledWith({
      where: { date: mockReservationDate },
      data: { totalBookings: { decrement: 1 } },
    });
  });
  describe("Error Handling", () => {
    it("should handle missing route parameters", async () => {
      // Mock authenticated session
      (
        jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
      ).getServerSession.mockResolvedValue({
        user: { id: mockUserId },
      });

      const request = new Request(
        "http://localhost:3000/api/reservations/cancel",
        {
          method: "POST",
        },
      ) as unknown as NextRequest;

      // Pass empty object as context, casting as RouteContext and omitting the params property entirely
      const response = await POST(request, {} as RouteContext);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Reservation ID is required");
    });

    it("should handle database transaction failure and rollback", async () => {
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

      // Mock active reservation with primary user
      prisma.reservation.findUnique.mockResolvedValue({
        id: mockReservationId,
        primaryUserId: mockUserId,
        status: ReservationStatus.ACTIVE,
        reservationDate: mockReservationDate,
        reservationUsers: [
          { userId: mockUserId, status: ReservationUserStatus.ACTIVE },
        ],
      });

      // Mock transaction to fail before any operations
      prisma.$transaction.mockImplementation(() => {
        throw new Error("Database error");
      });

      const request = new Request(
        "http://localhost:3000/api/reservations/cancel",
        {
          method: "POST",
        },
      ) as unknown as NextRequest;

      const context = {
        params: { id: mockReservationId },
      };

      const response = await POST(request, context);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Internal server error");

      // Verify transaction was attempted
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    // This resolves a Typescript error in the test
    type PrismaOperation =
      | Promise<unknown>[]
      // @ts-expect-error - Ignore prisma self-referential type
      | ((prisma: typeof prisma) => Promise<unknown>);
    it("should handle concurrent cancellation attempts", async () => {
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

      // Mock active reservation
      const mockReservation = {
        id: mockReservationId,
        primaryUserId: mockUserId,
        status: ReservationStatus.ACTIVE,
        reservationDate: mockReservationDate,
        reservationUsers: [
          { userId: mockUserId, status: ReservationUserStatus.ACTIVE },
        ],
      };

      // First call returns active reservation, second call returns cancelled
      let callCount = 0;
      prisma.reservation.findUnique.mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          callCount === 1
            ? mockReservation
            : {
                ...mockReservation,
                status: ReservationStatus.CANCELLED,
              },
        );
      });

      // Reset transaction mock to succeed
      prisma.$transaction.mockImplementation(
        async (operations: PrismaOperation) => {
          if (Array.isArray(operations)) {
            return Promise.all(operations);
          }
          // If it's a function, call it with prisma
          if (typeof operations === "function") {
            return operations(prisma);
          }
          return operations;
        },
      );

      const request = new Request(
        "http://localhost:3000/api/reservations/cancel",
        {
          method: "POST",
        },
      ) as unknown as NextRequest;

      const context = {
        params: { id: mockReservationId },
      };

      // Send two concurrent requests
      const [response1, response2] = await Promise.all([
        POST(request, context),
        POST(request, context),
      ]);

      // First request should succeed
      expect(response1.status).toBe(200);
      const body1 = await response1.json();
      expect(body1.success).toBe(true);

      // Second request should fail as already cancelled
      expect(response2.status).toBe(400);
      const body2 = await response2.json();
      expect(body2.error).toBe("Reservation is already cancelled");

      // Verify transaction was only executed once
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

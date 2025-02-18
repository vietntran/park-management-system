/**
 * @jest-environment node
 */
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { act } from "react";

import { GET } from "@/app/api/reservations/[id]/route";
import { prisma } from "@/lib/prisma";
import { TEST_UUIDS } from "@/test-utils/constants";
import { createMockReservation } from "@/test-utils/factories/reservationFactory";
import { createMockUser } from "@/test-utils/factories/userFactory";

// Mock Next-Auth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      findUnique: jest.fn(),
    },
  },
}));

describe("GET /api/reservations/[id]", () => {
  const mockUser = createMockUser({
    id: TEST_UUIDS.USERS.PRIMARY,
    emailVerified: new Date(),
    isProfileComplete: true,
  });

  const mockReservation = createMockReservation({
    id: TEST_UUIDS.RESERVATIONS.FIRST,
    primaryUserId: mockUser.id,
    status: ReservationStatus.ACTIVE,
    reservationUsers: [
      {
        userId: mockUser.id,
        status: ReservationUserStatus.ACTIVE,
        isPrimary: true,
        addedAt: new Date(),
        cancelledAt: null,
        reservationId: TEST_UUIDS.RESERVATIONS.FIRST,
        user: mockUser,
      },
    ],
    dateCapacity: {
      totalBookings: 30,
      remainingSpots: 30,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);
  });

  test("returns reservation when user is authenticated and has access", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: TEST_UUIDS.USERS.PRIMARY },
    });

    // Convert dates to ISO strings to match API response format
    const mockReservationWithStringDates = {
      ...mockReservation,
      createdAt: mockReservation.createdAt.toISOString(),
      date: mockReservation.date.toISOString(),
      reservationUsers: [
        {
          ...mockReservation.reservationUsers?.[0],
          addedAt: mockReservation.reservationUsers?.[0].addedAt.toISOString(),
          user: {
            id: mockReservation.reservationUsers?.[0].user?.id || "",
            name: mockReservation.reservationUsers?.[0].user?.name || "",
            email: mockReservation.reservationUsers?.[0].user?.email || "",
            emailVerified:
              mockReservation.reservationUsers?.[0].user?.emailVerified?.toISOString() ||
              null,
            isProfileComplete:
              mockReservation.reservationUsers?.[0].user?.isProfileComplete ||
              false,
          },
        },
      ],
    };

    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(
      mockReservationWithStringDates,
    );

    const request = new Request(
      `http://localhost:3000/api/reservations/${TEST_UUIDS.RESERVATIONS.FIRST}`,
      { method: "GET" },
    ) as unknown as NextRequest;

    const context = {
      params: { id: TEST_UUIDS.RESERVATIONS.FIRST },
    };

    const response = await act(async () => await GET(request, context));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockReservationWithStringDates);
  });

  test("returns 401 when user is not authenticated", async () => {
    const request = new Request(
      `http://localhost:3000/api/reservations/${TEST_UUIDS.RESERVATIONS.FIRST}`,
      { method: "GET" },
    ) as unknown as NextRequest;

    const context = {
      params: { id: TEST_UUIDS.RESERVATIONS.FIRST },
    };

    const response = await act(async () => await GET(request, context));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  test("returns 400 for invalid UUID format", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: TEST_UUIDS.USERS.PRIMARY },
    });

    const request = new Request(
      "http://localhost:3000/api/reservations/invalid-uuid",
      { method: "GET" },
    ) as unknown as NextRequest;

    const context = {
      params: { id: "invalid-uuid" },
    };

    const response = await act(async () => await GET(request, context));
    const data = await response.json();

    expect(response.status).toBe(400);
    // Parse the stringified error
    const parsedError =
      typeof data.error === "string" ? JSON.parse(data.error) : data.error;
    expect(parsedError).toEqual([
      {
        validation: "uuid",
        code: "invalid_string",
        message: "Invalid reservation ID format",
        path: ["id"],
      },
    ]);
  });

  test("returns 400 when reservation is not found", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: TEST_UUIDS.USERS.PRIMARY },
    });

    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new Request(
      `http://localhost:3000/api/reservations/${TEST_UUIDS.RESERVATIONS.NOT_FOUND}`,
      { method: "GET" },
    ) as unknown as NextRequest;

    const context = {
      params: { id: TEST_UUIDS.RESERVATIONS.NOT_FOUND },
    };

    const response = await act(async () => await GET(request, context));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Reservation not found");
  });

  test("returns 401 when user does not have access to reservation", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: TEST_UUIDS.USERS.THIRD }, // Different user
    });

    (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(
      mockReservation,
    );

    const request = new Request(
      `http://localhost:3000/api/reservations/${TEST_UUIDS.RESERVATIONS.FIRST}`,
      { method: "GET" },
    ) as unknown as NextRequest;

    const context = {
      params: { id: TEST_UUIDS.RESERVATIONS.FIRST },
    };

    const response = await act(async () => await GET(request, context));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("You don't have access to this reservation");
  });

  test("handles database errors gracefully", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: TEST_UUIDS.USERS.PRIMARY },
    });

    const dbError = new Error("Database error");
    (prisma.reservation.findUnique as jest.Mock).mockRejectedValue(dbError);

    const request = new Request(
      `http://localhost:3000/api/reservations/${TEST_UUIDS.RESERVATIONS.FIRST}`,
      { method: "GET" },
    ) as unknown as NextRequest;

    const context = {
      params: { id: TEST_UUIDS.RESERVATIONS.FIRST },
    };

    const response = await act(async () => await GET(request, context));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

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

import { PATCH } from "@/app/api/reservations/transfer/[id]/route";
import { prisma } from "@/lib/prisma";

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
    $transaction: jest.fn((callback) => callback(prisma)),
    reservationTransfer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reservationUser: {
      update: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    reservation: {
      update: jest.fn(),
      findMany: jest.fn(), // Added for canAcceptTransfer validation
    },
  },
}));

describe("PATCH /api/reservations/transfer/:id", () => {
  const mockSession = {
    user: {
      id: "123e4567-e89b-12d3-a456-426614174002", // recipient ID
      email: "to@example.com",
      name: "To User",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

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
      status: ReservationStatus.ACTIVE,
      canTransfer: true,
      reservationUsers: [
        {
          userId: "123e4567-e89b-12d3-a456-426614174000",
          status: ReservationUserStatus.ACTIVE,
          isPrimary: true,
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
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset session mock
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);

    // Reset Prisma mocks with proper return values
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.reservationTransfer.update as jest.Mock).mockImplementation(
      (params) => {
        return Promise.resolve({
          ...mockTransfer,
          ...params.data,
        });
      },
    );
  });

  test("accepts transfer request successfully", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    (prisma.reservationUser.findUnique as jest.Mock).mockResolvedValue(null);

    // Mock findUnique to return a valid transfer
    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValue(
      mockTransfer,
    );

    // Mock reservation.findMany for canAcceptTransfer validation
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    // Mock successful update of reservation users
    (prisma.reservationUser.update as jest.Mock).mockResolvedValue({
      status: ReservationUserStatus.CANCELLED,
      cancelledAt: new Date(),
    });

    (prisma.reservationUser.create as jest.Mock).mockResolvedValue({
      status: ReservationUserStatus.ACTIVE,
    });

    // Mock reservation transfer update
    (prisma.reservationTransfer.update as jest.Mock).mockResolvedValue({
      ...mockTransfer,
      status: TransferStatus.ACCEPTED,
      respondedAt: new Date(),
    });

    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe(TransferStatus.ACCEPTED);
    expect(prisma.reservationUser.update).toHaveBeenCalled();
    expect(prisma.reservationUser.create).toHaveBeenCalled();
  });

  test("declines transfer request successfully", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValueOnce(
      mockTransfer,
    );

    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe(TransferStatus.DECLINED);
    expect(prisma.reservationUser.update).not.toHaveBeenCalled();
    expect(prisma.reservationUser.create).not.toHaveBeenCalled();
  });

  test("returns 401 when user is not authenticated", async () => {
    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Authentication required");
  });

  test("returns 400 when transfer is not found", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValueOnce(
      null,
    );

    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Transfer not found or not pending");
  });

  test("returns 403 when user is not the intended recipient", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: "wrong-user-id" },
    });

    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValueOnce(
      mockTransfer,
    );

    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "User is not the intended recipient of this transfer",
    );
  });

  test("returns 400 when transfer is no longer pending", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    const completedTransfer = {
      ...mockTransfer,
      status: TransferStatus.ACCEPTED,
    };

    // Mock findUnique to return a non-pending transfer
    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValue(
      completedTransfer,
    );

    // Mock reservation.findMany for canAcceptTransfer validation
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("Transfer is no longer pending");
  });

  test("returns 400 when transfer has expired", async () => {
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockSession.user.id },
    });

    const expiredTransfer = {
      ...mockTransfer,
      expiresAt: addDays(new Date(), -1), // expired yesterday
    };

    // Mock findUnique to return an expired transfer
    (prisma.reservationTransfer.findUnique as jest.Mock).mockResolvedValue(
      expiredTransfer,
    );

    // Mock reservation.findMany for canAcceptTransfer validation
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    // Reset the mocks before the test
    (prisma.reservationTransfer.update as jest.Mock).mockReset();

    // Setup mock for the update call
    (prisma.reservationTransfer.update as jest.Mock).mockImplementation(
      ({ where, data }) => {
        if (
          where.id === mockTransfer.id &&
          data.status === TransferStatus.EXPIRED
        ) {
          return Promise.resolve({
            ...expiredTransfer,
            status: TransferStatus.EXPIRED,
          });
        }
        return Promise.resolve(null);
      },
    );

    const request = new Request("http://localhost:3000/api/transfers/123", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    }) as unknown as NextRequest;

    const context = { params: { id: mockTransfer.id } };

    const response = await act(async () => await PATCH(request, context));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Transfer has expired");
  });
});

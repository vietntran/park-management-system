/**
 * @jest-environment node
 */
import { startOfDay } from "date-fns";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/reservations/check-availability/route";
import { RESERVATION_LIMITS } from "@/constants/reservation";

// Mock next-auth
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    dateCapacity: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Check Availability API Route", () => {
  const validFutureDate = "2025-02-07";

  beforeEach(() => {
    jest.clearAllMocks();

    // Set system time to day before our test date
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-02-06"));

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
    prisma.dateCapacity.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return available status for valid future date with no existing reservations", async () => {
    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", validFutureDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.isAvailable).toBe(true);
    expect(body.data.remainingSpots).toBe(
      RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    );
    expect(body.data.date).toBe(
      startOfDay(new Date(validFutureDate)).toISOString(),
    );
  });

  it("should reject reservations for same day or past dates", async () => {
    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );

    // Test with current date (same day)
    url.searchParams.set("date", "2025-02-06"); // Same as our mocked system time
    const sameDay = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const sameDayResponse = await GET(sameDay);
    expect(sameDayResponse.status).toBe(400);

    const sameDayBody = await sameDayResponse.json();
    expect(sameDayBody.error).toBe(
      "Reservations can be made up to 11:59 PM for the following day",
    );

    // Test with past date
    url.searchParams.set("date", "2025-02-05"); // Day before our mocked system time
    const pastDate = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const pastDateResponse = await GET(pastDate);
    expect(pastDateResponse.status).toBe(400);

    const pastDateBody = await pastDateResponse.json();
    expect(pastDateBody.error).toBe(
      "Reservations can be made up to 11:59 PM for the following day",
    );
  });

  it("should return unavailable status when date is at capacity", async () => {
    // Mock date capacity at limit
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.dateCapacity.findUnique.mockResolvedValue({
      date: new Date(validFutureDate),
      maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    });

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", validFutureDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(409); // Conflict

    const body = await response.json();
    expect(body.error).toBe("No available spots for this date");
  });
});

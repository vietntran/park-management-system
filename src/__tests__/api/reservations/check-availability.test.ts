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

jest.mock("@/lib/prisma", () => ({
  prisma: {
    dateCapacity: {
      findUnique: jest.fn(),
    },
    reservation: {
      findMany: jest.fn(),
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

  it("should return partial capacity status when some spots are taken", async () => {
    // Mock date capacity with some spots taken
    const takenSpots = 20;
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.dateCapacity.findUnique.mockResolvedValue({
      date: new Date(validFutureDate),
      maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      totalBookings: takenSpots,
    });

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
      RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - takenSpots,
    );
  });

  it("should return almost full status when only one spot remains", async () => {
    // Mock date capacity with only one spot remaining
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.dateCapacity.findUnique.mockResolvedValue({
      date: new Date(validFutureDate),
      maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - 1,
    });

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
    expect(body.data.remainingSpots).toBe(1);
  });

  it("should return full capacity status accurately", async () => {
    // Mock date capacity at exact limit
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
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe("No available spots for this date");
  });
});

describe("Consecutive Dates Validation", () => {
  const mockUserId = "user123";

  beforeEach(() => {
    jest.clearAllMocks();

    // Set system time
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-02-06"));

    // Mock authenticated session
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });

    // Reset database mocks
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Reset dateCapacity to indicate availability
    prisma.dateCapacity.findUnique.mockResolvedValue(null);
    prisma.reservation.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should reject when user hits consecutive dates limit", async () => {
    // Mock existing reservations for 3 consecutive days
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock findMany to return reservations with correct schema
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: "1",
        reservationDate: new Date("2025-02-07"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
      {
        id: "2",
        reservationDate: new Date("2025-02-08"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
      {
        id: "3",
        reservationDate: new Date("2025-02-09"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
    ]);

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", "2025-02-10"); // Trying to book a 4th consecutive day

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe(
      "Cannot make reservation. Users are limited to 3 consecutive days.",
    );
  });

  it("should allow when user is approaching but not at consecutive limit", async () => {
    // Mock existing reservations for 2 consecutive days
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: "1",
        reservationDate: new Date("2025-02-07"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
      {
        id: "2",
        reservationDate: new Date("2025-02-08"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
    ]);

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", "2025-02-09"); // Third consecutive day should be allowed

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.isAvailable).toBe(true);
  });

  it("should allow non-consecutive reservations", async () => {
    // Mock existing non-consecutive reservations
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([
      {
        id: "1",
        reservationDate: new Date("2025-02-07"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
      {
        id: "2",
        reservationDate: new Date("2025-02-09"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
      {
        id: "3",
        reservationDate: new Date("2025-02-11"),
        status: "CONFIRMED",
        reservationUsers: [{ userId: mockUserId }],
      },
    ]);

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", "2025-02-13"); // Non-consecutive date

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.isAvailable).toBe(true);
  });
});

describe("Error Handling", () => {
  const validFutureDate = "2025-02-07";
  const mockUserId = "user123";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-02-06"));

    // Mock authenticated session by default for these tests
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: { id: mockUserId },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should handle database errors during capacity check", async () => {
    // Mock database error
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.dateCapacity.findUnique.mockRejectedValue(
      new Error("Database connection error"),
    );

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", validFutureDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("should handle database errors during consecutive dates check", async () => {
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock successful capacity check but failed reservations query
    prisma.dateCapacity.findUnique.mockResolvedValue(null);
    prisma.reservation.findMany.mockRejectedValue(
      new Error("Database connection error"),
    );

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", validFutureDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("should handle unexpected errors in validateConsecutiveDates", async () => {
    // Mock unexpected error that's not a ConflictError
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock successful capacity check
    prisma.dateCapacity.findUnique.mockResolvedValue(null);

    // Mock reservations query to throw unexpected error
    prisma.reservation.findMany.mockImplementation(() => {
      throw new Error("Unexpected validation error");
    });

    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", validFutureDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("should handle missing date parameter", async () => {
    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    // Intentionally not setting date parameter

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Date parameter is required");
  });

  it("should handle invalid date format", async () => {
    const url = new URL(
      "http://localhost:3000/api/reservations/check-availability",
    );
    url.searchParams.set("date", "invalid-date");

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Invalid date format");
  });
});

/**
 * @jest-environment node
 */
import { addDays } from "date-fns";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/reservations/availability/route";
import { RESERVATION_LIMITS } from "@/constants/reservation";

// Mock Next.js headers
jest.mock("next/headers", () => ({
  headers: () => ({
    get: jest.fn().mockReturnValue("127.0.0.1"),
  }),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    dateCapacity: {
      findMany: jest.fn(),
    },
  },
}));

describe("Reservations Availability API Route", () => {
  // Set a fixed date for all tests
  const FIXED_DATE = "2025-02-07T00:00:00.000Z";
  const validStartDate = "2025-02-08"; // One day after fixed date
  const validEndDate = "2025-02-11"; // Four days after fixed date

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

    // Reset database mocks
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.dateCapacity.findMany.mockResolvedValue([]);
  });

  it("should return validation error when date parameters are missing", async () => {
    // Test with missing start date
    const urlMissingStart = new URL(
      "http://localhost:3000/api/reservations/availability",
    );
    urlMissingStart.searchParams.set("end", validEndDate);

    const requestMissingStart = new Request(urlMissingStart, {
      method: "GET",
    }) as unknown as NextRequest;

    const responseMissingStart = await GET(requestMissingStart);
    expect(responseMissingStart.status).toBe(400);

    const bodyMissingStart = await responseMissingStart.json();
    expect(bodyMissingStart.error).toBe(
      "Both start and end dates are required",
    );

    // Test with missing end date
    const urlMissingEnd = new URL(
      "http://localhost:3000/api/reservations/availability",
    );
    urlMissingEnd.searchParams.set("start", validStartDate);

    const requestMissingEnd = new Request(urlMissingEnd, {
      method: "GET",
    }) as unknown as NextRequest;

    const responseMissingEnd = await GET(requestMissingEnd);
    expect(responseMissingEnd.status).toBe(400);

    const bodyMissingEnd = await responseMissingEnd.json();
    expect(bodyMissingEnd.error).toBe("Both start and end dates are required");
  });

  it("should return validation error when start date is after end date", async () => {
    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", validEndDate); // Using end date as start
    url.searchParams.set("end", validStartDate); // Using start date as end

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Start date must be before or equal to end date");
  });

  it("should return available dates when no existing reservations", async () => {
    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", validStartDate);
    url.searchParams.set("end", validEndDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();

    // Should return all dates in range as available since no reservations exist
    const expectedDates = Array.from({ length: 4 }, (_, i) =>
      addDays(new Date(validStartDate), i).toISOString(),
    );

    expect(body.data.availableDates).toHaveLength(4); // 4 days between Feb 7-10
    expect(body.data.availableDates).toEqual(expectedDates);
    expect(body.data.maxCapacity).toBe(
      RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    );
  });

  it("should exclude dates at full capacity", async () => {
    // Mock a date being at full capacity
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    const fullDate = new Date(validStartDate); // Feb 7
    prisma.dateCapacity.findMany.mockResolvedValue([
      {
        date: fullDate,
        totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
    ]);

    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", validStartDate);
    url.searchParams.set("end", validEndDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();

    // Should exclude Feb 7 (at capacity) but include Feb 8-10
    const expectedDates = Array.from({ length: 3 }, (_, i) =>
      addDays(new Date(validStartDate), i + 1).toISOString(),
    );

    expect(body.data.availableDates).toHaveLength(3);
    expect(body.data.availableDates).toEqual(expectedDates);
    expect(body.data.maxCapacity).toBe(
      RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    );
  });

  it("should handle single day range (start = end)", async () => {
    const singleDate = validStartDate; // Using validStartDate instead of fixed date
    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", singleDate);
    url.searchParams.set("end", singleDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.availableDates).toHaveLength(1);
    expect(body.data.availableDates[0]).toBe(
      new Date(singleDate).toISOString(),
    );
  });

  it("should reject queries with past start date", async () => {
    const pastDate = "2025-02-06"; // One day before our fixed date
    const nearFutureDate = "2025-02-28";
    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", pastDate);
    url.searchParams.set("end", nearFutureDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Start date must not be in the past");
  });

  // Capacity Edge Cases Tests
  it("should handle mixed capacity dates correctly", async () => {
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    // Mock dates with different capacities
    prisma.dateCapacity.findMany.mockResolvedValue([
      {
        date: new Date(validStartDate), // Feb 8 - Full
        totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
      {
        date: addDays(new Date(validStartDate), 1), // Feb 9 - Partial
        totalBookings: 30,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
      // Feb 10 - No record, should be completely available
      {
        date: addDays(new Date(validStartDate), 3), // Feb 11 - Almost full
        totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - 1,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
    ]);

    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", validStartDate);
    url.searchParams.set("end", validEndDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();

    // Should exclude Feb 8 (full) but include Feb 9 (partial), Feb 10 (empty), and Feb 11 (almost full)
    expect(body.data.availableDates).toHaveLength(3);
    expect(body.data.availableDates).toEqual([
      addDays(new Date(validStartDate), 1).toISOString(), // Feb 9
      addDays(new Date(validStartDate), 2).toISOString(), // Feb 10
      addDays(new Date(validStartDate), 3).toISOString(), // Feb 11
    ]);
  });

  it("should handle dates at exact MAX_DAILY_RESERVATIONS", async () => {
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    prisma.dateCapacity.findMany.mockResolvedValue([
      {
        date: new Date(validStartDate),
        totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
    ]);

    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", validStartDate);
    url.searchParams.set("end", validStartDate); // Single day test

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.availableDates).toHaveLength(0); // Should be empty as date is at capacity
  });

  it("should include dates with MAX_DAILY_RESERVATIONS - 1", async () => {
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    prisma.dateCapacity.findMany.mockResolvedValue([
      {
        date: new Date(validStartDate),
        totalBookings: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS - 1,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
    ]);

    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", validStartDate);
    url.searchParams.set("end", validStartDate);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.availableDates).toHaveLength(1); // Should include the date
    expect(body.data.availableDates[0]).toBe(
      new Date(validStartDate).toISOString(),
    );
  });

  it("should reject queries exceeding MAX_MONTHS_RANGE", async () => {
    const start = "2025-02-07";
    const exceedingEnd = "2025-06-07"; // 4 months range
    const url = new URL("http://localhost:3000/api/reservations/availability");
    url.searchParams.set("start", start);
    url.searchParams.set("end", exceedingEnd);

    const request = new Request(url, {
      method: "GET",
    }) as unknown as NextRequest;
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Date range cannot exceed 3 months");
  });
});

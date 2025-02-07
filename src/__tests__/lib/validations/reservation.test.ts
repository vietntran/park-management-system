// src/__tests__/lib/validations/reservation.test.ts

import { addDays, startOfDay, subDays } from "date-fns";

import { ConflictError } from "@/lib/errors/ApplicationErrors";
import {
  validateConsecutiveDates,
  isBeforeNextDay,
} from "@/lib/validations/reservation";

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    reservation: {
      findMany: jest.fn(),
    },
  },
}));

describe("validateConsecutiveDates", () => {
  const mockUserId = "user123";
  const baseDate = new Date("2025-02-07");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow first reservation", async () => {
    // Mock no existing reservations
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([]);

    await expect(validateConsecutiveDates(mockUserId, baseDate)).resolves.toBe(
      true,
    );
  });

  it("should allow non-consecutive reservations", async () => {
    // Mock non-consecutive reservations
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([
      {
        reservationDate: addDays(baseDate, -3),
      },
      {
        reservationDate: addDays(baseDate, -1),
      },
    ]);

    await expect(validateConsecutiveDates(mockUserId, baseDate)).resolves.toBe(
      true,
    );
  });

  it("should allow exactly three consecutive days", async () => {
    // Mock two consecutive existing reservations
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([
      {
        reservationDate: addDays(baseDate, -2),
      },
      {
        reservationDate: addDays(baseDate, -1),
      },
    ]);

    await expect(validateConsecutiveDates(mockUserId, baseDate)).resolves.toBe(
      true,
    );
  });

  it("should reject more than three consecutive days", async () => {
    // Mock three consecutive existing reservations
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([
      {
        reservationDate: addDays(baseDate, -2),
      },
      {
        reservationDate: addDays(baseDate, -1),
      },
      {
        reservationDate: baseDate,
      },
    ]);

    await expect(
      validateConsecutiveDates(mockUserId, addDays(baseDate, 1)),
    ).rejects.toThrow(ConflictError);
  });

  it("should check dates both before and after the check date", async () => {
    // Mock reservations around the check date
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([
      {
        reservationDate: addDays(baseDate, -1),
      },
      {
        reservationDate: addDays(baseDate, 1),
      },
    ]);

    // This should be allowed as it creates 3 consecutive days
    await expect(validateConsecutiveDates(mockUserId, baseDate)).resolves.toBe(
      true,
    );
  });

  it("should handle database errors gracefully", async () => {
    // Mock database error
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockRejectedValue(
      new Error("Database connection error"),
    );

    await expect(
      validateConsecutiveDates(mockUserId, baseDate),
    ).rejects.toThrow("Database connection error");
  });

  it("should use correct date range for query", async () => {
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.reservation.findMany.mockResolvedValue([]);

    await validateConsecutiveDates(mockUserId, baseDate);

    // Verify the date range used in the query
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          reservationDate: {
            gte: startOfDay(subDays(baseDate, 3)),
            lte: startOfDay(addDays(baseDate, 3)),
          },
        }),
      }),
    );
  });
});

describe("isBeforeNextDay", () => {
  beforeEach(() => {
    // Reset the system time before each test
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return true for dates before next day", () => {
    // Set current time to noon on a specific date
    jest.setSystemTime(new Date("2025-02-07T12:00:00Z"));

    // Test current day
    expect(isBeforeNextDay(new Date("2025-02-07T00:00:00Z"))).toBe(true);
    expect(isBeforeNextDay(new Date("2025-02-07T23:59:59Z"))).toBe(true);

    // Test past dates
    expect(isBeforeNextDay(new Date("2025-02-06T12:00:00Z"))).toBe(true);
  });

  it("should return false for dates on or after next day", () => {
    // Set current time to noon on a specific date
    jest.setSystemTime(new Date("2025-02-07T12:00:00Z"));

    // Test next day (should be false)
    expect(isBeforeNextDay(new Date("2025-02-08T00:00:00Z"))).toBe(false);
    expect(isBeforeNextDay(new Date("2025-02-08T23:59:59Z"))).toBe(false);

    // Test future dates
    expect(isBeforeNextDay(new Date("2025-02-09T12:00:00Z"))).toBe(false);
  });

  it("should handle edge cases around midnight", () => {
    // Set current time to just before midnight
    jest.setSystemTime(new Date("2025-02-07T23:59:59Z"));

    // Test exact midnight boundary
    expect(isBeforeNextDay(new Date("2025-02-08T00:00:00Z"))).toBe(false);

    // Test one second before midnight
    expect(isBeforeNextDay(new Date("2025-02-07T23:59:59Z"))).toBe(true);
  });

  it("should normalize times to start of day", () => {
    jest.setSystemTime(new Date("2025-02-07T15:30:00Z"));

    // These should all be treated the same regardless of time
    expect(isBeforeNextDay(new Date("2025-02-08T00:00:00Z"))).toBe(false);
    expect(isBeforeNextDay(new Date("2025-02-08T12:00:00Z"))).toBe(false);
    expect(isBeforeNextDay(new Date("2025-02-08T23:59:59Z"))).toBe(false);
  });
});

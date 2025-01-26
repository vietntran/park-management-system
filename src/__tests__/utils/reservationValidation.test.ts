// src/__tests__/utils/reservationValidation.test.ts
import { addDays, subDays } from "date-fns";

import { reservationService } from "@/services/reservationService";
import {
  validateConsecutiveDays,
  isDateAvailable,
  isDateDisabled,
  validateDateAvailability,
  validateUserSelection,
  loadUserReservationsData,
} from "@/utils/reservationValidation";

// Mock reservationService
jest.mock("@/services/reservationService", () => ({
  reservationService: {
    checkDateAvailability: jest.fn(),
    validateUsers: jest.fn(),
    getUserReservations: jest.fn(),
  },
}));
describe("validateConsecutiveDays", () => {
  it("allows up to three consecutive days", () => {
    const existingDates = [
      new Date(2025, 0, 24), // Jan 24
      new Date(2025, 0, 25), // Jan 25
    ];
    const newDate = new Date(2025, 0, 26); // Jan 26 (third consecutive day)

    expect(validateConsecutiveDays(existingDates, newDate)).toBe(true);
  });

  it("prevents booking a fourth consecutive day", () => {
    const existingDates = [
      new Date(2025, 0, 24), // Jan 24
      new Date(2025, 0, 25), // Jan 25
      new Date(2025, 0, 26), // Jan 26
    ];
    const newDate = new Date(2025, 0, 27); // Jan 27 (fourth consecutive day)

    expect(validateConsecutiveDays(existingDates, newDate)).toBe(false);
  });

  it("allows booking non-consecutive days", () => {
    const existingDates = [
      new Date(2025, 0, 24), // Jan 24
      new Date(2025, 0, 25), // Jan 25
      new Date(2025, 0, 28), // Jan 28
    ];
    const newDate = new Date(2025, 0, 30); // Jan 30

    expect(validateConsecutiveDays(existingDates, newDate)).toBe(true);
  });

  it("handles empty existing dates", () => {
    const existingDates: Date[] = [];
    const newDate = new Date(2025, 0, 24);

    expect(validateConsecutiveDays(existingDates, newDate)).toBe(true);
  });

  it("handles non-chronological input dates", () => {
    const existingDates = [
      new Date(2025, 0, 26), // Jan 26
      new Date(2025, 0, 24), // Jan 24
      new Date(2025, 0, 25), // Jan 25
    ];
    const newDate = new Date(2025, 0, 27); // Jan 27 (fourth consecutive day)

    expect(validateConsecutiveDays(existingDates, newDate)).toBe(false);
  });
});

describe("isDateAvailable", () => {
  const availableDates = [
    new Date(2025, 0, 24),
    new Date(2025, 0, 25),
    new Date(2025, 0, 26),
  ];

  it("returns true for available date", () => {
    const date = new Date(2025, 0, 24);
    expect(isDateAvailable(date, availableDates)).toBe(true);
  });

  it("returns false for unavailable date", () => {
    const date = new Date(2025, 0, 27);
    expect(isDateAvailable(date, availableDates)).toBe(false);
  });

  it("handles time differences for same day", () => {
    const date = new Date(2025, 0, 24, 14, 30); // 2:30 PM
    const availableDatesWithTime = [new Date(2025, 0, 24, 9, 0)]; // 9:00 AM
    expect(isDateAvailable(date, availableDatesWithTime)).toBe(true);
  });

  it("returns false for empty available dates", () => {
    const date = new Date(2025, 0, 24);
    expect(isDateAvailable(date, [])).toBe(false);
  });
});

describe("isDateDisabled", () => {
  const today = new Date();
  const availableDates = [today, addDays(today, 1), addDays(today, 2)];

  it("disables dates before today", () => {
    const yesterday = subDays(today, 1);
    expect(isDateDisabled(yesterday, availableDates, false)).toBe(true);
  });

  it("disables unavailable dates", () => {
    const unavailableDate = addDays(today, 5);
    expect(isDateDisabled(unavailableDate, availableDates, false)).toBe(true);
  });

  it("disables all dates when loading", () => {
    const availableDate = addDays(today, 1);
    expect(isDateDisabled(availableDate, availableDates, true)).toBe(true);
  });

  it("enables available future dates when not loading", () => {
    const availableDate = addDays(today, 1);
    expect(isDateDisabled(availableDate, availableDates, false)).toBe(false);
  });
});

describe("validateDateAvailability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns invalid for more than 3 consecutive days", async () => {
    const userReservations = [
      new Date(2025, 0, 24),
      new Date(2025, 0, 25),
      new Date(2025, 0, 26),
    ];
    const newDate = new Date(2025, 0, 27);

    const result = await validateDateAvailability(
      newDate,
      userReservations,
      reservationService,
    );

    expect(result).toEqual({
      isValid: false,
      error: "Cannot reserve more than 3 consecutive days",
    });
    expect(reservationService.checkDateAvailability).not.toHaveBeenCalled();
  });

  it("returns invalid when date is not available", async () => {
    (reservationService.checkDateAvailability as jest.Mock).mockResolvedValue({
      isAvailable: false,
      reason: "Date is fully booked",
    });

    const result = await validateDateAvailability(
      new Date(2025, 0, 24),
      [],
      reservationService,
    );

    expect(result).toEqual({
      isValid: false,
      error: "Date is fully booked",
    });
  });

  it("returns valid for available date within consecutive day limit", async () => {
    (reservationService.checkDateAvailability as jest.Mock).mockResolvedValue({
      isAvailable: true,
    });

    const result = await validateDateAvailability(
      new Date(2025, 0, 24),
      [],
      reservationService,
    );

    expect(result).toEqual({ isValid: true });
  });
});

describe("validateUserSelection", () => {
  const mockUsers = [
    {
      id: "1",
      name: "User 1",
      email: "user1@test.com",
      canModify: true,
      canTransfer: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns valid when users are registered", async () => {
    (reservationService.validateUsers as jest.Mock).mockResolvedValue(true);

    const result = await validateUserSelection(mockUsers, reservationService);

    expect(result).toEqual({ isValid: true });
    expect(reservationService.validateUsers).toHaveBeenCalledWith(mockUsers);
  });

  it("returns invalid when users are not registered", async () => {
    (reservationService.validateUsers as jest.Mock).mockResolvedValue(false);

    const result = await validateUserSelection(mockUsers, reservationService);

    expect(result).toEqual({
      isValid: false,
      error: "One or more selected users are not registered in the system",
    });
  });
});

describe("loadUserReservationsData", () => {
  const mockSignal = new AbortController().signal;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully loads user reservations", async () => {
    const mockReservations = [
      "2025-01-24T00:00:00.000Z",
      "2025-01-25T00:00:00.000Z",
    ];
    (reservationService.getUserReservations as jest.Mock).mockResolvedValue({
      reservations: mockReservations,
    });

    const result = await loadUserReservationsData(
      mockSignal,
      reservationService,
    );

    expect(result.data).toEqual(mockReservations.map((d) => new Date(d)));
    expect(result.error).toBeUndefined();
    expect(reservationService.getUserReservations).toHaveBeenCalledWith(
      mockSignal,
    );
  });

  it("handles errors when loading reservations", async () => {
    const mockError = new Error("Failed to load reservations");
    (reservationService.getUserReservations as jest.Mock).mockRejectedValue(
      mockError,
    );

    const result = await loadUserReservationsData(
      mockSignal,
      reservationService,
    );

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

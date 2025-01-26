// src/__tests__/utils/reservationValidation.test.ts
import { validateConsecutiveDays } from "@/utils/reservationValidation";

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

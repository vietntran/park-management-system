// src/__tests__/utils/reservationValidation.test.ts
import { addDays } from "date-fns";

import { isDateDisabled } from "@/utils/reservationValidation";

describe("isDateDisabled", () => {
  const tomorrow = addDays(new Date(), 1);
  const availableDates = [tomorrow, addDays(tomorrow, 1), addDays(tomorrow, 2)];

  it("disables dates before tomorrow", () => {
    const today = new Date();
    expect(isDateDisabled(today, availableDates, false)).toBe(true);
  });

  it("disables unavailable dates after tomorrow", () => {
    const unavailableDate = addDays(tomorrow, 5);
    expect(isDateDisabled(unavailableDate, availableDates, false)).toBe(true);
  });

  it("disables all dates when loading", () => {
    const availableDate = addDays(tomorrow, 1);
    expect(isDateDisabled(availableDate, availableDates, true)).toBe(true);
  });

  it("enables available dates after tomorrow when not loading", () => {
    expect(isDateDisabled(tomorrow, availableDates, false)).toBe(false);
  });
});

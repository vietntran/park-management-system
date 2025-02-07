// src/utils/reservationValidation.ts
import { startOfDay } from "date-fns";

import { isBeforeNextDay } from "@/lib/validations/reservation";

const isDateAvailable = (date: Date, availableDates: Date[]): boolean => {
  return availableDates.some(
    (availableDate) =>
      startOfDay(availableDate).toISOString() ===
      startOfDay(date).toISOString(),
  );
};

export const isDateDisabled = (
  date: Date,
  availableDates: Date[],
  isLoadingDates: boolean,
): boolean => {
  const beforeNextDay = isBeforeNextDay(date);
  return (
    isLoadingDates || beforeNextDay || !isDateAvailable(date, availableDates)
  );
};

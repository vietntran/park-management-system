// src/utils/reservationValidation.ts
import { startOfDay } from "date-fns";

/**
 * Validates if adding a new date would exceed the maximum of 3 consecutive days
 * @param existingDates Array of existing reservation dates
 * @param newDate The new date to validate
 * @returns true if adding newDate would NOT exceed 3 consecutive days, false otherwise
 */
export function validateConsecutiveDays(
  existingDates: Date[],
  newDate: Date,
): boolean {
  const allDates = [...existingDates, newDate].map((d) =>
    startOfDay(d).getTime(),
  );
  const sortedDates = [...new Set(allDates)].sort((a, b) => a - b);

  let consecutiveDays = 1;
  let maxConsecutiveDays = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      consecutiveDays++;
      maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
    } else {
      consecutiveDays = 1;
    }
  }

  return maxConsecutiveDays <= 3;
}

// src/lib/utils/dateUtils.ts
import {
  addDays,
  startOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export function calculateConsecutiveDays(dates: number[]): number {
  let consecutiveDays = 1;
  let maxConsecutiveDays = 1;

  const sortedDates = [...new Set(dates)].sort((a, b) => a - b);

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      consecutiveDays++;
      maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
    } else {
      consecutiveDays = 1;
    }
  }

  return maxConsecutiveDays;
}

const CENTRAL_TIME_ZONE = "America/Chicago";
const TRANSFER_DEADLINE_HOUR = 17; // 5 PM

export function getTransferDeadline(reservationDate: Date): Date {
  // Convert reservation date to CT
  const reservationInCT = toZonedTime(reservationDate, CENTRAL_TIME_ZONE);

  // Get day before at 5pm CT
  const deadlineInCT = setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(
          addDays(startOfDay(reservationInCT), -1),
          TRANSFER_DEADLINE_HOUR,
        ),
        0,
      ),
      0,
    ),
    0,
  );

  // Convert back to UTC for storage
  return fromZonedTime(deadlineInCT, CENTRAL_TIME_ZONE);
}

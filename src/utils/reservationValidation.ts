// src/utils/reservationValidation.ts
import { isBefore, startOfDay } from "date-fns";

import { handleFormError } from "@/lib/errors/clientErrorHandler";
import { SelectedUser } from "@/types/reservation";

/**
 * Validates if adding a new date would exceed the maximum of 3 consecutive days
 * @param existingDates Array of existing reservation dates
 * @param newDate The new date to validate
 * @returns true if adding newDate would NOT exceed 3 consecutive days, false otherwise
 */
export const validateConsecutiveDays = (
  existingDates: Date[],
  newDate: Date,
): boolean => {
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
};

export const isDateAvailable = (
  date: Date,
  availableDates: Date[],
): boolean => {
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
  const today = startOfDay(new Date());
  const isBeforeToday = isBefore(date, today);
  return (
    isLoadingDates || isBeforeToday || !isDateAvailable(date, availableDates)
  );
};

export const validateDateAvailability = async (
  date: Date,
  userReservations: Date[],
  reservationService: typeof import("@/services/reservationService").reservationService,
): Promise<{ isValid: boolean; error?: string }> => {
  if (!validateConsecutiveDays(userReservations, date)) {
    return {
      isValid: false,
      error: "Cannot reserve more than 3 consecutive days",
    };
  }

  const availability = await reservationService.checkDateAvailability(date);
  if (!availability.isAvailable) {
    return {
      isValid: false,
      error: availability.reason || "Date is not available",
    };
  }

  return { isValid: true };
};

export const validateUserSelection = async (
  users: SelectedUser[],
  reservationService: typeof import("@/services/reservationService").reservationService,
): Promise<{ isValid: boolean; error?: string }> => {
  const usersAreValid = await reservationService.validateUsers(users);
  if (!usersAreValid) {
    return {
      isValid: false,
      error: "One or more selected users are not registered in the system",
    };
  }
  return { isValid: true };
};

export const loadUserReservationsData = async (
  signal: AbortSignal | undefined,
  reservationService: typeof import("@/services/reservationService").reservationService,
): Promise<{ data?: Date[]; error?: string }> => {
  try {
    const response = await reservationService.getUserReservations(signal);
    return {
      data: response.reservations.map((d) => new Date(d)),
    };
  } catch (err) {
    return {
      error: handleFormError(err),
    };
  }
};

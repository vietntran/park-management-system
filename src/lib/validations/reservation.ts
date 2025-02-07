// src/lib/validations/reservation.ts

import { addDays, subDays, startOfDay, isBefore } from "date-fns";

import { ConflictError } from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import { calculateConsecutiveDays } from "@/utils/dateUtils";

export async function validateConsecutiveDates(
  userId: string,
  checkDate: Date,
) {
  const startDate = startOfDay(subDays(checkDate, 3));
  const endDate = startOfDay(addDays(checkDate, 3));

  // Find all reservations for this user within the date range
  const existingReservations = await prisma.reservation.findMany({
    where: {
      reservationUsers: {
        some: {
          userId: userId,
        },
      },
      reservationDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      reservationDate: "asc",
    },
  });

  // Convert reservations to dates for easier processing
  const reservationDates = existingReservations.map((r) =>
    startOfDay(r.reservationDate).getTime(),
  );
  reservationDates.push(startOfDay(checkDate).getTime());

  const maxConsecutive = calculateConsecutiveDays(reservationDates);
  if (maxConsecutive > 3) {
    throw new ConflictError(
      "Cannot make reservation. Users are limited to 3 consecutive days.",
    );
  }

  return true;
}

export const isBeforeNextDay = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return isBefore(date, tomorrow);
};

// src/lib/validations/reservation.ts

import { addDays, subDays, startOfDay } from "date-fns";

import { ConflictError } from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";

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

  // Add the new date
  reservationDates.push(startOfDay(checkDate).getTime());

  // Sort dates
  reservationDates.sort((a, b) => a - b);

  // Find consecutive dates
  let consecutiveDays = 1;
  for (let i = 1; i < reservationDates.length; i++) {
    const dayDiff =
      (reservationDates[i] - reservationDates[i - 1]) / (1000 * 60 * 60 * 24);
    if (dayDiff === 1) {
      consecutiveDays++;
      if (consecutiveDays > 3) {
        throw new ConflictError(
          "Cannot make reservation. Users are limited to 3 consecutive days.",
        );
      }
    } else {
      consecutiveDays = 1;
    }
  }

  return true;
}

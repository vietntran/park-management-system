// src/app/api/reservations/create/route.ts
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { startOfDay } from "date-fns";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
  ConflictError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { validateConsecutiveDates } from "@/lib/validations/reservation";
import type { Reservation } from "@/types/reservation";

// Zod schema for request validation
const createReservationSchema = z.object({
  reservationDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, "Invalid date format"),
  additionalUsers: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string().email(),
      }),
    )
    .max(
      RESERVATION_LIMITS.MAX_ADDITIONAL_USERS,
      `Maximum of ${RESERVATION_LIMITS.MAX_ADDITIONAL_USERS} additional users allowed`,
    )
    .optional(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate request body
  const result = createReservationSchema.safeParse(await req.json());
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }

  const { reservationDate, additionalUsers = [] } = result.data;
  const date = startOfDay(new Date(reservationDate));

  // Verify current date
  if (date < startOfDay(new Date())) {
    throw new ValidationError("Cannot create reservation for past dates");
  }

  // Start a transaction
  const reservation = await prisma.$transaction(async (tx) => {
    // Verify all users exist and are verified
    if (additionalUsers.length > 0) {
      const users = await tx.user.findMany({
        where: {
          id: {
            in: additionalUsers.map((user) => user.id),
          },
        },
        select: {
          id: true,
          emailVerified: true,
          isProfileComplete: true,
        },
      });

      // Check if all users exist
      if (users.length !== additionalUsers.length) {
        throw new ValidationError("One or more selected users do not exist");
      }

      // Check if all users are verified and have complete profiles
      const invalidUsers = users.filter(
        (user) => !user.emailVerified || !user.isProfileComplete,
      );
      if (invalidUsers.length > 0) {
        throw new ValidationError(
          "All users must have verified emails and complete profiles",
        );
      }

      // Check if any users already have a reservation for this date
      const existingReservations = await tx.reservationUser.findMany({
        where: {
          userId: {
            in: additionalUsers.map((user) => user.id),
          },
          reservation: {
            reservationDate: date,
            status: ReservationStatus.ACTIVE,
          },
          status: ReservationUserStatus.ACTIVE,
        },
      });

      if (existingReservations.length > 0) {
        throw new ConflictError(
          "One or more users already have a reservation for this date",
        );
      }
    }

    // Validate consecutive dates for all users
    await validateConsecutiveDates(session.user.id, date);
    for (const user of additionalUsers) {
      await validateConsecutiveDates(user.id, date);
    }

    // Check and update date capacity
    let dateCapacity = await tx.dateCapacity.findUnique({
      where: { date },
    });

    if (!dateCapacity) {
      dateCapacity = await tx.dateCapacity.create({
        data: {
          date,
          totalBookings: 1,
        },
      });
    } else {
      // Check if capacity is full
      if (dateCapacity.totalBookings >= dateCapacity.maxCapacity) {
        throw new ConflictError("No available spots for this date");
      }

      dateCapacity = await tx.dateCapacity.update({
        where: { date },
        data: {
          totalBookings: {
            increment: 1,
          },
        },
      });
    }

    // Create the reservation
    const newReservation = await tx.reservation.create({
      data: {
        primaryUserId: session.user.id,
        reservationDate: date,
        status: ReservationStatus.ACTIVE,
        canTransfer: true,
        reservationUsers: {
          create: [
            {
              userId: session.user.id,
              isPrimary: true,
              status: ReservationUserStatus.ACTIVE,
            },
            ...additionalUsers.map((user) => ({
              userId: user.id,
              isPrimary: false,
              status: ReservationUserStatus.ACTIVE,
            })),
          ],
        },
      },
      include: {
        reservationUsers: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    logger.info("Reservation created successfully", {
      reservationId: newReservation.id,
      userId: session.user.id,
      date: date,
      additionalUsers: additionalUsers.length,
    });

    const mappedReservation: Reservation = {
      id: newReservation.id,
      primaryUserId: newReservation.primaryUserId,
      reservationDate: newReservation.reservationDate,
      createdAt: newReservation.createdAt,
      status: newReservation.status,
      canTransfer: newReservation.canTransfer,
      reservationUsers: newReservation.reservationUsers.map((ru) => ({
        reservationId: ru.reservationId,
        userId: ru.userId,
        isPrimary: ru.isPrimary,
        status: ru.status,
        addedAt: ru.addedAt,
        cancelledAt: ru.cancelledAt,
        user: {
          name: ru.user.name,
          email: ru.user.email,
        },
      })),
      dateCapacity: {
        totalBookings: dateCapacity.totalBookings,
        remainingSpots: dateCapacity.maxCapacity - dateCapacity.totalBookings,
      },
    };

    return mappedReservation;
  });

  return createSuccessResponse(reservation, HTTP_STATUS.CREATED);
});

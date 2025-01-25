// src/app/api/reservations/create/route.ts
import { startOfDay } from "date-fns";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
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
        canModify: z.boolean(),
        canTransfer: z.boolean(),
      }),
    )
    .max(3, "Maximum of 3 additional users allowed")
    .optional(),
});

// Response types
interface ReservationUser {
  userId: string;
  isPrimary: boolean;
  canModify: boolean;
  canTransfer: boolean;
  user: {
    name: string;
    email: string;
  };
}

interface ReservationResponse {
  id: string;
  primaryUserId: string;
  reservationDate: Date;
  createdAt: Date;
  reservationUsers: ReservationUser[];
  dateCapacity: {
    totalBookings: number;
    remainingSpots: number;
  };
}

export const POST = withErrorHandler<ReservationResponse>(
  async (req: NextRequest) => {
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
              isCancelled: false,
            },
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
          reservationUsers: {
            create: [
              {
                userId: session.user.id,
                isPrimary: true,
                canModify: true,
                canTransfer: true,
              },
              ...additionalUsers.map((user) => ({
                userId: user.id,
                canModify: user.canModify,
                canTransfer: user.canTransfer,
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

      // Return enriched response
      return {
        ...newReservation,
        dateCapacity: {
          totalBookings: dateCapacity.totalBookings,
          remainingSpots: dateCapacity.maxCapacity - dateCapacity.totalBookings,
        },
      };
    });

    return NextResponse.json(reservation, { status: HTTP_STATUS.CREATED });
  },
);

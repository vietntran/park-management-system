import { startOfDay } from "date-fns";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";

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
import { SelectedUser } from "@/types/reservation";

// Define response type for the reservation
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
  reservationUsers: ReservationUser[];
}

// Define request type for better type safety
interface CreateReservationRequest {
  reservationDate: string;
  additionalUsers?: SelectedUser[];
}

export const POST = withErrorHandler<ReservationResponse>(
  async (req: NextRequest) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const json = await req.json();
    const { reservationDate, additionalUsers } =
      json as CreateReservationRequest;

    if (!reservationDate) {
      throw new ValidationError("Reservation date is required");
    }

    const date = startOfDay(new Date(reservationDate));

    // Validate consecutive dates for primary user
    await validateConsecutiveDates(session.user.id, date);

    // Also validate consecutive dates for additional users
    if (additionalUsers?.length) {
      for (const user of additionalUsers) {
        await validateConsecutiveDates(user.id, date);
      }
    }

    // Start a transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Check date capacity first
      let dateCapacity = await tx.dateCapacity.findUnique({
        where: { date },
      });

      // Create or update date capacity
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
              ...(additionalUsers?.map((user: SelectedUser) => ({
                userId: user.id,
                canModify: user.canModify ?? false,
                canTransfer: user.canTransfer ?? false,
              })) || []),
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
      });

      return newReservation;
    });

    return NextResponse.json(reservation, { status: HTTP_STATUS.CREATED });
  },
);

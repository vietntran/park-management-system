// src/app/api/reservations/[id]/cancel/route.ts
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { RouteContext } from "@/types/route";

// Zod schema for params validation
const cancelParamsSchema = z.object({
  id: z.string().uuid("Invalid reservation ID format"),
});

export const POST = withErrorHandler<null>(
  async (req: NextRequest, context?: RouteContext) => {
    const requestId = crypto.randomUUID();

    // Validate route params
    if (!context?.params) {
      logger.warn("Missing route params", { requestId });
      throw new ValidationError("Reservation ID is required");
    }

    const result = cancelParamsSchema.safeParse(context.params);
    if (!result.success) {
      logger.warn("Invalid reservation ID format", {
        requestId,
        errors: result.error.errors,
      });
      throw new ValidationError(result.error.message);
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new AuthenticationError();
    }

    // Get the reservation and check if it exists
    const reservation = await prisma.reservation.findUnique({
      where: { id: result.data.id },
      include: {
        reservationUsers: true,
      },
    });

    if (!reservation) {
      logger.warn("Reservation not found", {
        requestId,
        reservationId: result.data.id,
      });
      throw new NotFoundError("Reservation not found");
    }

    // Check if the user is part of this reservation
    const userReservation = reservation.reservationUsers.find(
      (ru) => ru.userId === session.user.id,
    );

    if (!userReservation) {
      logger.warn("Unauthorized cancellation attempt", {
        requestId,
        reservationId: result.data.id,
        userId: session.user.id,
      });
      throw new AuthorizationError("User not found in reservation");
    }

    // Check if the reservation is already cancelled
    if (reservation.status === ReservationStatus.CANCELLED) {
      logger.warn("Attempt to cancel already cancelled reservation", {
        requestId,
        reservationId: result.data.id,
      });
      throw new ValidationError("Reservation is already cancelled");
    }

    // Check if the user is the primary user
    const isPrimaryUser = reservation.primaryUserId === session.user.id;

    try {
      if (isPrimaryUser) {
        // Primary user can cancel the entire reservation
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id: result.data.id },
            data: {
              status: ReservationStatus.CANCELLED,
            },
          }),
          prisma.reservationUser.updateMany({
            where: { reservationId: result.data.id },
            data: {
              status: ReservationUserStatus.CANCELLED,
              cancelledAt: new Date(),
            },
          }),
          prisma.dateCapacity.update({
            where: { date: reservation.reservationDate },
            data: {
              totalBookings: {
                decrement: reservation.reservationUsers.length,
              },
            },
          }),
        ]);

        logger.info("Full reservation cancelled", {
          requestId,
          reservationId: result.data.id,
          userId: session.user.id,
          affectedUsers: reservation.reservationUsers.length,
        });

        return createSuccessResponse<null>(null, HTTP_STATUS.OK);
      } else {
        // Non-primary user can only cancel their own spot
        await prisma.$transaction([
          prisma.reservationUser.update({
            where: {
              reservationId_userId: {
                reservationId: result.data.id,
                userId: session.user.id,
              },
            },
            data: {
              status: ReservationUserStatus.CANCELLED,
              cancelledAt: new Date(),
            },
          }),
          prisma.dateCapacity.update({
            where: { date: reservation.reservationDate },
            data: {
              totalBookings: {
                decrement: 1,
              },
            },
          }),
        ]);

        logger.info("User spot cancelled", {
          requestId,
          reservationId: result.data.id,
          userId: session.user.id,
        });

        return createSuccessResponse<null>(null, HTTP_STATUS.OK);
      }
    } catch (err) {
      const error = err as Error;
      logger.error("Error during cancellation", {
        requestId,
        error,
        reservationId: result.data.id,
        userId: session.user.id,
      });
      throw error;
    }
  },
);

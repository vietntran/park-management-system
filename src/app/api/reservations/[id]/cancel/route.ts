// src/app/api/reservations/[id]/cancel/route.ts
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
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
import { type RouteContext } from "@/types/route";

interface CancellationResponse {
  success: boolean;
  message: string;
}

export const POST = withErrorHandler<CancellationResponse>(
  async (req: NextRequest, context?: RouteContext) => {
    if (!context?.params?.id) {
      throw new ValidationError("Reservation ID is required");
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new AuthenticationError();
    }

    // Get the reservation and check if it exists
    const reservation = await prisma.reservation.findUnique({
      where: { id: context.params.id },
      include: {
        reservationUsers: true,
      },
    });

    if (!reservation) {
      throw new NotFoundError("Reservation not found");
    }

    // Check if the user is part of this reservation
    const userReservation = reservation.reservationUsers.find(
      (ru) => ru.userId === session.user.id,
    );

    if (!userReservation) {
      throw new AuthorizationError("User not found in reservation");
    }

    // Check if the reservation is already cancelled
    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new ValidationError("Reservation is already cancelled");
    }

    // Check if the user is the primary user
    const isPrimaryUser = reservation.primaryUserId === session.user.id;

    try {
      if (isPrimaryUser) {
        // Primary user can cancel the entire reservation
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id: context.params.id },
            data: {
              status: ReservationStatus.CANCELLED,
            },
          }),
          prisma.reservationUser.updateMany({
            where: { reservationId: context.params.id },
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
          reservationId: context.params.id,
          userId: session.user.id,
          affectedUsers: reservation.reservationUsers.length,
        });

        return NextResponse.json(
          {
            success: true,
            message: "Reservation cancelled successfully",
          },
          { status: HTTP_STATUS.OK },
        );
      } else {
        // Non-primary user can only cancel their own spot
        await prisma.$transaction([
          prisma.reservationUser.update({
            where: {
              reservationId_userId: {
                reservationId: context.params.id,
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
          reservationId: context.params.id,
          userId: session.user.id,
        });

        return NextResponse.json(
          {
            success: true,
            message: "Successfully removed from reservation",
          },
          { status: HTTP_STATUS.OK },
        );
      }
    } catch (err) {
      const error = err as Error;
      logger.error("Error during cancellation", {
        error,
        reservationId: context.params.id,
        userId: session.user.id,
      });
      throw error;
    }
  },
);

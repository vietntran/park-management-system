import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import type { RouteContext } from "@/types/route";

// Zod schema for params validation
const removeUserParamsSchema = z.object({
  id: z.string().uuid("Invalid reservation ID format"),
});

// Zod schema for request body validation
const removeUserBodySchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
});

export const POST = withErrorHandler(
  async (req: NextRequest, context?: RouteContext) => {
    // Validate session - must be authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    // Validate reservation id from route params
    if (!context?.params) {
      throw new ValidationError("Reservation ID is required");
    }

    // Handle the case where params might be a Promise
    const params = await Promise.resolve(context.params);

    const paramsResult = removeUserParamsSchema.safeParse(params);
    if (!paramsResult.success) {
      throw new ValidationError(paramsResult.error.message);
    }

    const reservationId = paramsResult.data.id;

    // Parse request body to get userId to remove - make sure to await this
    const body = await req.json();

    const bodyResult = removeUserBodySchema.safeParse(body);
    if (!bodyResult.success) {
      throw new ValidationError(bodyResult.error.message);
    }

    const { userId: userIdToRemove } = bodyResult.data;

    // Fetch the reservation with all active reservation users
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
        status: ReservationStatus.ACTIVE,
      },
      include: {
        reservationUsers: {
          where: {
            status: ReservationUserStatus.ACTIVE,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Validate reservation exists
    if (!reservation) {
      throw new ValidationError("Reservation not found");
    }

    // Find the current user's reservation entry
    const currentUserReservation = reservation.reservationUsers.find(
      (ru) => ru.userId === session.user.id,
    );

    // Verify current user is part of this reservation
    if (!currentUserReservation) {
      throw new AuthenticationError(
        "You don't have access to this reservation",
      );
    }

    // Only the primary user can remove other users
    if (!currentUserReservation.isPrimary) {
      throw new AuthenticationError(
        "Only the primary reservation holder can remove users",
      );
    }

    // Check if the user to remove exists in the reservation
    const userToRemove = reservation.reservationUsers.find(
      (ru) => ru.userId === userIdToRemove,
    );

    if (!userToRemove) {
      throw new ValidationError("User is not part of this reservation");
    }

    // Primary user cannot remove themselves via this endpoint
    if (userIdToRemove === currentUserReservation.userId) {
      throw new ValidationError(
        "Primary users cannot remove themselves. Use the cancel reservation function instead.",
      );
    }

    // Update the reservation user status to CANCELLED
    await prisma.reservationUser.update({
      where: {
        reservationId_userId: {
          reservationId: reservationId,
          userId: userIdToRemove,
        },
      },
      data: {
        status: ReservationUserStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return createSuccessResponse({
      message: "User removed from reservation successfully",
      reservationId,
      removedUserId: userIdToRemove,
    });
  },
);

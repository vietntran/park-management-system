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
const reservationParamsSchema = z.object({
  id: z.string().uuid("Invalid reservation ID format"),
});

export const GET = withErrorHandler(
  async (req: NextRequest, context?: RouteContext) => {
    // Validate session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    // Validate route params
    if (!context?.params) {
      throw new ValidationError("Reservation ID is required");
    }

    const result = reservationParamsSchema.safeParse(context.params);
    if (!result.success) {
      throw new ValidationError(result.error.message);
    }

    // Fetch reservation with related data
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: result.data.id,
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
                name: true,
                email: true,
                emailVerified: true,
                isProfileComplete: true,
              },
            },
          },
        },
        dateCapacity: true,
      },
    });

    if (!reservation) {
      throw new ValidationError("Reservation not found");
    }

    // Verify user has permission to view this reservation
    const isUserInReservation = reservation.reservationUsers.some(
      (ru) => ru.userId === session.user.id,
    );
    if (!isUserInReservation) {
      throw new AuthenticationError(
        "You don't have access to this reservation",
      );
    }

    return createSuccessResponse(reservation);
  },
);

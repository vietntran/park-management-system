// src/app/api/user/status/route.ts
import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  NotFoundError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { UserStatus } from "@/types/user";

export const GET = withErrorHandler<UserStatus>(async () => {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    logger.warn("Unauthorized access attempt to user status", {
      requestId,
      ip,
      endpoint: "/api/user/status",
    });
    throw new AuthenticationError();
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      phone: true,
      createdAt: true,
      isProfileComplete: true,
      primaryReservations: {
        where: {
          reservationDate: {
            gte: new Date(),
          },
          status: "ACTIVE",
        },
        orderBy: {
          reservationDate: "asc",
        },
        take: 5,
        select: {
          id: true,
          reservationDate: true,
          reservationUsers: {
            where: {
              status: "ACTIVE", // Only include ACTIVE reservation users
            },
            select: {
              userId: true,
            },
          },
        },
      },
      // Add this to also include reservations where the user is a member but not the primary
      reservationUsers: {
        where: {
          status: "ACTIVE",
          reservation: {
            reservationDate: {
              gte: new Date(),
            },
            status: "ACTIVE",
          },
        },
        include: {
          reservation: {
            select: {
              id: true,
              reservationDate: true,
              reservationUsers: {
                where: {
                  status: "ACTIVE",
                },
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    logger.warn("User not found", {
      requestId,
      ip,
      email: session.user.email,
    });
    throw new NotFoundError("User not found");
  }

  // Calculate if user is new (profile completed in last 24 hours)
  const isNewUser =
    (new Date().getTime() - new Date(user.createdAt).getTime()) /
      (1000 * 60 * 60) <=
    24;

  // Transform reservations to include guest count
  // Get primary reservations
  const primaryReservations = user.primaryReservations.map((reservation) => ({
    id: reservation.id,
    startDate: reservation.reservationDate,
    guestCount: reservation.reservationUsers.length,
  }));

  // Get member reservations (where user is not primary)
  const memberReservations = user.reservationUsers
    .filter(
      (ru) =>
        ru.reservation.id &&
        !user.primaryReservations.some((pr) => pr.id === ru.reservation.id),
    )
    .map((ru) => ({
      id: ru.reservation.id,
      startDate: ru.reservation.reservationDate,
      guestCount: ru.reservation.reservationUsers.length,
    }));

  // Combine both types of reservations
  const upcomingReservations = [...primaryReservations, ...memberReservations];

  logger.info("User status retrieved successfully", {
    requestId,
    userId: user.id,
    hasUpcomingReservations: upcomingReservations.length > 0,
  });

  return createSuccessResponse<UserStatus>({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      isProfileComplete: user.isProfileComplete,
    },
    isNewUser,
    hasUpcomingReservations: upcomingReservations.length > 0,
    upcomingReservations,
  });
});

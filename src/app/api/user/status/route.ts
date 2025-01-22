import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { withErrorHandler } from "@/app/api/error/route";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  NotFoundError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";

interface UserStatus {
  user: {
    id: string;
    email: string;
    phone: string | null;
    isProfileComplete: boolean;
  };
  isNewUser: boolean;
  hasUpcomingReservations: boolean;
  upcomingReservations: Array<{
    id: string;
    startDate: Date;
    guestCount: number;
  }>;
}

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
          isCancelled: false,
        },
        orderBy: {
          reservationDate: "asc",
        },
        take: 5,
        select: {
          id: true,
          reservationDate: true,
          reservationUsers: {
            select: {
              userId: true,
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
  const upcomingReservations = user.primaryReservations.map((reservation) => ({
    id: reservation.id,
    startDate: reservation.reservationDate,
    guestCount: reservation.reservationUsers.length,
  }));

  logger.info("User status retrieved successfully", {
    requestId,
    userId: user.id,
    hasUpcomingReservations: upcomingReservations.length > 0,
  });

  return NextResponse.json({
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

// src/app/api/reservations/user/route.ts
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { startOfDay } from "date-fns";
import { getServerSession } from "next-auth";

import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import { AuthenticationError } from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import type { Reservation } from "@/types/reservation";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Get today's date at start of day for comparison
  const today = startOfDay(new Date());

  // Get all active reservations where user is either primary user or additional user
  const reservations = await prisma.reservation.findMany({
    where: {
      OR: [
        { primaryUserId: session.user.id },
        {
          reservationUsers: {
            some: {
              userId: session.user.id,
              status: ReservationUserStatus.ACTIVE,
            },
          },
        },
      ],
      status: ReservationStatus.ACTIVE,
      reservationDate: { gte: today },
    },
    orderBy: {
      reservationDate: "asc",
    },
    include: {
      reservationUsers: {
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

  // Map the reservations to match the Reservation type
  const mappedReservations: Reservation[] = reservations.map((reservation) => ({
    id: reservation.id,
    primaryUserId: reservation.primaryUserId,
    reservationDate: reservation.reservationDate,
    createdAt: reservation.createdAt,
    status: reservation.status,
    canTransfer: reservation.canTransfer,
    reservationUsers: reservation.reservationUsers.map((ru) => ({
      reservationId: ru.reservationId,
      userId: ru.userId,
      isPrimary: ru.isPrimary,
      status: ru.status,
      addedAt: ru.addedAt,
      cancelledAt: ru.cancelledAt,
      user: {
        id: ru.user.id,
        name: ru.user.name,
        email: ru.user.email,
        emailVerified: ru.user.emailVerified ?? null,
        isProfileComplete: ru.user.isProfileComplete ?? false,
      },
    })),
    dateCapacity: {
      totalBookings: reservation.dateCapacity?.totalBookings ?? 0,
      remainingSpots:
        (reservation.dateCapacity?.maxCapacity ?? 0) -
        (reservation.dateCapacity?.totalBookings ?? 0),
    },
  }));

  return createSuccessResponse(mappedReservations);
});

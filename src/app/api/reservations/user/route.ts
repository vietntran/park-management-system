// src/app/api/reservations/user/route.ts
import { ReservationStatus, ReservationUserStatus } from "@prisma/client";
import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import type { ApiResponse } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import { AuthenticationError } from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";
import type { ReservationResponse } from "@/types/reservation";

export const GET = withErrorHandler<ReservationResponse[]>(async () => {
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
              name: true,
              email: true,
            },
          },
        },
      },
      dateCapacity: true,
    },
  });

  // Map the reservations to match the ReservationResponse type
  const mappedReservations: ReservationResponse[] = reservations.map(
    (reservation) => ({
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
          name: ru.user.name,
          email: ru.user.email,
        },
      })),
      dateCapacity: {
        totalBookings: reservation.dateCapacity?.totalBookings ?? 0,
        remainingSpots:
          (reservation.dateCapacity?.maxCapacity ?? 0) -
          (reservation.dateCapacity?.totalBookings ?? 0),
      },
    }),
  );

  const apiResponse: ApiResponse<ReservationResponse[]> = {
    data: mappedReservations,
    success: true,
  };

  return NextResponse.json(apiResponse, {
    status: HTTP_STATUS.OK,
  });
});

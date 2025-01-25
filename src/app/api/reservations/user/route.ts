// src/app/api/reservations/user/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  NotFoundError,
} from "@/lib/errors/ApplicationErrors";
import { handleServerError } from "@/lib/errors/serverErrorHandler";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new AuthenticationError();
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get today's date at start of day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all reservations where user is either primary user or additional user
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { primaryUserId: user.id },
          {
            reservationUsers: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
        AND: [{ isCancelled: false }, { reservationDate: { gte: today } }],
      },
      orderBy: {
        reservationDate: "asc",
      },
      select: {
        reservationDate: true,
      },
    });

    // Format the dates
    const formattedDates = reservations.map(
      (reservation) => reservation.reservationDate,
    );

    return NextResponse.json({
      reservations: formattedDates,
      count: formattedDates.length,
    });
  } catch (error) {
    return handleServerError(error, {
      path: "/api/reservations/user",
      method: "GET",
    });
  }
}

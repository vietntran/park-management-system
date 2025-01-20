// src/app/api/user/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate if user is new (profile completed in last 24 hours)
    const isNewUser =
      (new Date().getTime() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60) <=
      24;

    // Transform reservations to include guest count
    const upcomingReservations = user.primaryReservations.map(
      (reservation) => ({
        id: reservation.id,
        startDate: reservation.reservationDate,
        guestCount: reservation.reservationUsers.length,
      }),
    );

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
  } catch (error) {
    console.error("Error fetching user status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

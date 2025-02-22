import {
  ReservationStatus,
  ReservationUserStatus,
  ReservationUser,
} from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { ReservationDetail } from "@/components/reservation/ReservationDetail";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Reservation Details",
  description: "View and manage your reservation details",
};

interface ReservationPageProps {
  params: {
    id: string;
  };
}

export default async function ReservationPage({
  params,
}: ReservationPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required");
  }

  if (!params.id || typeof params.id !== "string") {
    throw new ValidationError("Invalid reservation ID");
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: {
        id: params.id,
        status: ReservationStatus.ACTIVE,
      },
      include: {
        primaryUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
        dateCapacity: {
          select: {
            date: true,
            totalBookings: true,
            maxCapacity: true,
          },
        },
      },
    });

    if (!reservation) {
      notFound();
    }

    // Verify user has permission to view this reservation
    const isUserInReservation = reservation.reservationUsers.some(
      (ru: ReservationUser) => ru.userId === session.user.id,
    );
    if (!isUserInReservation) {
      throw new AuthenticationError(
        "You don't have access to this reservation",
      );
    }

    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-8">
          Reservation Details
        </h1>
        <ReservationDetail
          reservation={reservation}
          currentUserId={session.user.id}
        />
      </div>
    );
  } catch (error) {
    console.error("Reservation Page Error:", error);
    if (
      error instanceof AuthenticationError ||
      error instanceof ValidationError
    ) {
      throw error;
    }
    throw new Error(
      `Failed to load reservation details: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

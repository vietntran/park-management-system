import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SelectedUser } from "@/types/reservation";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const json = await request.json();
    const { reservationDate, additionalUsers } = json;

    // Start a transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Check date capacity first
      const date = startOfDay(new Date(reservationDate));
      let dateCapacity = await tx.dateCapacity.findUnique({
        where: { date },
      });

      // Create or update date capacity
      if (!dateCapacity) {
        dateCapacity = await tx.dateCapacity.create({
          data: {
            date,
            totalBookings: 1,
          },
        });
      } else {
        // Check if capacity is full
        if (dateCapacity.totalBookings >= dateCapacity.maxCapacity) {
          throw new Error("No available spots for this date");
        }

        dateCapacity = await tx.dateCapacity.update({
          where: { date },
          data: {
            totalBookings: {
              increment: 1,
            },
          },
        });
      }

      // Create the reservation
      const newReservation = await tx.reservation.create({
        data: {
          primaryUserId: session.user.id,
          reservationDate: date,
          reservationUsers: {
            create: [
              {
                userId: session.user.id,
                isPrimary: true,
                canModify: true,
                canTransfer: true,
              },
              ...(additionalUsers?.map((user: SelectedUser) => ({
                userId: user.id,
                canModify: user.canModify || false,
                canTransfer: user.canTransfer || false,
              })) || []),
            ],
          },
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
        },
      });

      return newReservation;
    });

    return NextResponse.json(reservation);
  } catch (error) {
    console.error("Error creating reservation:", error);
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

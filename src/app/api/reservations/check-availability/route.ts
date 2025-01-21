import { startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return new NextResponse("Missing date", { status: 400 });
    }

    const checkDate = startOfDay(new Date(date));

    // Check existing capacity for the date
    const dateCapacity = await prisma.dateCapacity.findUnique({
      where: {
        date: checkDate,
      },
    });

    // If no capacity record exists, the date is available
    if (!dateCapacity) {
      return NextResponse.json({
        isAvailable: true,
        totalBookings: 0,
        remainingSpots: 60,
      });
    }

    const isAvailable = dateCapacity.totalBookings < dateCapacity.maxCapacity;
    const remainingSpots =
      dateCapacity.maxCapacity - dateCapacity.totalBookings;

    return NextResponse.json({
      isAvailable,
      totalBookings: dateCapacity.totalBookings,
      remainingSpots,
      reason: !isAvailable ? "No available spots for this date" : undefined,
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

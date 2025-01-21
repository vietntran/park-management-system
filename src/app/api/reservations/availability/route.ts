import { addDays, startOfDay } from "date-fns";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return new NextResponse("Missing start or end date", { status: 400 });
    }

    const startDate = startOfDay(new Date(start));
    const endDate = startOfDay(new Date(end));

    // Get existing reservations for the date range
    const existingReservations = await prisma.dateCapacity.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Create a map of dates to their total bookings
    const bookingsMap = new Map(
      existingReservations.map((r) => [r.date.toISOString(), r.totalBookings]),
    );

    // Create array of all dates in range
    const allDates: Date[] = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      allDates.push(currentDate);
      currentDate = addDays(currentDate, 1);
    }

    // Filter available dates (less than 60 bookings)
    const availableDates = allDates.filter((date) => {
      const bookings = bookingsMap.get(date.toISOString()) || 0;
      return bookings < 60;
    });

    return NextResponse.json({ availableDates });
  } catch (error) {
    console.error("Error getting availability:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

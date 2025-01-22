import { addDays, startOfDay } from "date-fns";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

import { HTTP_STATUS } from "@/constants/http";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { ValidationError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";

interface AvailabilityResponse {
  availableDates: Date[];
  maxCapacity: number;
}

const MAX_DAILY_RESERVATIONS = 60;

export const GET = withErrorHandler<AvailabilityResponse>(
  async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      logger.warn("Missing date parameters for availability check", {
        requestId,
        ip,
        start,
        end,
      });
      throw new ValidationError("Both start and end dates are required");
    }

    // Validate date formats and ranges
    const startDate = startOfDay(new Date(start));
    const endDate = startOfDay(new Date(end));

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      logger.warn("Invalid date format for availability check", {
        requestId,
        ip,
        start,
        end,
      });
      throw new ValidationError("Invalid date format");
    }

    if (startDate > endDate) {
      logger.warn("Invalid date range for availability check", {
        requestId,
        ip,
        startDate,
        endDate,
      });
      throw new ValidationError(
        "Start date must be before or equal to end date",
      );
    }

    // Get existing reservations for the date range
    const existingReservations = await prisma.dateCapacity.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: "asc",
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

    // Filter available dates (less than max capacity)
    const availableDates = allDates.filter((date) => {
      const bookings = bookingsMap.get(date.toISOString()) || 0;
      return bookings < MAX_DAILY_RESERVATIONS;
    });

    logger.info("Availability check completed", {
      requestId,
      ip,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      availableDatesCount: availableDates.length,
      totalDatesRequested: allDates.length,
    });

    return NextResponse.json(
      {
        availableDates,
        maxCapacity: MAX_DAILY_RESERVATIONS,
      },
      { status: HTTP_STATUS.OK },
    );
  },
);

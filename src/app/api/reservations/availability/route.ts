import { addDays, startOfDay } from "date-fns";
import { headers } from "next/headers";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { ValidationError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Define a type for the response that extends AvailabilityResponse
interface AvailabilityRangeData {
  availableDates: string[];
  maxCapacity: number;
}

// Zod schema for request validation
const dateRangeSchema = z.object({
  start: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, "Invalid start date format"),
  end: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, "Invalid end date format"),
});

export const GET = withErrorHandler<AvailabilityRangeData>(
  async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    // Parse query parameters
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

    // Validate request parameters
    const result = dateRangeSchema.safeParse({ start, end });
    if (!result.success) {
      logger.warn("Invalid date parameters for availability check", {
        requestId,
        ip,
        start,
        end,
        errors: result.error.errors,
      });
      throw new ValidationError(result.error.message);
    }

    const { start: validatedStart, end: validatedEnd } = result.data;
    const startDate = startOfDay(new Date(validatedStart));
    const endDate = startOfDay(new Date(validatedEnd));

    // Additional date range validation
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
    const availableDates = allDates
      .filter((date) => {
        const bookings = bookingsMap.get(date.toISOString()) ?? 0;
        return bookings < RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS;
      })
      .map((date) => date.toISOString());

    logger.info("Availability check completed", {
      requestId,
      ip,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      availableDatesCount: availableDates.length,
      totalDatesRequested: allDates.length,
    });

    return createSuccessResponse(
      {
        availableDates,
        maxCapacity: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
      },
      HTTP_STATUS.OK,
    );
  },
);

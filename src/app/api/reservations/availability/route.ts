import { addDays, differenceInMonths, startOfDay } from "date-fns";
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

interface AvailabilityRangeData {
  availableDates: string[];
  maxCapacity: number;
}

// Constants
const MAX_MONTHS_RANGE = 3;
const MAX_DAILY_RESERVATIONS = RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS;

// Zod schema for request validation
const dateRangeSchema = z.object({
  start: z.string().transform((val, ctx) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_date,
        message: "Invalid start date format",
      });
      return z.NEVER;
    }
    return date;
  }),
  end: z.string().transform((val, ctx) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_date,
        message: "Invalid end date format",
      });
      return z.NEVER;
    }
    return date;
  }),
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

    // Validate request parameters with Zod
    let validatedStart: Date;
    let validatedEnd: Date;

    try {
      const result = dateRangeSchema.parse({ start, end });
      validatedStart = result.start;
      validatedEnd = result.end;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn("Invalid date parameters for availability check", {
          requestId,
          ip,
          start,
          end,
          errors: error.errors,
        });
        const errorMessage = error.errors
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new ValidationError(errorMessage);
      }
      throw error;
    }

    const startDate = startOfDay(validatedStart);
    const endDate = startOfDay(validatedEnd);
    const today = startOfDay(new Date());

    // Validate date range and future dates in one check
    const validationErrors: string[] = [];

    if (startDate < today) {
      validationErrors.push("Start date must not be in the past");
    }

    if (startDate > endDate) {
      validationErrors.push("Start date must be before or equal to end date");
    }

    if (differenceInMonths(endDate, startDate) > MAX_MONTHS_RANGE) {
      validationErrors.push(
        `Date range cannot exceed ${MAX_MONTHS_RANGE} months`,
      );
    }

    if (validationErrors.length > 0) {
      logger.warn("Date validation failed", {
        requestId,
        ip,
        startDate,
        endDate,
        today,
        errors: validationErrors,
      });
      throw new ValidationError(validationErrors.join(". "));
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
        return bookings < MAX_DAILY_RESERVATIONS;
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
        maxCapacity: MAX_DAILY_RESERVATIONS,
      },
      HTTP_STATUS.OK,
    );
  },
);

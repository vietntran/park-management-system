// src/app/api/reservations/check-availability/route.ts
import { startOfDay } from "date-fns";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import { ValidationError, ConflictError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { validateConsecutiveDates } from "@/lib/validations/reservation";
import { isBeforeNextDay } from "@/lib/validations/reservation";
import type { Availability } from "@/types/reservation";

export const GET = withErrorHandler<Availability>(async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  // Get the user session
  const session = await getServerSession(authOptions);

  if (!date) {
    logger.warn("Missing date parameter", {
      requestId,
      endpoint: "/api/reservations/check-availability",
    });

    throw new ValidationError("Date parameter is required");
  }

  const checkDate = startOfDay(new Date(date));

  if (isNaN(checkDate.getTime())) {
    logger.warn("Invalid date format", {
      requestId,
      date,
    });

    throw new ValidationError("Invalid date format");
  }

  if (isBeforeNextDay(checkDate)) {
    logger.warn("Date is before next day", {
      requestId,
      date: checkDate,
    });

    return createErrorResponse(
      "Reservations can be made up to 11:59 PM for the following day",
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // If user is logged in, check consecutive dates restriction
  if (session?.user?.id) {
    try {
      await validateConsecutiveDates(session.user.id, checkDate);
    } catch (error) {
      if (error instanceof ConflictError) {
        return createErrorResponse(error.message, HTTP_STATUS.CONFLICT);
      }
      throw error;
    }
  }

  // Check existing capacity for the date
  const dateCapacity = await prisma.dateCapacity.findUnique({
    where: {
      date: checkDate,
    },
  });

  // If no capacity record exists, the date is available
  if (!dateCapacity) {
    logger.info("No existing capacity record found", {
      requestId,
      date: checkDate,
    });

    const availabilityData: Availability = {
      date: checkDate.toISOString(),
      isAvailable: true,
      remainingSpots: RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS,
    };

    return createSuccessResponse(availabilityData, HTTP_STATUS.OK);
  }

  const remainingSpots = dateCapacity.maxCapacity - dateCapacity.totalBookings;
  const isAvailable = dateCapacity.totalBookings < dateCapacity.maxCapacity;

  logger.info("Availability checked successfully", {
    requestId,
    date: checkDate,
    isAvailable,
    remainingSpots,
  });

  if (!isAvailable) {
    return createErrorResponse(
      "No available spots for this date",
      HTTP_STATUS.CONFLICT,
    );
  }

  const availabilityData: Availability = {
    date: checkDate.toISOString(),
    isAvailable,
    remainingSpots,
  };

  return createSuccessResponse(availabilityData, HTTP_STATUS.OK);
});

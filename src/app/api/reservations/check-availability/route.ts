// src/app/api/reservations/check-availability/route.ts
import { startOfDay } from "date-fns";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import {
  withErrorHandler,
  ErrorResponse,
  SuccessResponse,
} from "@/lib/api/withErrorHandler";
import type { ApiResponse } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import { ValidationError, ConflictError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { validateConsecutiveDates } from "@/lib/validations/reservation";
import type { AvailabilityResponse } from "@/types/reservation";
import { isBeforeNextDay } from "@/utils/reservationValidation";

export const GET = withErrorHandler<AvailabilityResponse>(
  async (req: NextRequest) => {
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

      const apiResponse: ErrorResponse = {
        success: false,
        error: "Reservations can be made up to 11:59 PM for the following day",
      };

      return NextResponse.json(apiResponse, {
        status: HTTP_STATUS.BAD_REQUEST,
      });
    }

    // If user is logged in, check consecutive dates restriction
    if (session?.user?.id) {
      try {
        await validateConsecutiveDates(session.user.id, checkDate);
      } catch (error) {
        if (error instanceof ConflictError) {
          const apiResponse: ErrorResponse = {
            success: false,
            error: error.message,
          };

          return NextResponse.json(apiResponse, {
            status: HTTP_STATUS.CONFLICT,
          });
        }
        throw error;
      }
    }

    const MAX_CAPACITY = 60; // Consider moving this to a constant or env variable

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

      const apiResponse: SuccessResponse<AvailabilityResponse> = {
        data: {
          date: checkDate.toISOString(),
          isAvailable: true,
          remainingSpots: MAX_CAPACITY,
        },
        success: true,
      };

      return NextResponse.json(apiResponse, {
        status: HTTP_STATUS.OK,
      });
    }

    const remainingSpots =
      dateCapacity.maxCapacity - dateCapacity.totalBookings;
    const isAvailable = dateCapacity.totalBookings < dateCapacity.maxCapacity;

    logger.info("Availability checked successfully", {
      requestId,
      date: checkDate,
      isAvailable,
      remainingSpots,
    });

    const apiResponse: ApiResponse<AvailabilityResponse> = isAvailable
      ? {
          success: true as const,
          data: {
            date: checkDate.toISOString(),
            isAvailable,
            remainingSpots,
          },
        }
      : {
          success: false as const,
          error: "No available spots for this date",
        };

    return NextResponse.json(apiResponse, {
      status: isAvailable ? HTTP_STATUS.OK : HTTP_STATUS.CONFLICT,
    });
  },
);

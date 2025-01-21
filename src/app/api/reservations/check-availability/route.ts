import { startOfDay } from "date-fns";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { withErrorHandler } from "@/app/api/error";
import { authOptions } from "@/lib/auth";
import { ValidationError, ConflictError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { validateConsecutiveDates } from "@/lib/validations/reservation";

// Define response interface for type safety
interface AvailabilityResponse {
  isAvailable: boolean;
  totalBookings: number;
  remainingSpots: number;
  reason?: string;
}

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

    // If user is logged in, check consecutive dates restriction
    if (session?.user?.id) {
      try {
        await validateConsecutiveDates(session.user.id, checkDate);
      } catch (error) {
        if (error instanceof ConflictError) {
          return NextResponse.json({
            isAvailable: false,
            totalBookings: 0,
            remainingSpots: 0,
            reason: error.message,
          });
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

      return NextResponse.json({
        isAvailable: true,
        totalBookings: 0,
        remainingSpots: 60, // Consider moving this to a constant or env variable
      });
    }

    const isAvailable = dateCapacity.totalBookings < dateCapacity.maxCapacity;
    const remainingSpots =
      dateCapacity.maxCapacity - dateCapacity.totalBookings;

    logger.info("Availability checked successfully", {
      requestId,
      date: checkDate,
      isAvailable,
      remainingSpots,
    });

    return NextResponse.json({
      isAvailable,
      totalBookings: dateCapacity.totalBookings,
      remainingSpots,
      reason: !isAvailable ? "No available spots for this date" : undefined,
    });
  },
);

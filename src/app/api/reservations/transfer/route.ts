import { PrismaClient, TransferStatus } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import { RESERVATION_LIMITS } from "@/constants/reservation";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  canInitiateTransfer,
  getTransferExpiresAt,
} from "@/lib/validations/transfer";
import type { Transfer } from "@/types/reservation";

// Zod schema for request validation
const createTransferSchema = z.object({
  reservationId: z.string().uuid(),
  toUserId: z.string().uuid(),
  spotsToTransfer: z.array(z.string().uuid()),
  isPrimaryTransfer: z.boolean(),
});

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Define the type for the transfers result
  type PrismaTransfer = Awaited<
    ReturnType<typeof prisma.reservationTransfer.findMany>
  >[number];

  const transfers = await prisma.reservationTransfer.findMany({
    where: {
      OR: [{ fromUserId: session.user.id }, { toUserId: session.user.id }],
      status: TransferStatus.PENDING,
    },
    include: {
      fromUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      toUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reservation: {
        include: {
          reservationUsers: {
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
          dateCapacity: true,
        },
      },
    },
    orderBy: {
      requestedAt: "desc",
    },
  });

  // Transform transfers to include remaining spots calculation
  const transformedTransfers: Transfer[] = transfers.map(
    (transfer: PrismaTransfer) => ({
      ...transfer,
      reservation: transfer.reservation
        ? {
            ...transfer.reservation,
            dateCapacity: {
              totalBookings: transfer.reservation.dateCapacity.totalBookings,
              remainingSpots:
                RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS -
                transfer.reservation.dateCapacity.totalBookings,
            },
          }
        : undefined,
    }),
  );

  logger.info("Retrieved pending transfers", {
    userId: session.user.id,
    count: transfers.length,
  });

  return createSuccessResponse(transformedTransfers);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  // Validate request body
  const result = createTransferSchema.safeParse(await req.json());
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }

  const { reservationId, toUserId, spotsToTransfer, isPrimaryTransfer } =
    result.data;

  // Start transaction for transfer creation
  const transfer = await prisma.$transaction(async (tx: PrismaClient) => {
    // Validate transfer using utility function
    await canInitiateTransfer({
      userId: session.user.id,
      reservationId,
      spotsToTransfer,
      toUserId,
    });

    // Get reservation date for deadline calculation
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
      select: { reservationDate: true },
    });

    if (!reservation) {
      throw new ValidationError("Reservation not found");
    }

    // Create the transfer request - FIX: Using only include, not both include and select
    const newTransfer = await tx.reservationTransfer.create({
      data: {
        reservationId,
        fromUserId: session.user.id,
        toUserId,
        spotsToTransfer,
        isPrimaryTransfer,
        expiresAt: getTransferExpiresAt(reservation.reservationDate),
        status: TransferStatus.PENDING,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reservation: {
          include: {
            reservationUsers: {
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
            dateCapacity: true,
          },
        },
      },
    });

    logger.info("Transfer request created successfully", {
      transferId: newTransfer.id,
      reservationId,
      fromUserId: session.user.id,
      toUserId,
      spotsCount: spotsToTransfer.length,
    });

    // Transform the response to match the Transfer type
    const transformedTransfer: Transfer = {
      ...newTransfer,
      reservation: newTransfer.reservation
        ? {
            ...newTransfer.reservation,
            dateCapacity: {
              totalBookings: newTransfer.reservation.dateCapacity.totalBookings,
              remainingSpots:
                RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS -
                newTransfer.reservation.dateCapacity.totalBookings,
            },
          }
        : undefined,
    };

    return transformedTransfer;
  });

  return createSuccessResponse<Transfer>(transfer, HTTP_STATUS.CREATED);
});

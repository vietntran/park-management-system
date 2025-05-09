import { ReservationUserStatus, TransferStatus } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { RESERVATION_LIMITS } from "@/constants/reservation";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
  ConflictError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { canAcceptTransfer } from "@/lib/validations/transfer";
import type { Transfer } from "@/types/reservation";
import { RouteContext } from "@/types/route";

// Zod schema for request validation
const updateTransferSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export const PATCH = withErrorHandler<Transfer>(
  async (req: NextRequest, context?: RouteContext) => {
    // Type guard for context and params
    if (!context || !context.params) {
      throw new ValidationError("Missing context or params");
    }

    // Type assertion after validation
    const params = await Promise.resolve(context.params);
    const transferId = params.id as string;

    if (!transferId) {
      throw new ValidationError("Missing transfer ID");
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    // Validate request body
    const result = updateTransferSchema.safeParse(await req.json());
    if (!result.success) {
      throw new ValidationError(result.error.message);
    }

    const { action } = result.data;

    // Start transaction for transfer update
    const updatedTransfer = await prisma.$transaction(
      async (tx: typeof prisma) => {
        // Check if user can accept transfer
        if (action === "accept") {
          await canAcceptTransfer({
            userId: session.user.id,
            transferId,
          });
        }

        // Get current transfer
        const transfer = await tx.reservationTransfer.findUnique({
          where: { id: transferId },
          include: {
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
          },
        });

        if (!transfer) {
          throw new ValidationError("Transfer not found");
        }

        // Verify user is the intended recipient
        if (transfer.toUserId !== session.user.id) {
          throw new ValidationError(
            "Only the intended recipient can respond to this transfer",
          );
        }

        // Check if transfer is still pending
        if (transfer.status !== TransferStatus.PENDING) {
          throw new ConflictError("Transfer is no longer pending");
        }

        if (action === "accept") {
          // Update reservation users status to CANCELLED (since TRANSFERRED doesn't exist)
          await Promise.all(
            transfer.spotsToTransfer.map((userId: string) =>
              tx.reservationUser.update({
                where: {
                  reservationId_userId: {
                    reservationId: transfer.reservationId,
                    userId,
                  },
                },
                data: {
                  status: ReservationUserStatus.CANCELLED,
                  cancelledAt: new Date(),
                },
              }),
            ),
          );

          // Check if user already has an entry in this reservation
          const existingReservationUser = await tx.reservationUser.findUnique({
            where: {
              reservationId_userId: {
                reservationId: transfer.reservationId,
                userId: transfer.toUserId,
              },
            },
          });

          if (existingReservationUser) {
            // If the user already has an entry, update it
            await tx.reservationUser.update({
              where: {
                reservationId_userId: {
                  reservationId: transfer.reservationId,
                  userId: transfer.toUserId,
                },
              },
              data: {
                isPrimary: transfer.isPrimaryTransfer,
                status: ReservationUserStatus.ACTIVE,
                cancelledAt: null,
              },
            });
          } else {
            // If the user doesn't have an entry yet, create one
            await tx.reservationUser.create({
              data: {
                reservationId: transfer.reservationId,
                userId: transfer.toUserId,
                isPrimary: transfer.isPrimaryTransfer,
                status: ReservationUserStatus.ACTIVE,
              },
            });
          }

          // If this was a primary transfer, update the reservation's primaryUserId
          if (transfer.isPrimaryTransfer) {
            await tx.reservation.update({
              where: { id: transfer.reservationId },
              data: { primaryUserId: transfer.toUserId },
            });
          }
        }

        // Update transfer status
        const updatedTransferData = await tx.reservationTransfer.update({
          where: { id: transferId },
          data: {
            status:
              action === "accept"
                ? TransferStatus.ACCEPTED
                : TransferStatus.DECLINED,
            respondedAt: new Date(),
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

        // Transform the response to match the Transfer type
        const transformedTransfer: Transfer = {
          ...updatedTransferData,
          reservation: updatedTransferData.reservation
            ? {
                ...updatedTransferData.reservation,
                dateCapacity: {
                  totalBookings:
                    updatedTransferData.reservation.dateCapacity.totalBookings,
                  remainingSpots:
                    RESERVATION_LIMITS.MAX_DAILY_RESERVATIONS -
                    updatedTransferData.reservation.dateCapacity.totalBookings,
                },
              }
            : undefined,
        };

        return transformedTransfer;
      },
    );

    logger.info(`Transfer ${action}ed successfully`, {
      transferId,
      userId: session.user.id,
      action,
    });

    return createSuccessResponse<Transfer>(updatedTransfer);
  },
);

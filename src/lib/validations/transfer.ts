// src/lib/validations/transfer.ts
import {
  ReservationStatus,
  ReservationUserStatus,
  TransferStatus,
} from "@prisma/client";
import {
  addDays,
  startOfDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isBefore,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import {
  ValidationError,
  ConflictError,
  AuthorizationError,
} from "@/lib/errors/ApplicationErrors";
import { prisma } from "@/lib/prisma";

import { validateConsecutiveDates } from "./reservation";

interface InitiateTransferParams {
  userId: string; // User attempting to initiate transfer
  reservationId: string; // Reservation being transferred
  spotsToTransfer: string[]; // User IDs of spots being transferred
  toUserId: string; // Recipient of the transfer
}

interface AcceptTransferParams {
  userId: string; // User attempting to accept transfer
  transferId: string; // Transfer being accepted
}

export const CENTRAL_TIME_ZONE = "America/Chicago";
export const TRANSFER_DEADLINE_HOUR = 17; // 5 PM

export function getTransferDeadline(reservationDate: Date): Date {
  // Convert reservation date to CT
  const reservationInCT = toZonedTime(reservationDate, CENTRAL_TIME_ZONE);

  // Get day before at 5pm CT
  const deadlineInCT = setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(
          addDays(startOfDay(reservationInCT), -1),
          TRANSFER_DEADLINE_HOUR,
        ),
        0,
      ),
      0,
    ),
    0,
  );

  // Convert back to UTC for storage
  return fromZonedTime(deadlineInCT, CENTRAL_TIME_ZONE);
}

/**
 * Checks if the current time is within the transfer deadline (before 5pm CT day prior)
 */
export function isWithinTransferDeadline(
  reservationDate: Date,
  currentTime: Date = new Date(),
): boolean {
  const deadline = getTransferDeadline(reservationDate);
  return isBefore(currentTime, deadline);
}

/**
 * Validates whether a user can initiate a transfer for given spots in a reservation
 * Checks:
 * 1. Reservation exists and is active
 * 2. Transfer deadline hasn't passed
 * 3. No pending transfers exist
 * 4. User has permission to transfer the specified spots
 * 5. Recipient exists and can accept the transfer
 */
export async function canInitiateTransfer({
  userId,
  reservationId,
  spotsToTransfer,
  toUserId,
}: InitiateTransferParams): Promise<boolean> {
  // Get reservation with its users and any pending transfers
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: reservationId,
      status: ReservationStatus.ACTIVE,
    },
    include: {
      reservationUsers: {
        where: { status: ReservationUserStatus.ACTIVE },
        include: { user: true },
      },
      transfers: {
        where: { status: TransferStatus.PENDING },
      },
    },
  });

  if (!reservation) {
    throw new ValidationError("Reservation not found or not active");
  }

  const transferDeadline = getTransferDeadline(reservation.reservationDate);
  if (isBefore(transferDeadline, new Date())) {
    throw new ValidationError("Transfer deadline has passed");
  }

  // Check for existing pending transfers
  if (reservation.transfers.length > 0) {
    throw new ConflictError(
      "A transfer is already pending for this reservation",
    );
  }

  // Validate user's permission to transfer spots
  const isUserPrimary = reservation.primaryUserId === userId;
  const userSpot = reservation.reservationUsers.find(
    (ru) => ru.userId === userId,
  );

  if (!userSpot) {
    throw new AuthorizationError("User is not part of this reservation");
  }

  // Non-primary users can only transfer their own spot
  if (
    !isUserPrimary &&
    (spotsToTransfer.length > 1 || spotsToTransfer[0] !== userId)
  ) {
    throw new AuthorizationError(
      "Non-primary users can only transfer their own spot",
    );
  }

  // Validate all spots are part of the reservation
  const validSpots = reservation.reservationUsers.map((ru) => ru.userId);
  const invalidSpots = spotsToTransfer.filter(
    (spot) => !validSpots.includes(spot),
  );
  if (invalidSpots.length > 0) {
    throw new ValidationError(
      "One or more spots are not part of this reservation",
    );
  }

  // Check if recipient exists and has capacity
  const recipient = await prisma.user.findUnique({
    where: { id: toUserId },
    include: {
      reservationUsers: {
        where: {
          status: ReservationUserStatus.ACTIVE,
          reservation: {
            reservationDate: {
              gte: addDays(startOfDay(reservation.reservationDate), -2),
              lte: addDays(startOfDay(reservation.reservationDate), 2),
            },
          },
        },
      },
    },
  });

  if (!recipient) {
    throw new ValidationError("Recipient not found");
  }

  // Check consecutive dates rule for recipient
  await validateConsecutiveDates(toUserId, reservation.reservationDate);

  return true;
}

/**
 * Validates whether a user can accept a transfer
 * Checks:
 * 1. Transfer exists and is pending
 * 2. Transfer hasn't expired
 * 3. User is the intended recipient
 * 4. User still meets consecutive dates rule
 */
export async function canAcceptTransfer({
  userId,
  transferId,
}: AcceptTransferParams): Promise<boolean> {
  // Get transfer with related reservation data
  const transfer = await prisma.reservationTransfer.findUnique({
    where: {
      id: transferId,
      status: TransferStatus.PENDING,
    },
    include: {
      reservation: {
        include: {
          reservationUsers: {
            where: { status: ReservationUserStatus.ACTIVE },
          },
        },
      },
    },
  });

  if (!transfer) {
    throw new ValidationError("Transfer not found or not pending");
  }

  // Verify user is the intended recipient
  if (transfer.toUserId !== userId) {
    throw new AuthorizationError(
      "User is not the intended recipient of this transfer",
    );
  }

  // Check if transfer has expired
  if (isBefore(transfer.expiresAt, new Date())) {
    throw new ValidationError("Transfer has expired");
  }

  // Verify consecutive dates rule still applies
  await validateConsecutiveDates(userId, transfer.reservation.reservationDate);

  return true;
}

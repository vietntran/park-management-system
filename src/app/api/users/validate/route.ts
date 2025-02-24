import type { PrismaClient } from "@prisma/client";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Validation schema for request body
const validateSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, "At least one user ID is required")
    .max(3, "Maximum of 3 additional users allowed"),
});

interface UserValidationFields {
  id: string;
  email: string;
  isProfileComplete: boolean;
  emailVerified: Date | null;
}

interface UserWithAccounts extends UserValidationFields {
  accounts: { provider: string }[];
}

// Helper function to check user validity and format error message
function validateUsers(users: UserValidationFields[]): string | null {
  const invalidUsers = users.filter(
    (user) => !user.isProfileComplete || !user.emailVerified,
  );

  if (invalidUsers.length > 0) {
    return `Users must complete their profiles and verify their email: ${invalidUsers
      .map((u) => u.email)
      .join(", ")}`;
  }

  return null;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new AuthenticationError();
  }

  // Parse and validate request body
  const body = await request.json();
  const validationResult = validateSchema.safeParse(body);

  if (!validationResult.success) {
    throw new ValidationError(validationResult.error.message);
  }

  const { userIds } = validationResult.data;

  // Use transaction for the entire validation process
  await prisma.$transaction(async (tx: PrismaClient) => {
    // Query all users with necessary fields
    const users = (await tx.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        isProfileComplete: true,
        emailVerified: true,
        accounts: {
          select: { provider: true },
          where: { provider: "google" },
        },
      },
    })) as UserWithAccounts[];

    // Check if all users exist
    const foundUserIds = new Set(users.map((user) => user.id));
    const missingUserIds = userIds.filter((id) => !foundUserIds.has(id));
    if (missingUserIds.length > 0) {
      throw new ValidationError(`Users not found in the system`);
    }

    // Auto-verify Google OAuth users if needed
    const usersToAutoVerify = users.filter(
      (user) => !user.emailVerified && user.accounts.length > 0,
    );

    if (usersToAutoVerify.length > 0) {
      logger.info("Auto-verifying Google OAuth users", {
        userIds: usersToAutoVerify.map((u) => u.id),
      });

      // Update email verification for Google users
      await Promise.all(
        usersToAutoVerify.map((user) =>
          tx.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          }),
        ),
      );

      // Get updated user data
      const updatedUsers = (await tx.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          isProfileComplete: true,
          emailVerified: true,
        },
      })) as UserValidationFields[];

      const validationError = validateUsers(updatedUsers);
      if (validationError) {
        throw new ValidationError(validationError);
      }

      return updatedUsers;
    }

    // If no auto-verification needed, validate original users
    const validationError = validateUsers(users);
    if (validationError) {
      throw new ValidationError(validationError);
    }

    return users;
  });

  logger.info("Users validated successfully", {
    userIds,
    requestedBy: session.user.email,
  });

  return createSuccessResponse<{ valid: boolean }>(
    {
      valid: true,
    },
    HTTP_STATUS.OK,
  );
});

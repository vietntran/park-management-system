// src/app/api/users/validate/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import { handleServerError } from "@/lib/errors/serverErrorHandler";
import { prisma } from "@/lib/prisma";

// Validation schema for request body
const validateSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, "At least one user ID is required")
    .max(3, "Maximum of 3 additional users allowed"),
});

export async function POST(request: Request) {
  try {
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

    // Query all users in one go
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        isProfileComplete: true,
        emailVerified: true,
      },
    });

    // Check if all users exist and are properly registered
    const foundUserIds = new Set(users.map((user) => user.id));
    const missingUserIds = userIds.filter((id) => !foundUserIds.has(id));

    if (missingUserIds.length > 0) {
      throw new ValidationError(
        `Users not found: ${missingUserIds.join(", ")}`,
      );
    }

    // Check if all users have completed profiles and verified emails
    const invalidUsers = users.filter(
      (user) => !user.isProfileComplete || !user.emailVerified,
    );

    if (invalidUsers.length > 0) {
      throw new ValidationError(
        `Some users have incomplete profiles or unverified emails: ${invalidUsers.map((u) => u.id).join(", ")}`,
      );
    }

    // All checks passed
    return NextResponse.json({
      valid: true,
      message: "All users are valid",
    });
  } catch (error) {
    return handleServerError(error, {
      path: "/api/users/validate",
      method: "POST",
    });
  }
}

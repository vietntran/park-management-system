// src/app/api/auth/verify-email/route.ts
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import {
  AuthenticationError,
  ValidationError,
  TokenExpiredError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { emailVerificationSchema } from "@/lib/validations/auth";

interface EmailVerificationResponse {
  message: string;
  redirectUrl: string;
}

export const POST = withErrorHandler<EmailVerificationResponse>(
  async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

    // Check authentication
    const session = await getServerSession();
    if (!session?.user?.email) {
      logger.warn("Unauthorized email verification attempt", {
        requestId,
        ip,
      });
      throw new AuthenticationError();
    }

    const body = await req.json();

    // Validate request body using Zod schema
    const result = emailVerificationSchema.safeParse(body);
    if (!result.success) {
      logger.warn("Invalid email verification request", {
        requestId,
        ip,
        validationErrors: result.error.errors,
      });
      throw new ValidationError(result.error.errors[0].message);
    }

    const { token } = result.data;

    // Start a transaction to handle token verification and user update
    const verifiedUser = await prisma.$transaction(async (tx) => {
      // Find and validate token
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token },
      });

      if (!verificationToken) {
        logger.warn("Invalid verification token", {
          requestId,
          ip,
          token,
        });
        throw new ValidationError("Invalid verification token");
      }

      // Check token expiration
      if (new Date() > verificationToken.expires) {
        logger.warn("Expired verification token", {
          requestId,
          ip,
          token,
          expiredAt: verificationToken.expires,
        });
        throw new TokenExpiredError("Verification token has expired");
      }

      // Update user email verification status and ensure profile needs completion
      const updatedUser = await tx.user.update({
        where: {
          email: verificationToken.identifier,
        },
        data: {
          emailVerified: new Date(),
          isProfileComplete: false, // Explicitly set to ensure profile completion is required
        },
      });

      // Delete used token - Important for security
      await tx.verificationToken.delete({
        where: { token },
      });

      return updatedUser;
    });

    logger.info("Email verified successfully", {
      requestId,
      ip,
      userId: verifiedUser.id,
      email: verifiedUser.email,
      redirectTo: "/profile/complete",
    });

    // Return success with redirect URL
    return createSuccessResponse({
      message: "Email verified successfully",
      redirectUrl: "/profile/complete",
    });
  },
);

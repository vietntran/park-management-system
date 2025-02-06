// src/app/api/auth/resend-verification/route.ts
import { headers } from "next/headers";
import { getServerSession } from "next-auth";

import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import {
  AuthenticationError,
  TooManyRequestsError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { emailService } from "@/services/emailService";

interface ResendVerificationResponse {
  message: string;
}

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS: 3, // Lower than registration as this is a resend
  WINDOW_MS: 60 * 60 * 1000, // 1 hour window
} as const;

// In-memory rate limiting
const rateLimiter = new Map<string, { count: number; timestamp: number }>();

export const POST = withErrorHandler<ResendVerificationResponse>(async () => {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  // Check authentication
  const session = await getServerSession();
  if (!session?.user?.email) {
    logger.warn("Unauthorized resend verification attempt", {
      requestId,
      ip,
    });
    throw new AuthenticationError();
  }

  const email = session.user.email;

  // Rate limiting
  const now = Date.now();
  const rateLimitKey = `${ip}:${email}`;
  const currentLimit = rateLimiter.get(rateLimitKey) || {
    count: 0,
    timestamp: now,
  };

  if (now - currentLimit.timestamp > RATE_LIMIT.WINDOW_MS) {
    // Reset if window has passed
    currentLimit.count = 0;
    currentLimit.timestamp = now;
  } else if (currentLimit.count >= RATE_LIMIT.MAX_REQUESTS) {
    logger.warn("Rate limit exceeded for verification resend", {
      requestId,
      ip,
      email,
    });
    throw new TooManyRequestsError(
      "Too many verification attempts. Please try again later.",
    );
  }

  // Check if email is already verified
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  if (user?.emailVerified) {
    logger.warn("Attempt to resend verification for verified email", {
      requestId,
      ip,
      email,
    });
    throw new ValidationError("Email is already verified");
  }

  // Generate new token and send verification email
  const token = generateToken();
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);

  await prisma.$transaction(async (tx) => {
    // Delete any existing tokens for this email
    await tx.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Create new token
    await tx.verificationToken.create({
      data: {
        token,
        identifier: email,
        expires,
      },
    });
  });

  // Send new verification email
  await emailService.sendVerificationEmail(email, token);

  // Update rate limiting
  currentLimit.count += 1;
  rateLimiter.set(rateLimitKey, currentLimit);

  logger.info("Verification email resent successfully", {
    requestId,
    ip,
    email,
  });

  return createSuccessResponse({
    message: "Verification email sent successfully",
  });
});

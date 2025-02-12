import { hash } from "bcryptjs";
import { NextRequest } from "next/server";

import { HTTP_STATUS } from "@/constants/http";
import { createSuccessResponse } from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { ValidationError, ConflictError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/utils";
import { initialRegistrationSchema } from "@/lib/validations/auth";
import { emailService } from "@/services/emailService";
import { createRateLimiter } from "@/services/rateLimitService";

const checkRateLimit = createRateLimiter("auth:register", {
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const requestId = crypto.randomUUID();

  // Check rate limit first
  await checkRateLimit(requestId);

  const data = await req.json();

  // Use Zod schema for validation
  const result = initialRegistrationSchema.safeParse(data);

  if (!result.success) {
    logger.warn("Invalid registration data", {
      requestId,
      validationErrors: result.error.errors,
    });

    throw new ValidationError(result.error.errors[0].message);
  }

  const { email, password, name } = result.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    logger.warn("Registration attempt with existing email", {
      requestId,
      email,
    });

    throw new ConflictError("User already exists");
  }

  // Hash password
  const hashedPassword = await hash(password, 12);

  // Start a transaction for user creation and token generation
  const { user, verificationToken } = await prisma.$transaction(async (tx) => {
    // Create user with minimal data
    const user = await tx.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isProfileComplete: false,
      },
    });

    // Generate and save verification token
    const token = generateToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Token expires in 24 hours

    const verificationToken = await tx.verificationToken.create({
      data: {
        token,
        expires,
        identifier: email,
      },
    });

    return { user, verificationToken };
  });

  // Send verification email
  await emailService.sendVerificationEmail(email, verificationToken.token);

  logger.info("User registered successfully", {
    requestId,
    userId: user.id,
    email: user.email,
  });

  return createSuccessResponse(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isProfileComplete: false,
      },
    },
    HTTP_STATUS.CREATED,
  );
});

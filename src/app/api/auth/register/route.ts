import { hash } from "bcryptjs";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";

import { HTTP_STATUS } from "@/constants/http";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import {
  ValidationError,
  TooManyRequestsError,
  ConflictError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

// Rate limiting types
interface RateLimitInfo {
  count: number;
  timestamp: number;
}

// Response type for registration
interface RegistrationResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

const RATE_LIMIT = {
  MAX_REQUESTS: 5,
  WINDOW_MS: 60 * 1000, // 1 minute
} as const;

// Simple in-memory rate limiting (consider using Redis for production)
const rateLimiter = new Map<string, RateLimitInfo>();

function getRateLimitInfo(ip: string): RateLimitInfo {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.WINDOW_MS;

  // Clean up old entries
  for (const [key, value] of rateLimiter.entries()) {
    if (value.timestamp < windowStart) {
      rateLimiter.delete(key);
    }
  }

  const current = rateLimiter.get(ip) || { count: 0, timestamp: now };
  if (current.timestamp < windowStart) {
    current.count = 0;
    current.timestamp = now;
  }
  return current;
}

export const POST = withErrorHandler<RegistrationResponse>(
  async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

    // Rate limiting check
    const rateLimitInfo = getRateLimitInfo(ip);

    if (rateLimitInfo.count >= RATE_LIMIT.MAX_REQUESTS) {
      logger.warn("Rate limit exceeded", {
        requestId,
        ip,
        endpoint: "/api/auth/register",
        rateLimitInfo,
      });

      throw new TooManyRequestsError(
        "Too many requests. Please try again later.",
      );
    }

    rateLimitInfo.count += 1;
    rateLimiter.set(ip, rateLimitInfo);

    const data = await req.json();

    // Use Zod schema for validation
    const result = registerSchema.safeParse(data);

    if (!result.success) {
      logger.warn("Invalid registration data", {
        requestId,
        ip,
        validationErrors: result.error.errors,
      });

      throw new ValidationError(result.error.errors[0].message);
    }

    const { email, password, name, phone, address } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn("Registration attempt with existing email", {
        requestId,
        ip,
        email,
      });

      throw new ConflictError("User already exists");
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        password: hashedPassword,
        address: address
          ? {
              create: {
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                zipCode: address.zipCode,
              },
            }
          : undefined,
        phoneVerified: false,
      },
    });

    logger.info("User registered successfully", {
      requestId,
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: HTTP_STATUS.CREATED },
    );
  },
);

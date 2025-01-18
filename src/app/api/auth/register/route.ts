import { hash } from "bcryptjs";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { HTTP_STATUS } from "@/constants/http";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Define error type for better error handling
interface ErrorWithCode extends Error {
  code?: string;
}

// Rate limiting types
interface RateLimitInfo {
  count: number;
  timestamp: number;
}

const RATE_LIMIT = {
  MAX_REQUESTS: 5,
  WINDOW_MS: 60 * 1000, // 1 minute
};

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

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  try {
    // Rate limiting
    const rateLimitInfo = getRateLimitInfo(ip);

    if (rateLimitInfo.count >= RATE_LIMIT.MAX_REQUESTS) {
      logger.warn("Rate limit exceeded", {
        requestId,
        ip,
        endpoint: "/api/auth/register",
        rateLimitInfo,
      });

      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      );
    }

    rateLimitInfo.count += 1;
    rateLimiter.set(ip, rateLimitInfo);

    const { email, password, name, phone } = await req.json();

    // Input validation
    if (!email || !password || !name || !phone) {
      logger.warn("Missing required fields in registration attempt", {
        requestId,
        ip,
        missingFields: {
          email: !email,
          password: !password,
          name: !name,
          phone: !phone,
        },
      });

      return NextResponse.json(
        { error: "Missing required fields" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check password complexity
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{12,128}$/;
    if (!passwordRegex.test(password)) {
      logger.warn("Password complexity requirements not met", {
        requestId,
        ip,
        email,
      });

      return NextResponse.json(
        { error: "Password does not meet complexity requirements" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

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

      return NextResponse.json(
        { error: "User already exists" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
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
        address: false,
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
      { status: HTTP_STATUS.CREATED }
    );
  } catch (err) {
    const error = err as ErrorWithCode;

    logger.error("Registration error", {
      requestId,
      ip,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: HTTP_STATUS.INTERNAL_SERVER }
    );
  }
}

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations/auth";

// Response types for better type safety
interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: {
    id: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    zipCode: string;
  } | null;
  emailVerified: Date | null;
  phoneVerified: boolean;
}

export const GET = withErrorHandler<UserProfile>(async () => {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  const session = await getServerSession();
  if (!session?.user?.email) {
    logger.warn("Unauthorized profile access attempt", {
      requestId,
      ip,
    });
    throw new AuthenticationError();
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      address: true,
      emailVerified: true,
      phoneVerified: true,
    },
  });

  if (!user) {
    logger.warn("User not found during profile fetch", {
      requestId,
      ip,
      email: session.user.email,
    });
    throw new NotFoundError("User not found");
  }

  logger.info("Profile fetched successfully", {
    requestId,
    ip,
    userId: user.id,
  });

  return NextResponse.json(user, { status: HTTP_STATUS.OK });
});

export const PUT = withErrorHandler<UserProfile>(async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  const session = await getServerSession();
  if (!session?.user?.email) {
    logger.warn("Unauthorized profile update attempt", {
      requestId,
      ip,
    });
    throw new AuthenticationError();
  }

  const body = await req.json();

  // Use Zod schema for validation
  const result = profileUpdateSchema.safeParse(body);
  if (!result.success) {
    logger.warn("Invalid profile update data", {
      requestId,
      ip,
      validationErrors: result.error.errors,
    });
    throw new ValidationError(result.error.errors[0].message);
  }

  // Transform the validated data to match Prisma's expected format
  const updateData: Prisma.UserUpdateInput = {
    email: result.data.email,
    name: result.data.name,
    phone: result.data.phone,
    ...(result.data.address
      ? {
          address: {
            upsert: {
              create: result.data.address,
              update: result.data.address,
            },
          },
        }
      : {}),
  };

  try {
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    logger.info("Profile updated successfully", {
      requestId,
      ip,
      userId: updatedUser.id,
    });

    return NextResponse.json(updatedUser, { status: HTTP_STATUS.OK });
  } catch (error) {
    // Type guard to check if error is an Error object
    const err =
      error instanceof Error ? error : new Error("Unknown error occurred");

    logger.error("Profile update error", {
      requestId,
      ip,
      error: err,
    });

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ValidationError("Email already in use");
      }
    }
    throw error;
  }
});

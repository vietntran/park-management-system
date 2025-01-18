import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validations/auth";

interface ErrorWithCode extends Error {
  code?: string;
}

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    const body = await req.json();

    // Validate request body
    const result = addressSchema.safeParse(body);
    if (!result.success) {
      logger.warn("Invalid address data", {
        requestId,
        ip,
        errors: result.error.errors,
      });

      return NextResponse.json(
        { error: "Invalid address data" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!user) {
      logger.warn("User not found", {
        requestId,
        ip,
        email: session.user.email,
      });

      return NextResponse.json(
        { error: "User not found" },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Prepare update data
    const updateData: Prisma.UserUpdateInput = {
      address: true, // Mark that user has an address
    };

    // Update user
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

    logger.info("Address added/updated successfully", {
      requestId,
      ip,
      userId: updatedUser.id,
    });

    return NextResponse.json(updatedUser, { status: HTTP_STATUS.OK });
  } catch (err) {
    const error = err as ErrorWithCode;

    logger.error("Address update error", {
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

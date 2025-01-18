import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/validations/auth";

interface ErrorWithCode extends Error {
  code?: string;
}

export async function GET() {
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

    return NextResponse.json(user, { status: HTTP_STATUS.OK });
  } catch (err) {
    const error = err as ErrorWithCode;

    logger.error("Profile fetch error", {
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

export async function PUT(req: Request) {
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
    const result = profileUpdateSchema.safeParse(body);
    if (!result.success) {
      logger.warn("Invalid profile update data", {
        requestId,
        ip,
        errors: result.error.errors,
      });

      return NextResponse.json(
        { error: "Invalid request data" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Transform the validated data to match Prisma's expected format
    const updateData: Prisma.UserUpdateInput = {
      email: result.data.email,
      name: result.data.name,
      phone: result.data.phone,
    };

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
  } catch (err) {
    const error = err as ErrorWithCode;

    logger.error("Profile update error", {
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

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

    // Get user
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        address: true,
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

    // Update or create address
    const address = await prisma.address.upsert({
      where: {
        userId: user.id,
      },
      update: {
        ...result.data,
      },
      create: {
        ...result.data,
        userId: user.id,
      },
      select: {
        line1: true,
        line2: true,
        city: true,
        state: true,
        zipCode: true,
        updatedAt: true,
      },
    });

    logger.info("Address added/updated successfully", {
      requestId,
      ip,
      userId: user.id,
    });

    return NextResponse.json(address, { status: HTTP_STATUS.OK });
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
      include: {
        address: {
          select: {
            line1: true,
            line2: true,
            city: true,
            state: true,
            zipCode: true,
            updatedAt: true,
          },
        },
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

    return NextResponse.json(user.address || null, { status: HTTP_STATUS.OK });
  } catch (err) {
    const error = err as ErrorWithCode;

    logger.error("Address fetch error", {
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

export async function DELETE() {
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

    await prisma.address.delete({
      where: {
        userId: user.id,
      },
    });

    logger.info("Address deleted successfully", {
      requestId,
      ip,
      userId: user.id,
    });

    return NextResponse.json(
      { message: "Address deleted successfully" },
      { status: HTTP_STATUS.OK }
    );
  } catch (err) {
    const error = err as ErrorWithCode;

    // If the error is about non-existent address, return success
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Address already deleted" },
        { status: HTTP_STATUS.OK }
      );
    }

    logger.error("Address deletion error", {
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

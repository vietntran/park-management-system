import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { emailVerificationSchema } from "@/lib/validations/auth";

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
    const result = emailVerificationSchema.safeParse(body);
    if (!result.success) {
      logger.warn("Invalid email verification request", {
        requestId,
        ip,
        errors: result.error.errors,
      });

      return NextResponse.json(
        { error: "Invalid request data" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { token } = result.data;

    // Verify token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token,
      },
    });

    if (!verificationToken) {
      logger.warn("Invalid verification token", {
        requestId,
        ip,
        token,
      });

      return NextResponse.json(
        { error: "Invalid verification token" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      logger.warn("Expired verification token", {
        requestId,
        ip,
        token,
        expiredAt: verificationToken.expires,
      });

      return NextResponse.json(
        { error: "Verification token has expired" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Update user email verification status
    await prisma.user.update({
      where: {
        email: verificationToken.identifier,
      },
      data: {
        emailVerified: new Date(),
      },
    });

    // Delete used token
    await prisma.verificationToken.delete({
      where: {
        token,
      },
    });

    logger.info("Email verified successfully", {
      requestId,
      ip,
      email: verificationToken.identifier,
    });

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: HTTP_STATUS.OK }
    );
  } catch (err) {
    const error = err as ErrorWithCode;

    logger.error("Email verification error", {
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
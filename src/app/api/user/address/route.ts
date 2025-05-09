// src/app/api/user/address/route.ts
import { headers } from "next/headers";
import { type NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/api/responseWrappers";
import { withErrorHandler } from "@/lib/api/withErrorHandler";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validations/auth";
import type { AddressResponse } from "@/types/address";

export const POST = withErrorHandler<AddressResponse>(
  async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const data = await req.json();
    const result = addressSchema.safeParse(data);

    if (!result.success) {
      logger.warn("Invalid address input", {
        requestId,
        ip,
        endpoint: "/api/user/address",
        validationErrors: result.error.errors,
      });

      throw new ValidationError(result.error.errors[0].message);
    }

    const { line1, line2, city, state, zipCode } = result.data;

    // Check if user already has an address
    const existingAddress = await prisma.address.findUnique({
      where: { userId: session.user.id },
    });

    if (existingAddress) {
      logger.warn("Address already exists for user", {
        requestId,
        ip,
        userId: session.user.id,
      });

      throw new ConflictError("Address already exists. Use PUT to update.");
    }

    // Create new address
    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        line1,
        line2,
        city,
        state: state.toUpperCase(),
        zipCode,
      },
    });

    logger.info("Address created successfully", {
      requestId,
      userId: session.user.id,
      addressId: address.id,
    });

    return createSuccessResponse<AddressResponse>(
      { success: true, data: address },
      HTTP_STATUS.CREATED,
    );
  },
);

export const PUT = withErrorHandler<AddressResponse>(
  async (req: NextRequest) => {
    const requestId = crypto.randomUUID();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new AuthenticationError();
    }

    const data = await req.json();
    const result = addressSchema.safeParse(data);

    if (!result.success) {
      logger.warn("Invalid address input for update", {
        requestId,
        ip,
        endpoint: "/api/user/address",
        validationErrors: result.error.errors,
      });

      throw new ValidationError(result.error.errors[0].message);
    }

    const { line1, line2, city, state, zipCode } = result.data;

    try {
      const address = await prisma.address.update({
        where: { userId: session.user.id },
        data: {
          line1,
          line2,
          city,
          state: state.toUpperCase(),
          zipCode,
        },
      });

      logger.info("Address updated successfully", {
        requestId,
        userId: session.user.id,
        addressId: address.id,
      });

      return createSuccessResponse<AddressResponse>(
        { success: true, data: address },
        HTTP_STATUS.OK,
      );
    } catch (err) {
      // Type guard for Prisma error with code
      if (err && typeof err === "object" && "code" in err) {
        const prismaError = err as { code: string };
        if (prismaError.code === "P2025") {
          logger.warn("Address not found for update", {
            requestId,
            ip,
            userId: session.user.id,
          });
          return createErrorResponse(
            "Address not found. Use POST to create a new address.",
            HTTP_STATUS.NOT_FOUND,
          );
        }
      }
      throw err;
    }
  },
);

export const GET = withErrorHandler<AddressResponse>(async () => {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "unknown";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthenticationError();
  }

  const address = await prisma.address.findUnique({
    where: { userId: session.user.id },
  });

  if (!address) {
    logger.warn("Address not found", {
      requestId,
      ip,
      userId: session.user.id,
    });
    throw new NotFoundError("Address not found");
  }

  return createSuccessResponse<AddressResponse>(
    { success: true, data: address },
    HTTP_STATUS.OK,
  );
});

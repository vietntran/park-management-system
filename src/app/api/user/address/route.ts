import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { HTTP_STATUS } from "@/constants/http";
import { authOptions } from "@/lib/auth";
import logger from "@/lib/logger";
import { prisma } from "@/lib/prisma";

// Extend Session type to include user id
interface ExtendedSession extends Session {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

// Type for address input validation
interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
}

// Type for Prisma errors
interface PrismaError extends Error {
  code?: string;
  meta?: Record<string, unknown>;
}

// Validate address input
function validateAddressInput(data: unknown): {
  isValid: boolean;
  error?: string;
} {
  if (!data || typeof data !== "object") {
    return { isValid: false, error: "Address data is required" };
  }

  const addressData = data as Partial<AddressInput>;
  const requiredFields = ["line1", "city", "state", "zipCode"] as const;
  const missingFields = requiredFields.filter((field) => !addressData[field]);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  // Validate US ZIP code format (5 digits or 5+4)
  const zipCodeRegex = /^\d{5}(-\d{4})?$/;
  if (!zipCodeRegex.test(addressData.zipCode as string)) {
    return { isValid: false, error: "Invalid ZIP code format" };
  }

  // Validate state code (2 uppercase letters)
  const stateRegex = /^[A-Z]{2}$/;
  if (!stateRegex.test(addressData.state as string)) {
    return {
      isValid: false,
      error: "State must be a 2-letter code (e.g., CA)",
    };
  }

  return { isValid: true };
}

// POST handler for creating a new address
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  try {
    // Check authentication
    const session = (await getServerSession(
      authOptions,
    )) as ExtendedSession | null;
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const data = (await req.json()) as unknown;
    const validation = validateAddressInput(data);

    if (!validation.isValid) {
      logger.warn("Invalid address input", {
        requestId,
        ip,
        error: validation.error,
        userId: session.user.id,
      });

      return NextResponse.json(
        { error: validation.error },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const addressData = data as AddressInput;

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

      return NextResponse.json(
        { error: "Address already exists. Use PUT to update." },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Create new address
    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        line1: addressData.line1,
        line2: addressData.line2,
        city: addressData.city,
        state: addressData.state.toUpperCase(),
        zipCode: addressData.zipCode,
      },
    });

    logger.info("Address created successfully", {
      requestId,
      userId: session.user.id,
      addressId: address.id,
    });

    return NextResponse.json(address, { status: HTTP_STATUS.CREATED });
  } catch (err) {
    const error = err as PrismaError;

    logger.error("Error creating address", {
      requestId,
      ip,
      error: error.message,
      errorCode: error.code,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: HTTP_STATUS.INTERNAL_SERVER },
    );
  }
}

// PUT handler for updating an existing address
export async function PUT(req: Request) {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  let session: ExtendedSession | null = null;

  try {
    // Check authentication
    session = (await getServerSession(authOptions)) as ExtendedSession | null;
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const data = (await req.json()) as unknown;
    const validation = validateAddressInput(data);

    if (!validation.isValid) {
      logger.warn("Invalid address input for update", {
        requestId,
        ip,
        error: validation.error,
        userId: session.user.id,
      });

      return NextResponse.json(
        { error: validation.error },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const addressData = data as AddressInput;

    // Update address
    const address = await prisma.address.update({
      where: { userId: session.user.id },
      data: {
        line1: addressData.line1,
        line2: addressData.line2,
        city: addressData.city,
        state: addressData.state.toUpperCase(),
        zipCode: addressData.zipCode,
      },
    });

    logger.info("Address updated successfully", {
      requestId,
      userId: session.user.id,
      addressId: address.id,
    });

    return NextResponse.json(address);
  } catch (err) {
    const error = err as PrismaError;

    // Handle case where address doesn't exist
    if (error.code === "P2025") {
      logger.warn("Address not found for update", {
        requestId,
        ip,
        userId: session?.user?.id,
      });

      return NextResponse.json(
        { error: "Address not found. Use POST to create a new address." },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    logger.error("Error updating address", {
      requestId,
      ip,
      error: error.message,
      errorCode: error.code,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: HTTP_STATUS.INTERNAL_SERVER },
    );
  }
}

// GET handler for retrieving the current address
export async function GET() {
  const requestId = crypto.randomUUID();
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";

  try {
    // Check authentication
    const session = (await getServerSession(
      authOptions,
    )) as ExtendedSession | null;
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    const address = await prisma.address.findUnique({
      where: { userId: session.user.id },
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    return NextResponse.json(address);
  } catch (err) {
    const error = err as PrismaError;

    logger.error("Error retrieving address", {
      requestId,
      ip,
      error: error.message,
      errorCode: error.code,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: HTTP_STATUS.INTERNAL_SERVER },
    );
  }
}

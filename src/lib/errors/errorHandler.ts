// src/lib/errors/errorHandler.ts
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import logger from "@/lib/logger";

import { BaseError } from "./BaseError";

interface ErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}

export function handleError(error: unknown): NextResponse<ErrorResponse> {
  // Handle our custom errors
  if (error instanceof BaseError) {
    logger.warn({
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({
      message: "Validation error",
      details: error.errors,
    });
    return NextResponse.json(
      { error: "Invalid request data", details: error.errors },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({
      message: "Database error",
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });

    // Handle specific Prisma error codes
    switch (error.code) {
      case "P2002": // Unique constraint violation
        return NextResponse.json(
          { error: "Resource already exists", code: error.code },
          { status: HTTP_STATUS.CONFLICT },
        );
      case "P2025": // Record not found
        return NextResponse.json(
          { error: "Resource not found", code: error.code },
          { status: HTTP_STATUS.NOT_FOUND },
        );
      default:
        return NextResponse.json(
          { error: "Database error occurred", code: error.code },
          { status: HTTP_STATUS.INTERNAL_SERVER },
        );
    }
  }

  // Handle unexpected errors
  logger.error({
    message: "Unexpected error",
    error: error instanceof Error ? error : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    { error: "Internal server error" },
    { status: HTTP_STATUS.INTERNAL_SERVER },
  );
}

// src/lib/errors/errorHandler.ts
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import logger, { LogContext } from "@/lib/logger";

import { BaseError } from "./BaseError";

interface ErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}

type ExtendedLogContext = LogContext & {
  additionalInfo?: Record<string, unknown>;
};

// Function for logging only (without response formatting)
export function logError(error: Error, context?: ExtendedLogContext) {
  const logContext: ExtendedLogContext = {
    ...context,
    path: context?.path || "unknown",
    method: context?.method || "unknown",
    error,
    timestamp: new Date().toISOString(),
  };

  logger.error("Server Error", logContext);
}

// Main error handler for API routes (includes logging and response formatting)
export function handleServerError(
  error: unknown,
  context?: ExtendedLogContext,
): NextResponse<ErrorResponse> {
  const logContext: ExtendedLogContext = {
    ...context,
    path: context?.path || "unknown",
    method: context?.method || "unknown",
  };

  // Handle our custom errors
  if (error instanceof BaseError) {
    logger.warn("Custom error occurred", {
      ...logContext,
      error,
      statusCode: error.statusCode,
    });
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn("Validation error occurred", {
      ...logContext,
      error: new Error("Validation error"),
      details: error.errors,
    });
    return NextResponse.json(
      { error: "Invalid request data", details: error.errors },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error("Database error occurred", {
      ...logContext,
      error: error as Error,
      code: error.code,
      meta: error.meta,
    });

    switch (error.code) {
      case "P2002":
        return NextResponse.json(
          { error: "Resource already exists", code: error.code },
          { status: HTTP_STATUS.CONFLICT },
        );
      case "P2025":
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
  const unexpectedError =
    error instanceof Error ? error : new Error("Unknown error");
  logger.error("Unexpected error occurred", {
    ...logContext,
    error: unexpectedError,
  });

  return NextResponse.json(
    { error: "Internal server error" },
    { status: HTTP_STATUS.INTERNAL_SERVER },
  );
}

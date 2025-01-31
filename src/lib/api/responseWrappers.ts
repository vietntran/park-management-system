// src/lib/api/responseWrappers.ts
import { NextResponse } from "next/server";

import { HTTP_STATUS } from "@/constants/http";

import type { ErrorResponse, SuccessResponse } from "./withErrorHandler";

export function createSuccessResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK,
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
    },
    { status },
  );
}

// Define a type for the error details
type ErrorDetails = Record<string, unknown>;

export function createErrorResponse(
  error: string,
  status: number = HTTP_STATUS.BAD_REQUEST,
  details?: ErrorDetails,
  code?: string,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error,
      ...(details && { details }),
      ...(code && { code }),
    },
    { status },
  );
}

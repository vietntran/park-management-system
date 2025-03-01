// src/lib/api/withErrorHandler.ts
import { NextRequest, NextResponse } from "next/server";

import { handleServerError } from "@/lib/errors/serverErrorHandler";
import { RouteContext } from "@/types/route";

// Define the error response type
export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

// Define the success response type
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

// Define response type that can be either success or error
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Type-safe route handler definition
export type RouteHandler<T> = (
  req: NextRequest,
  context?: RouteContext,
) => Promise<NextResponse<ApiResponse<T>>>;

export function withErrorHandler<T>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (req: NextRequest, context?: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Safely extract userId if available
      let userId: string | undefined;
      if (context?.params) {
        // Handle both Promise and direct object cases
        const params = await Promise.resolve(context.params);
        userId = params.userId as string | undefined;
      }

      // Pass request context to error handler
      return handleServerError(error, {
        path: req.url,
        method: req.method,
        userId,
      }) as NextResponse<ApiResponse<T>>;
    }
  };
}

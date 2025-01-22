import { NextRequest, NextResponse } from "next/server";

import { handleError } from "@/lib/errors/errorHandler";

// Define the error response type
interface ErrorResponse {
  error: string;
  details?: unknown;
  code?: string;
}

// Define route context type
interface RouteContext {
  params?: { [key: string]: string | string[] };
}

// Define response type that can be either success (T) or error
type ApiResponse<T> = T | ErrorResponse;

// Type-safe route handler definition
type RouteHandler<T> = (
  req: NextRequest,
  context?: RouteContext,
) => Promise<NextResponse<ApiResponse<T>>>;

export function withErrorHandler<T>(handler: RouteHandler<T>): RouteHandler<T> {
  return async (req: NextRequest, context?: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Pass request context to error handler
      return handleError(error, {
        path: req.url,
        method: req.method,
        userId: context?.params?.userId as string | undefined,
      }) as NextResponse<ApiResponse<T>>;
    }
  };
}

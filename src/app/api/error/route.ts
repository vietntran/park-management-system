// src/app/api/error/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";

import { HTTP_STATUS } from "@/constants/http";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/api/responseWrappers";
import { logError } from "@/lib/errors/serverErrorHandler";

// Define the error request schema
const errorRequestSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  timestamp: z.string().optional(),
  additionalInfo: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = errorRequestSchema.parse(body);

    // Log the error instead of throwing it
    logError(new Error(validatedData.message), {
      path: validatedData.path || "/api/error",
      method: validatedData.method || "POST",
      additionalInfo: validatedData.additionalInfo,
    });

    // Return a success response
    return createSuccessResponse({ logged: true }, HTTP_STATUS.OK);
  } catch (error) {
    // If there's an error in the error logging endpoint itself, just return a basic error response
    // This prevents an infinite loop of error logging
    console.error("Error in error logging endpoint:", error);
    return createErrorResponse(
      "Error logging failed",
      HTTP_STATUS.INTERNAL_SERVER,
    );
  }
}

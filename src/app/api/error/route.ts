// src/app/api/error/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { handleServerError } from "@/lib/errors/serverErrorHandler";

// Define the error request schema
const errorRequestSchema = z.object({
  message: z.string(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().optional(),
  timestamp: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const validatedData = errorRequestSchema.parse(body);

    // Log the error using Winston
    handleServerError(new Error(validatedData.message), validatedData);

    return NextResponse.json({
      message: "Error logged successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      handleServerError(error, {
        statusCode: 400,
        path: "/api/error",
        method: "POST",
      });
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    handleServerError(error as Error, {
      path: "/api/error",
      method: "POST",
      statusCode: 500,
    });

    return NextResponse.json({ error: "Failed to log error" }, { status: 500 });
  }
}

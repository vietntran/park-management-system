import { NextRequest } from "next/server";
import { z } from "zod";

import { handleServerError } from "@/lib/errors/serverErrorHandler";

// Define the error request schema
const errorRequestSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = errorRequestSchema.parse(body);

    throw new Error(validatedData.message);
  } catch (error) {
    return handleServerError(error, {
      path: "/api/error",
      method: "POST",
    });
  }
}

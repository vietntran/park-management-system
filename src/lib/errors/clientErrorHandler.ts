// src/lib/errors/clientErrorHandler.ts
"use client";

import { toast } from "sonner";

interface ErrorContext {
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  additionalInfo?: Record<string, unknown>;
}

export async function handleClientError(error: Error, context?: ErrorContext) {
  // Show user-friendly error message
  toast.error(error.message || "An unexpected error occurred");

  try {
    // Send error to API endpoint for logging
    const response = await fetch("/api/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: error.message,
        ...context,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("Failed to send error to logging endpoint");
    }
  } catch (loggingError) {
    console.error("Error logging failed:", {
      originalError: error,
      loggingError,
    });
  }
}

export function handleFormError(error: unknown): string {
  if (error instanceof Error) {
    handleClientError(error, { path: window.location.pathname });
    return error.message;
  }

  const genericError = new Error("An unexpected error occurred");
  handleClientError(genericError, { path: window.location.pathname });
  return genericError.message;
}

export async function handleApiError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  const errorMessage = errorData.error || `API Error: ${response.status}`;
  const error = new Error(errorMessage);

  handleClientError(error, {
    path: response.url,
    statusCode: response.status,
    method: "GET",
  });

  throw error;
}

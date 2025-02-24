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

interface ErrorLogPayload {
  message: string;
  path?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  additionalInfo?: Record<string, unknown>;
  timestamp: string;
}

// For logging errors to the server
async function logError(error: Error, context?: ErrorContext) {
  try {
    const payload: ErrorLogPayload = {
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    if (context) {
      if (context.path) payload.path = context.path;
      if (context.method) payload.method = context.method;
      if (context.statusCode) payload.statusCode = context.statusCode;
      if (context.userId) payload.userId = context.userId;
      if (context.additionalInfo)
        payload.additionalInfo = context.additionalInfo;
    }

    const response = await fetch("/api/error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to send error to logging endpoint");
    }
  } catch (loggingError) {
    console.error("Error logging failed:", {
      originalError: error.message,
      loggingError:
        loggingError instanceof Error ? loggingError.message : "Unknown error",
    });
  }
}

// For handling errors in regular client code (with toast)
export async function handleClientError(error: Error, context?: ErrorContext) {
  toast.error(error.message || "An unexpected error occurred");
  await logError(error, context);
}

// For handling form errors (without toast)
export function handleFormError(error: unknown): string {
  if (error instanceof Error) {
    // Just log the error, don't show toast
    logError(error, { path: window.location.pathname });
    return error.message;
  }

  const genericError = new Error("An unexpected error occurred");
  logError(genericError, { path: window.location.pathname });
  return genericError.message;
}

// For handling API errors
export async function handleApiError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  const errorMessage = errorData.error || `API Error: ${response.status}`;
  const error = new Error(errorMessage);

  await handleClientError(error, {
    path: response.url,
    statusCode: response.status,
    method: "GET",
  });

  throw error;
}

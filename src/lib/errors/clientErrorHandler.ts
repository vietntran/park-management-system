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

const RESERVATION_CONSECUTIVE_DAYS_ERROR =
  "Cannot make reservation. Users are limited to 3 consecutive days.";

// For logging errors to the server
async function logError(error: Error, context?: ErrorContext) {
  try {
    if (error.name === "AbortError" || error.message.includes("aborted")) {
      console.log("Request was aborted, not logging to server");
      return;
    }

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

function shouldSuppressToast(errorMessage: string): boolean {
  return errorMessage === RESERVATION_CONSECUTIVE_DAYS_ERROR;
}

// For handling errors in regular client code (with toast)
export async function handleClientError(error: Error, context?: ErrorContext) {
  // Don't show toast for abort errors or suppressed error patterns
  if (
    error.name !== "AbortError" &&
    !error.message.includes("aborted") &&
    !shouldSuppressToast(error.message)
  ) {
    toast.error(error.message || "An unexpected error occurred");
  }
  await logError(error, context);
}

// For handling form errors (without toast)
export function handleFormError(error: unknown): string {
  if (error instanceof Error) {
    // Don't return abort errors to the UI
    if (error.name === "AbortError" || error.message.includes("aborted")) {
      console.log("Request was aborted, not displaying error");
      return "";
    }

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

  if (!shouldSuppressToast(errorMessage)) {
    await handleClientError(error, {
      path: response.url,
      statusCode: response.status,
      method: "GET",
    });
  } else {
    // Still log the error but don't show toast
    await logError(error, {
      path: response.url,
      statusCode: response.status,
      method: "GET",
    });
  }

  throw error;
}

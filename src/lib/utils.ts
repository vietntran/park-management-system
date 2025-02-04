import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { ApiResponse } from "@/types/api";

import { handleApiError, handleClientError } from "./errors/clientErrorHandler";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function typedFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(input, init);
    if (!response.ok) {
      await handleApiError(response);
    }
    return response.json();
  } catch (error) {
    handleClientError(
      error instanceof Error ? error : new Error("Request failed"),
      {
        path: typeof input === "string" ? input : input.toString(),
        method: init?.method || "GET",
      },
    );
    throw error;
  }
}

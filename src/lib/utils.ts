import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { ApiResponse } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function typedFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const response = await fetch(input, init);
  return response.json();
}

// src/types/api.ts
export interface ErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

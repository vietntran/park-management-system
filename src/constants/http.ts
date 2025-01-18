export const HTTP_STATUS = {
  OK: 200, // Successful request
  CREATED: 201, // Successful resource creation
  NO_CONTENT: 204, // Successful request with no content to return
  BAD_REQUEST: 400, // Invalid request (client error)
  UNAUTHORIZED: 401, // Authentication required
  FORBIDDEN: 403, // Authenticated but not authorized
  NOT_FOUND: 404, // Resource not found
  CONFLICT: 409, // Resource conflict (e.g., duplicate entry),
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER: 500, // Server error
} as const;

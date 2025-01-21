import { HTTP_STATUS } from "@/constants/http";

import { BaseError } from "./BaseError";

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = "Authentication required") {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = "Not authorized") {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string) {
    super(message, HTTP_STATUS.CONFLICT);
  }
}

export class TooManyRequestsError extends BaseError {
  constructor(message: string = "Too many requests") {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
}

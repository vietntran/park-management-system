import NextAuth from "next-auth/next";

import { withErrorHandler } from "@/app/api/error";
import { HTTP_STATUS } from "@/constants/http";
import { authOptions } from "@/lib/auth";
import {
  AuthenticationError,
  ValidationError,
} from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";

interface AuthResponse {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

const handler = NextAuth(authOptions);

export const GET = withErrorHandler<AuthResponse>(async (req) => {
  try {
    const requestId = crypto.randomUUID();
    const response = await handler(req);

    // Log successful authentication
    if (response.status === HTTP_STATUS.OK) {
      logger.info("Authentication successful", {
        requestId,
        method: "GET",
        path: "/api/auth/[...nextauth]",
      });
    }

    return response;
  } catch (error) {
    logger.error("Authentication error", {
      error,
      method: "GET",
      path: "/api/auth/[...nextauth]",
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new AuthenticationError("Authentication failed");
  }
});

export const POST = withErrorHandler<AuthResponse>(async (req) => {
  try {
    const requestId = crypto.randomUUID();
    const response = await handler(req);

    // Log successful authentication
    if (response.status === HTTP_STATUS.OK) {
      logger.info("Authentication successful", {
        requestId,
        method: "POST",
        path: "/api/auth/[...nextauth]",
      });
    }

    return response;
  } catch (error) {
    logger.error("Authentication error", {
      error,
      method: "POST",
      path: "/api/auth/[...nextauth]",
    });

    if (error instanceof ValidationError) {
      throw error;
    }

    throw new AuthenticationError("Authentication failed");
  }
});

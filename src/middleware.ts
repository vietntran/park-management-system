import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import logger from "@/lib/logger";
import type { LogContext } from "@/lib/logger";

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const logContext: LogContext = {
      path: request.nextUrl.pathname,
      method: request.method,
    };

    if (!token) {
      logger.info("Unauthenticated access attempt", {
        ...logContext,
        redirectTo: "/auth/login",
      });
      return NextResponse.redirect(
        new URL(`/auth/login?from=${request.nextUrl.pathname}`, request.url),
      );
    }

    // Add userId to context once we have the token
    logContext.userId = token.sub;

    if (!token.isProfileComplete) {
      if (request.nextUrl.pathname === "/profile/complete") {
        return NextResponse.next();
      }

      logger.info("Incomplete profile access attempt", {
        ...logContext,
        redirectTo: "/profile/complete",
      });

      const response = NextResponse.redirect(
        new URL("/profile/complete", request.url),
      );

      response.cookies.set(
        "redirectAfterProfile",
        request.nextUrl.pathname + request.nextUrl.search,
      );

      return response;
    }

    return NextResponse.next();
  } catch (error) {
    const errorContext: LogContext = {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    logger.error("Middleware error", errorContext);

    // Still redirect to login on error for security
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
}

// Config remains the same
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/reservations/:path*",
    "/reservations/:path*",
    "/profile/complete", // Prevent redirect loops
  ],
};

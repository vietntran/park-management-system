import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import edgeLogger from "@/lib/edge-logger";
import type { LogContext } from "@/lib/logger";

export async function middleware(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    const logContext: LogContext = {
      path: request.nextUrl.pathname,
      method: request.method,
    };

    if (!token) {
      edgeLogger.info("Unauthenticated access attempt", {
        ...logContext,
        redirectTo: "/auth/login",
      });
      return NextResponse.redirect(
        new URL(`/auth/login?from=${request.nextUrl.pathname}`, request.url),
      );
    }

    logContext.userId = token.sub;

    if (!token.isProfileComplete) {
      // Allow access to profile/complete
      if (request.nextUrl.pathname === "/profile/complete") {
        return NextResponse.next();
      }

      edgeLogger.info("Incomplete profile access attempt", {
        ...logContext,
        redirectTo: "/profile/complete",
      });

      // Create redirect response
      const response = NextResponse.redirect(
        new URL("/profile/complete", request.url),
      );

      // Store original path including search params
      const returnPath = request.nextUrl.pathname + request.nextUrl.search;
      response.cookies.set("redirectAfterProfile", returnPath);

      return response;
    }

    return NextResponse.next();
  } catch (error) {
    const errorContext: LogContext = {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    edgeLogger.error("Middleware error", errorContext);

    // Still redirect to login on error for security
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/reservations/:path*",
    "/reservations/:path*",
    "/profile/:path*",
  ],
};

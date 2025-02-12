import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import edgeLogger from "@/lib/edge-logger";
import type { LogContext } from "@/lib/logger";

// Define protected paths that require profile completion
const PATHS_REQUIRING_PROFILE = [
  "/reservations",
  "/api/reservations",
  "/profile/reservations",
];

export async function middleware(request: NextRequest) {
  try {
    // Skip auth check for public API routes
    if (request.nextUrl.pathname.startsWith("/api/public")) {
      return NextResponse.next();
    }

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

    // Check if the current path requires a complete profile
    const requiresCompleteProfile = PATHS_REQUIRING_PROFILE.some((path) =>
      request.nextUrl.pathname.startsWith(path),
    );

    // Handle profile completion status
    if (!token.isProfileComplete && requiresCompleteProfile) {
      // Allow access to profile completion page and its API
      if (
        request.nextUrl.pathname === "/profile/complete" ||
        request.nextUrl.pathname === "/api/auth/profile/complete"
      ) {
        return NextResponse.next();
      }

      edgeLogger.info("Incomplete profile accessing protected route", {
        ...logContext,
        redirectTo: "/profile/complete",
      });

      // Create redirect response
      const response = NextResponse.redirect(
        new URL("/profile/complete", request.url),
      );

      // Store original path including search params for redirect after completion
      const returnPath = request.nextUrl.pathname + request.nextUrl.search;
      response.cookies.set("redirectAfterProfile", returnPath);

      return response;
    }

    // Redirect completed profiles away from profile completion page
    if (
      token.isProfileComplete &&
      request.nextUrl.pathname === "/profile/complete"
    ) {
      edgeLogger.info("Completed profile accessing completion page", {
        ...logContext,
        redirectTo: "/profile",
      });
      return NextResponse.redirect(new URL("/profile", request.url));
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

// MATCHER STRATEGY:
// We use explicit path matching instead of exclusion patterns because:
// - It's more explicit about what routes are protected
// - Easier to maintain and audit security
// - Less prone to accidentally protecting/exposing wrong routes
// - New routes must be consciously added to be protected
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/reservations/:path*",
    "/reservations/:path*",
    "/profile/:path*",
    "/api/auth/profile/complete",
  ],
};

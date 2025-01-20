import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(
      new URL(`/auth/login?from=${request.nextUrl.pathname}`, request.url),
    );
  }

  // Check profile completion for all protected routes
  if (!token.isProfileComplete) {
    // Don't redirect if already on profile completion page
    if (request.nextUrl.pathname === "/profile/complete") {
      return NextResponse.next();
    }

    const response = NextResponse.redirect(
      new URL("/profile/complete", request.url),
    );

    // Store the original URL to redirect back after profile completion
    response.cookies.set(
      "redirectAfterProfile",
      request.nextUrl.pathname + request.nextUrl.search,
    );

    return response;
  }

  return NextResponse.next();
}

// Configure which routes should be handled by this middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/reservations/:path*",
    "/reservations/:path*",
    "/profile/complete", // Include this to prevent redirect loops
  ],
};

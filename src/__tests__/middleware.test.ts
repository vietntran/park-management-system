/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { middleware } from "@/middleware";

// Mock next-auth
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

// Mock edge-logger
jest.mock("@/lib/edge-logger", () => {
  return {
    __esModule: true,
    default: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  };
});

// Extend the existing NextResponse mock from jest.setup.js
jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server");

  // Define the type for our response with cookies
  type ResponseWithCookies = Response & {
    cookies: {
      set: (name: string, value: string) => void;
    };
  };

  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      redirect: jest.fn().mockImplementation((url) => {
        const headers = new Headers({
          Location: url.toString(),
        });

        const response = new Response(null, {
          status: 307,
          headers,
        }) as ResponseWithCookies;

        // Update to use response.headers
        response.cookies = {
          set: (name: string, value: string) => {
            response.headers.append("Set-Cookie", `${name}=${value}`);
          },
        };

        return response;
      }),
      next: jest.fn().mockImplementation(() => {
        const headers = new Headers();
        const response = new Response(null, {
          status: 200,
          headers,
        }) as ResponseWithCookies;

        response.cookies = {
          set: (name: string, value: string) => {
            response.headers.append("Set-Cookie", `${name}=${value}`);
          },
        };

        return response;
      }),
    },
  };
});

describe("Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue(null);
  });

  it("should redirect to login when not authenticated", async () => {
    const url = new URL("http://localhost:3000/dashboard");

    const request = {
      nextUrl: url,
      url: url.toString(),
      method: "GET",
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await middleware(request);
    expect(response?.status).toBe(307);
    expect(response?.headers.get("Location")).toBe(
      "http://localhost:3000/auth/login?from=/dashboard",
    );
  });

  it("should redirect to profile completion when profile is incomplete", async () => {
    // Mock authenticated user with incomplete profile - add all expected token properties
    (getToken as jest.Mock).mockResolvedValue({
      name: "Test User",
      email: "test@example.com",
      sub: "user123",
      isProfileComplete: false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour from now
      jti: "test-jwt-id",
    });

    const url = new URL("http://localhost:3000/dashboard");
    const request = {
      nextUrl: url,
      url: url.toString(),
      method: "GET",
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await middleware(request);

    expect(response?.status).toBe(307);
    expect(response?.headers.get("Location")).toBe(
      "http://localhost:3000/profile/complete",
    );
  });

  it("should allow access to profile/complete even with incomplete profile", async () => {
    // Mock authenticated user with incomplete profile
    (getToken as jest.Mock).mockResolvedValue({
      sub: "user123",
      isProfileComplete: false,
    });

    const url = new URL("http://localhost:3000/profile/complete");
    const request = {
      nextUrl: url,
      url: url.toString(),
      method: "GET",
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await middleware(request);
    expect(response?.status).toBe(200); // NextResponse.next() returns 200
  });

  it("should allow access when profile is complete", async () => {
    // Mock authenticated user with complete profile
    (getToken as jest.Mock).mockResolvedValue({
      sub: "user123",
      isProfileComplete: true,
    });

    const url = new URL("http://localhost:3000/dashboard");
    const request = {
      nextUrl: url,
      url: url.toString(),
      method: "GET",
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await middleware(request);
    expect(response?.status).toBe(200); // NextResponse.next() returns 200
  });

  it("should handle errors by redirecting to login", async () => {
    // Mock getToken to throw an error
    (getToken as jest.Mock).mockRejectedValue(new Error("Test error"));

    const url = new URL("http://localhost:3000/dashboard");
    const request = {
      nextUrl: url,
      url: url.toString(),
      method: "GET",
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await middleware(request);
    expect(response?.status).toBe(307);
    expect(response?.headers.get("Location")).toBe(
      "http://localhost:3000/auth/login",
    );
  });

  describe("Profile Route Handling", () => {
    it("should redirect to profile/complete when accessing profile page with incomplete profile", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const url = new URL("http://localhost:3000/profile");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(307);
      expect(response?.headers.get("Location")).toBe(
        "http://localhost:3000/profile/complete",
      );
    });

    it("should allow access to profile page when profile is complete", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: true,
      });

      const url = new URL("http://localhost:3000/profile");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(200);
    });

    it("should store original path in cookie when redirecting", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const url = new URL("http://localhost:3000/dashboard?tab=settings");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);

      // The mock already appends to headers, so check Set-Cookie header
      expect(response?.headers.get("Set-Cookie")).toContain(
        "redirectAfterProfile=/dashboard?tab=settings",
      );
    });

    it("should redirect to profile/complete for nested profile routes with incomplete profile", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const url = new URL("http://localhost:3000/profile/settings");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(307);
      expect(response?.headers.get("Location")).toBe(
        "http://localhost:3000/profile/complete",
      );
      expect(response?.headers.get("Set-Cookie")).toContain(
        "redirectAfterProfile=/profile/settings",
      );
    });

    it("should allow access to profile/complete even with incomplete profile", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const url = new URL("http://localhost:3000/profile/complete");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(200);
    });

    it("should handle API routes under profile path", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const url = new URL("http://localhost:3000/api/profile/update");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "POST",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(307);
      expect(response?.headers.get("Location")).toBe(
        "http://localhost:3000/profile/complete",
      );
    });
  });
});

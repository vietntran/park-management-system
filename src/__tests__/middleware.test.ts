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

  describe("Profile Completion Requirements", () => {
    const reservationPaths = [
      "/reservations",
      "/api/reservations",
      "/profile/reservations",
    ];

    reservationPaths.forEach((path) => {
      it(`should require profile completion for ${path}`, async () => {
        (getToken as jest.Mock).mockResolvedValue({
          sub: "user123",
          isProfileComplete: false,
        });

        const url = new URL(`http://localhost:3000${path}`);
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
          `redirectAfterProfile=${path}`,
        );
      });

      it(`should allow access to ${path} with completed profile`, async () => {
        (getToken as jest.Mock).mockResolvedValue({
          sub: "user123",
          isProfileComplete: true,
        });

        const url = new URL(`http://localhost:3000${path}`);
        const request = {
          nextUrl: url,
          url: url.toString(),
          method: "GET",
          headers: new Headers(),
        } as unknown as NextRequest;

        const response = await middleware(request);
        expect(response?.status).toBe(200);
      });
    });

    it("should allow access to non-reservation paths without completed profile", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const nonReservationPaths = [
        "/dashboard",
        "/profile",
        "/profile/settings",
      ];

      for (const path of nonReservationPaths) {
        const url = new URL(`http://localhost:3000${path}`);
        const request = {
          nextUrl: url,
          url: url.toString(),
          method: "GET",
          headers: new Headers(),
        } as unknown as NextRequest;

        const response = await middleware(request);
        expect(response?.status).toBe(200);
      }
    });
  });

  describe("Profile Completion Page Access", () => {
    it("should always allow access to profile completion page with incomplete profile", async () => {
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

    it("should always allow access to profile completion API with incomplete profile", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: false,
      });

      const url = new URL("http://localhost:3000/api/auth/profile/complete");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "POST",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(200);
    });

    it("should redirect completed profiles away from profile completion page", async () => {
      (getToken as jest.Mock).mockResolvedValue({
        sub: "user123",
        isProfileComplete: true,
      });

      const url = new URL("http://localhost:3000/profile/complete");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(307);
      expect(response?.headers.get("Location")).toBe(
        "http://localhost:3000/profile",
      );
    });
  });

  describe("Public Routes", () => {
    it("should allow access to public API routes", async () => {
      const url = new URL("http://localhost:3000/api/public/some-endpoint");
      const request = {
        nextUrl: url,
        url: url.toString(),
        method: "GET",
        headers: new Headers(),
      } as unknown as NextRequest;

      const response = await middleware(request);
      expect(response?.status).toBe(200);
    });
  });
});

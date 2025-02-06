/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server";

import { POST } from "@/app/api/reservations/create/route";

// Define our own type for route handlers
type NextRouteHandler = (
  req: NextRequest,
  ...args: unknown[]
) => Promise<Response | NextResponse>;

// Mock the minimum required imports
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

// Type for our NextResponse mock
type MockResponse = {
  status: number;
  json: () => Promise<any>;
};

// Mock NextResponse
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit): MockResponse => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
  // Add NextRequest mock
  NextRequest: Request,
}));

// Mock error handler wrapper
jest.mock("@/lib/api/withErrorHandler", () => {
  const mockNextResponse = {
    json: (body: unknown, init?: ResponseInit): MockResponse => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  };

  return {
    withErrorHandler:
      (handler: NextRouteHandler) =>
      async (...args: [NextRequest, ...unknown[]]) => {
        try {
          return await handler(...args);
        } catch (error) {
          return mockNextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 401 },
          );
        }
      },
  };
});

describe("Create Reservation API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Import and mock in a type-safe way
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue(null);
  });

  it("should return 401 when user is not authenticated", async () => {
    const request = new Request(
      "http://localhost:3000/api/reservations/create",
      {
        method: "POST",
        body: JSON.stringify({
          reservationDate: "2025-02-07",
        }),
      },
    ) as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });
});

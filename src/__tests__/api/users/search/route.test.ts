/**
 * @jest-environment node
 */
import type { User } from "@prisma/client";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/users/search/route";
import { HTTP_STATUS } from "@/constants/http";
import { prisma } from "@/lib/prisma";
import { createMockUser } from "@/test-utils/factories";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

describe("User Search API Route", () => {
  const FIXED_DATE = "2025-02-07T00:00:00.000Z";
  const mockUsers: User[] = [
    createMockUser({
      email: "john.doe@example.com",
      name: "John Doe",
    }),
    createMockUser({
      email: "jane.smith@example.com",
      name: "Jane Smith",
    }),
  ];

  beforeAll(() => {
    // Mock Date.now and new Date()
    const mockDate = new Date(FIXED_DATE);
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset database mocks
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.user.findMany.mockResolvedValue([]);
  });

  describe("Query Validation", () => {
    it("should return 400 when search query is missing", async () => {
      const request = new Request("http://localhost:3000/api/users/search", {
        method: "GET",
      }) as unknown as NextRequest;

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(JSON.parse(body.error)).toEqual([
        {
          code: "invalid_type",
          expected: "string",
          received: "null",
          path: ["q"],
          message: "Expected string, received null",
        },
      ]);
    });
  });

  describe("Email Search", () => {
    it("should find user by exact email match", async () => {
      const targetUser = mockUsers[0];
      (prisma.user.findMany as jest.Mock).mockResolvedValue([targetUser]);

      const request = new Request(
        `http://localhost:3000/api/users/search?q=${targetUser.email}`,
        { method: "GET" },
      ) as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].email).toBe(targetUser.email);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: targetUser.email,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
        take: 10,
      });
    });

    it("should return empty array for non-existent email", async () => {
      const nonExistentEmail = "nonexistent@example.com";
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const request = new Request(
        `http://localhost:3000/api/users/search?q=${nonExistentEmail}`,
        { method: "GET" },
      ) as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(0);
    });
  });

  describe("Name Search", () => {
    it("should find users by partial name match", async () => {
      const targetUser = mockUsers[0];
      (prisma.user.findMany as jest.Mock).mockResolvedValue([targetUser]);

      const request = new Request(
        `http://localhost:3000/api/users/search?q=john`,
        { method: "GET" },
      ) as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe(targetUser.name);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: "john",
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
        take: 10,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      const request = new Request(
        "http://localhost:3000/api/users/search?q=test@example.com",
        { method: "GET" },
      ) as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("should validate response format for successful search", async () => {
      const targetUser = mockUsers[0];
      (prisma.user.findMany as jest.Mock).mockResolvedValue([targetUser]);

      const request = new Request(
        `http://localhost:3000/api/users/search?q=john`,
        { method: "GET" },
      ) as unknown as NextRequest;

      const response = await GET(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
          }),
        ]),
      });
    });
  });
});

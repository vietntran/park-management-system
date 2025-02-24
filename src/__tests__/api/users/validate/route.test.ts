/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { POST } from "@/app/api/users/validate/route";
import { HTTP_STATUS } from "@/constants/http";
import { prisma } from "@/lib/prisma";
import { TEST_UUIDS } from "@/test-utils/constants";
import { createMockUser } from "@/test-utils/factories/userFactory";

// Mock next-auth for session handling
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(async (callback) => callback(prisma)),
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("User Validation API Route", () => {
  const FIXED_DATE = "2025-02-07T00:00:00.000Z";
  const mockSessionUserId = TEST_UUIDS.USERS.PRIMARY;
  const mockSessionEmail = "primary@example.com";

  // Sample valid users for testing
  const mockUsers = {
    validComplete: createMockUser({
      id: TEST_UUIDS.USERS.SECOND,
      email: "valid-complete@example.com",
      isProfileComplete: true,
      emailVerified: new Date(),
    }),
    validComplete2: createMockUser({
      id: TEST_UUIDS.USERS.FIFTH,
      email: "valid-complete2@example.com",
      isProfileComplete: true,
      emailVerified: new Date(),
    }),
    incompleteProfile: createMockUser({
      id: TEST_UUIDS.USERS.THIRD,
      email: "incomplete-profile@example.com",
      isProfileComplete: false,
      emailVerified: new Date(),
    }),
    unverifiedEmail: createMockUser({
      id: TEST_UUIDS.USERS.FOURTH,
      email: "unverified-email@example.com",
      isProfileComplete: true,
      emailVerified: null,
    }),
  };

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

    // Reset session mock
    (
      jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
    ).getServerSession.mockResolvedValue({
      user: {
        id: mockSessionUserId,
        email: mockSessionEmail,
      },
    });

    // Reset database mocks
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };

    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.update.mockImplementation(
      (params: {
        where: { id: string };
        data: { emailVerified?: Date | null };
      }) => {
        return Promise.resolve({
          ...mockUsers.unverifiedEmail,
          ...params.where,
          ...params.data,
        });
      },
    );
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      // Mock unauthenticated session
      (
        jest.requireMock("next-auth/next") as { getServerSession: jest.Mock }
      ).getServerSession.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.SECOND],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);

      const body = await response.json();
      expect(body.error).toBe("Authentication required");
    });
  });

  describe("Input Validation", () => {
    it("should return 400 when userIds array is missing", async () => {
      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({}),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("Required");
    });

    it("should return 400 when userIds is empty", async () => {
      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({ userIds: [] }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("At least one user ID is required");
    });

    it("should return 400 when userIds contains more than 3 IDs", async () => {
      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [
            TEST_UUIDS.USERS.SECOND,
            TEST_UUIDS.USERS.THIRD,
            TEST_UUIDS.USERS.FOURTH,
            TEST_UUIDS.USERS.FIFTH,
          ],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("Maximum of 3 additional users allowed");
    });

    it("should return 400 when userIds contains invalid UUIDs", async () => {
      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: ["not-a-uuid"],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBeTruthy();
    });
  });

  describe("User Existence Validation", () => {
    it("should return 400 when user doesn't exist", async () => {
      // Mock empty result for findMany
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };
      prisma.user.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.SECOND],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBe("Users not found in the system");
    });
  });

  describe("User Validation Rules", () => {
    it("should return 400 when users have incomplete profiles", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      prisma.user.findMany.mockResolvedValue([
        {
          ...mockUsers.incompleteProfile,
          accounts: [],
        },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.THIRD],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("must complete their profiles");
    });

    it("should return 400 when users have unverified emails", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      prisma.user.findMany.mockResolvedValue([
        {
          ...mockUsers.unverifiedEmail,
          accounts: [],
        },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.FOURTH],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("verify their email");
    });
  });

  describe("Mixed Validation Scenarios", () => {
    it("should identify and report both unverified and incomplete users", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      // Mix of valid, unverified and incomplete profile users
      prisma.user.findMany.mockResolvedValue([
        {
          ...mockUsers.validComplete,
          accounts: [],
        },
        {
          ...mockUsers.incompleteProfile,
          accounts: [],
        },
        {
          ...mockUsers.unverifiedEmail,
          accounts: [],
        },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [
            TEST_UUIDS.USERS.SECOND,
            TEST_UUIDS.USERS.THIRD,
            TEST_UUIDS.USERS.FOURTH,
          ],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("incomplete-profile@example.com");
      expect(body.error).toContain("unverified-email@example.com");
    });
  });

  describe("Google OAuth Auto-Verification", () => {
    it("should auto-verify multiple Google OAuth users", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      // Two Google OAuth users with unverified emails
      const googleUser1 = {
        ...mockUsers.unverifiedEmail,
        accounts: [{ provider: "google" }],
      };

      const googleUser2 = {
        ...mockUsers.validComplete2,
        emailVerified: null,
        accounts: [{ provider: "google" }],
      };

      // First findMany returns the unverified users
      prisma.user.findMany.mockResolvedValueOnce([googleUser1, googleUser2]);

      // Second findMany after auto-verification returns the users with verified emails
      prisma.user.findMany.mockResolvedValueOnce([
        { ...googleUser1, emailVerified: new Date() },
        { ...googleUser2, emailVerified: new Date() },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.FOURTH, TEST_UUIDS.USERS.FIFTH],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);

      // Verify auto-verification happened for both users
      expect(prisma.user.update).toHaveBeenCalledTimes(2);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUIDS.USERS.FOURTH },
        data: { emailVerified: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUIDS.USERS.FIFTH },
        data: { emailVerified: expect.any(Date) },
      });
    });

    it("should auto-verify Google OAuth users", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      // User with Google account but unverified email
      const googleUser = {
        ...mockUsers.unverifiedEmail,
        accounts: [{ provider: "google" }],
      };

      // First findMany returns the user with unverified email
      prisma.user.findMany.mockResolvedValueOnce([googleUser]);

      // Second findMany after auto-verification returns the user with verified email
      prisma.user.findMany.mockResolvedValueOnce([
        {
          ...googleUser,
          emailVerified: new Date(),
        },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.FOURTH],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);

      // Verify auto-verification happened
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: TEST_UUIDS.USERS.FOURTH },
        data: { emailVerified: expect.any(Date) },
      });
    });
  });

  describe("Successful Validation", () => {
    it("should validate users with complete profiles and verified emails", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      prisma.user.findMany.mockResolvedValue([
        {
          ...mockUsers.validComplete,
          accounts: [],
        },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [TEST_UUIDS.USERS.SECOND],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
    });

    it("should validate multiple users with complete profiles and verified emails", async () => {
      // @ts-expect-error - Ignore circular reference initialization
      const { prisma } = jest.requireMock("@/lib/prisma") as {
        // @ts-expect-error - Ignore prisma self-referential type
        prisma: jest.Mocked<typeof prisma>;
      };

      prisma.user.findMany.mockResolvedValue([
        {
          ...mockUsers.validComplete,
          accounts: [],
        },
        {
          ...mockUsers.validComplete2,
          accounts: [],
        },
        {
          ...createMockUser({
            id: TEST_UUIDS.USERS.THIRD,
            isProfileComplete: true,
            emailVerified: new Date(),
          }),
          accounts: [],
        },
      ]);

      const request = new Request("http://localhost:3000/api/users/validate", {
        method: "POST",
        body: JSON.stringify({
          userIds: [
            TEST_UUIDS.USERS.SECOND,
            TEST_UUIDS.USERS.THIRD,
            TEST_UUIDS.USERS.FIFTH,
          ],
        }),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.valid).toBe(true);
    });
  });
});

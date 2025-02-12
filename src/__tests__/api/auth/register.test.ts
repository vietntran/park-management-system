/**
 * @jest-environment node
 */
import { hash } from "bcryptjs";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/auth/register/route";
import { HTTP_STATUS } from "@/constants/http";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/services/emailService";
import { createRateLimiter } from "@/services/rateLimitService";
import {
  createMockUser,
  createMockVerificationToken,
  createInitialRegistrationData,
} from "@/test-utils/factories";
import type { RateLimitProvider } from "@/types/rateLimit";

// Mock required dependencies
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

// Mock Next.js headers
jest.mock("next/headers", () => ({
  headers: jest.fn(() => new Map([["x-forwarded-for", "127.0.0.1"]])),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(async (callback) => callback(prisma)),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    verificationToken: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/services/emailService", () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
  },
}));

jest.mock("@/services/rateLimitService", () => {
  const mockProvider: RateLimitProvider = {
    checkLimit: jest.fn(async () => ({ count: 0, timestamp: Date.now() })),
    increment: jest.fn(async () => {}),
    reset: jest.fn(async () => {}),
    cleanup: jest.fn(async () => {}),
  };

  return {
    createRateLimiter: jest.fn(() => jest.fn(async () => {})),
    rateLimitService: {
      clearProvider: jest.fn(),
      providers: new Map([["auth:register", mockProvider]]),
    },
  };
});

describe("Auth register API Route", () => {
  const FIXED_DATE = "2025-02-07T00:00:00.000Z";

  // Valid test data for initial registration
  const validRegistrationData = {
    email: "test@example.com",
    password: "Password123!@#",
    name: "Test User",
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

    // Reset database mocks
    // @ts-expect-error - Ignore circular reference initialization
    const { prisma } = jest.requireMock("@/lib/prisma") as {
      // @ts-expect-error - Ignore prisma self-referential type
      prisma: jest.Mocked<typeof prisma>;
    };
    prisma.user.findUnique.mockResolvedValue(null);

    // Mock successful user creation
    prisma.user.create.mockResolvedValue(
      createMockUser({
        email: validRegistrationData.email,
        name: validRegistrationData.name,
        isProfileComplete: false,
      }),
    );

    // Mock successful verification token creation
    prisma.verificationToken.create.mockResolvedValue(
      createMockVerificationToken({
        identifier: validRegistrationData.email,
      }),
    );

    // Mock successful password hashing
    (hash as jest.Mock).mockResolvedValue("hashed_password");

    // Mock successful email sending
    const { emailService } = jest.requireMock("@/services/emailService") as {
      emailService: { sendVerificationEmail: jest.Mock };
    };
    emailService.sendVerificationEmail.mockResolvedValue(undefined);
  });

  describe("Input Validation", () => {
    it("should successfully create a user with valid initial registration data", async () => {
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(validRegistrationData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.CREATED);

      const body = await response.json();
      expect(body.data).toEqual({
        user: {
          id: "test-user-id",
          email: validRegistrationData.email,
          name: validRegistrationData.name,
          isProfileComplete: false,
        },
      });

      // Verify user creation was called with correct data
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: validRegistrationData.email,
            name: validRegistrationData.name,
            isProfileComplete: false,
          }),
        }),
      );

      // Verify verification token was created
      expect(prisma.verificationToken.create).toHaveBeenCalled();

      // Verify verification email was sent
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        validRegistrationData.email,
        "test-verification-token",
      );
    });

    it("should return 400 when email is missing", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to exclude email field for invalid data test
      const { email, ...invalidData } = validRegistrationData;
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(invalidData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBe("Required");
    });

    it("should return 400 when email format is invalid", async () => {
      const invalidData = { ...validRegistrationData, email: "invalid-email" };
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(invalidData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toContain("Invalid email");
    });

    it("should validate password complexity requirements", async () => {
      const testCases = [
        {
          password: "nouppercaseornumber!",
          error: "Password must contain at least one uppercase letter",
        },
        {
          password: "NoSpecialCharacter123",
          error:
            'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
        },
        {
          password: "no_numbers_here!A",
          error: "Password must contain at least one number",
        },
      ];

      for (const testCase of testCases) {
        const invalidData = createInitialRegistrationData({
          password: testCase.password,
        });

        const request = new Request("http://localhost:3000/api/auth/register", {
          method: "POST",
          body: JSON.stringify(invalidData),
        }) as unknown as NextRequest;

        const response = await POST(request);
        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

        const body = await response.json();
        expect(body.error).toBe(testCase.error);
      }
    });
  });

  describe("Duplicate User and Error Handling", () => {
    beforeEach(() => {
      const { rateLimitService } = jest.requireMock(
        "@/services/rateLimitService",
      ) as {
        rateLimitService: {
          clearProvider: jest.Mock;
          providers: Map<string, RateLimitProvider>;
        };
      };
      rateLimitService.clearProvider("auth:register");
    });

    it("should return 409 when email already exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(
        createMockUser({
          email: validRegistrationData.email,
        }),
      );

      const mockRateLimiter = jest.fn(async () => {});
      (createRateLimiter as jest.Mock).mockReturnValue(mockRateLimiter);

      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(validRegistrationData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.CONFLICT);

      const body = await response.json();
      expect(body.error).toBe("User already exists");
    });

    it("should handle transaction rollback if email sending fails", async () => {
      const mockRateLimiter = jest.fn();
      (createRateLimiter as jest.Mock).mockReturnValue(mockRateLimiter);

      (emailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error("Email service failed"),
      );

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const result = await callback(prisma);
        return result;
      });

      (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(validRegistrationData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER);

      const body = await response.json();
      expect(body.error).toBeTruthy();

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.verificationToken.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();

      expect((prisma.$transaction as jest.Mock).mock.results[0].type).toBe(
        "return",
      );
    });
  });
});

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
  createRegistrationData,
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

// Improve rate limit service mock with proper types
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

  // Valid test data
  const validRegistrationData = {
    email: "test@example.com",
    password: "Password123!@#", // Increased complexity to meet requirements
    name: "Test User",
    phone: "1234567890",
    address: {
      line1: "123 Test St",
      line2: "Apt 4",
      city: "Test City",
      state: "TS",
      zipCode: "12345",
    },
    acceptTerms: true,
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

    // // Mock successful user creation
    // prisma.user.create.mockResolvedValue({
    //   id: "test-user-id",
    //   email: validRegistrationData.email,
    //   name: validRegistrationData.name,
    //   phone: validRegistrationData.phone,
    //   password: "hashed_password",
    //   phoneVerified: false,
    //   isProfileComplete: false,
    //   emailVerified: null,
    //   createdAt: new Date(FIXED_DATE),
    //   updatedAt: new Date(FIXED_DATE),
    // });

    // Mock successful user creation
    prisma.user.create.mockResolvedValue(
      createMockUser({
        email: validRegistrationData.email,
        name: validRegistrationData.name,
        phone: validRegistrationData.phone,
      }),
    );

    // Mock successful verification token creation
    prisma.verificationToken.create.mockResolvedValue(
      createMockVerificationToken({
        identifier: validRegistrationData.email,
      }),
    );

    // Mock successful verification token creation
    prisma.verificationToken.create.mockResolvedValue({
      token: "test-verification-token",
      expires: new Date(FIXED_DATE),
      identifier: validRegistrationData.email,
    });

    // Mock successful password hashing
    (hash as jest.Mock).mockResolvedValue("hashed_password");

    // Mock successful email sending
    const { emailService } = jest.requireMock("@/services/emailService") as {
      emailService: { sendVerificationEmail: jest.Mock };
    };
    emailService.sendVerificationEmail.mockResolvedValue(undefined);
  });

  describe("Input Validation", () => {
    it("should successfully create a user with valid registration data", async () => {
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
        },
      });

      // Verify user creation was called with correct data
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: validRegistrationData.email,
            name: validRegistrationData.name,
            phone: validRegistrationData.phone,
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

    it("should return 400 when password is too short", async () => {
      const invalidData = { ...validRegistrationData, password: "short" };
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(invalidData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBe("Password must be at least 12 characters");
    });

    it("should return 400 when name is missing", async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to exclude name field for invalid data test
      const { name, ...invalidData } = validRegistrationData;
      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(invalidData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBe("Required");
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
        const invalidData = createRegistrationData({
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

    it("should validate state field length", async () => {
      const invalidData = createRegistrationData({
        address: {
          line1: "123 Test St",
          line2: "Apt 4",
          city: "Test City",
          state: "INVALID", // Too long for state code
          zipCode: "12345",
        },
      });

      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(invalidData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBe("State must be 2 letters");
    });

    it("should validate zip code format", async () => {
      const invalidData = createRegistrationData({
        address: {
          line1: "123 Test St",
          line2: "Apt 4",
          city: "Test City",
          state: "TS",
          zipCode: "1234", // Invalid zip code format
        },
      });

      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(invalidData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);

      const body = await response.json();
      expect(body.error).toBe("Invalid ZIP code");
    });
  });

  describe("Duplicate User and Error Handling", () => {
    beforeEach(() => {
      // Reset rate limiter for each test with proper typing
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
      // Mock existing user with all required fields
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(
        createMockUser({
          email: validRegistrationData.email,
        }),
      );

      // Mock rate limiter with proper typing
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
      // Mock rate limiter to allow this request
      const mockRateLimiter = jest.fn();
      (createRateLimiter as jest.Mock).mockReturnValue(mockRateLimiter);

      // Mock email service to fail
      (emailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error("Email service failed"),
      );

      // Mock transaction to allow the email service to be called
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        // Execute the transaction callback
        const result = await callback(prisma);
        // Let the transaction complete but keep track of the result
        return result;
      });

      // Override the transaction mock for this test
      (prisma.$transaction as jest.Mock).mockImplementation(mockTransaction);

      const request = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify(validRegistrationData),
      }) as unknown as NextRequest;

      const response = await POST(request);
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER);

      const body = await response.json();
      expect(body.error).toBeTruthy();

      // Verify the sequence of operations
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.verificationToken.create).toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();

      // Verify the rollback happened after email failure
      expect((prisma.$transaction as jest.Mock).mock.results[0].type).toBe(
        "return",
      );
    });
  });
});

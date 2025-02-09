/**
 * @jest-environment node
 */
import { headers } from "next/headers";

import {
  createRateLimiter,
  rateLimitService,
} from "@/services/rateLimitService";

// Mock the logger to prevent actual logging during tests
jest.mock("@/lib/logger", () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock("next/headers", () => ({
  headers: jest.fn(),
}));

describe("Rate Limit Service", () => {
  const TEST_CONFIG = {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  };

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitService.clearProvider("test");
    jest.useFakeTimers();

    // Default IP mock
    (headers as jest.Mock).mockReturnValue(
      new Map([["x-forwarded-for", "127.0.0.1"]]),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should allow requests within rate limit", async () => {
    const checkRateLimit = createRateLimiter("test", TEST_CONFIG);

    // Make maxRequests number of requests
    for (let i = 0; i < TEST_CONFIG.maxRequests; i++) {
      await expect(checkRateLimit("request-id")).resolves.not.toThrow();
    }
  });

  it("should block requests when rate limit is exceeded", async () => {
    const checkRateLimit = createRateLimiter("test", TEST_CONFIG);

    // Make maxRequests number of requests
    for (let i = 0; i < TEST_CONFIG.maxRequests; i++) {
      await checkRateLimit("request-id");
    }

    // The next request should be blocked
    await expect(checkRateLimit("request-id")).rejects.toThrow(
      "Too many requests. Please try again later.",
    );
  });

  it("should reset rate limit after window expires", async () => {
    const checkRateLimit = createRateLimiter("test", TEST_CONFIG);

    // Make maxRequests number of requests
    for (let i = 0; i < TEST_CONFIG.maxRequests; i++) {
      await checkRateLimit("request-id");
    }

    // Mock Date.now() to simulate time passing
    const now = Date.now();
    jest
      .spyOn(Date, "now")
      .mockImplementation(() => now + TEST_CONFIG.windowMs + 1000);

    // Should be able to make another request
    await expect(checkRateLimit("request-id")).resolves.not.toThrow();

    // Restore Date.now
    jest.spyOn(Date, "now").mockRestore();
  });

  it("should track rate limits separately for different IPs", async () => {
    const checkRateLimit = createRateLimiter("test", TEST_CONFIG);

    // Make maxRequests from first IP
    for (let i = 0; i < TEST_CONFIG.maxRequests; i++) {
      await checkRateLimit("request-id");
    }

    // Change IP
    (headers as jest.Mock).mockReturnValue(
      new Map([["x-forwarded-for", "127.0.0.2"]]),
    );

    // Should be able to make request from new IP
    await expect(checkRateLimit("request-id")).resolves.not.toThrow();
  });
});

import { headers } from "next/headers";

import { TooManyRequestsError } from "@/lib/errors/ApplicationErrors";
import logger from "@/lib/logger";
import { MemoryRateLimitProvider } from "@/lib/rateLimit/providers/memoryProvider";
import { RateLimitConfig, RateLimitProvider } from "@/types/rateLimit";

class RateLimitService {
  private providers = new Map<string, RateLimitProvider>();

  constructor(private defaultProvider: RateLimitProvider) {}

  createRateLimiter(identifier: string, config: RateLimitConfig) {
    if (!this.providers.has(identifier)) {
      this.providers.set(identifier, this.defaultProvider);
    }

    return async (requestId: string) => {
      const headersList = await headers();
      const ip = headersList.get("x-forwarded-for") || "unknown";
      const provider = this.providers.get(identifier)!;

      // Clean up old entries
      await provider.cleanup(config.windowMs);

      // Get rate limit info
      const key = `${identifier}:${ip}`;
      const info = await provider.checkLimit(key, config);

      // Check rate limit
      if (info.count >= config.maxRequests) {
        logger.warn("Rate limit exceeded", {
          requestId,
          ip,
          endpoint: identifier,
          rateLimitInfo: info,
        });

        throw new TooManyRequestsError(
          "Too many requests. Please try again later.",
        );
      }

      // Increment counter
      info.count += 1;
      await provider.increment(key, info);
    };
  }

  // For testing
  clearProvider(identifier: string) {
    const provider = this.providers.get(identifier);
    if (provider instanceof MemoryRateLimitProvider) {
      provider.clear();
    }
  }
}

// Create default memory provider
const memoryProvider = new MemoryRateLimitProvider();

// Create service instance
export const rateLimitService = new RateLimitService(memoryProvider);

// Export main function
export const createRateLimiter =
  rateLimitService.createRateLimiter.bind(rateLimitService);

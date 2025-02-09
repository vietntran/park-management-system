import {
  RateLimitProvider,
  RateLimitInfo,
  RateLimitConfig,
} from "@/types/rateLimit";

export class MemoryRateLimitProvider implements RateLimitProvider {
  private storage = new Map<string, RateLimitInfo>();

  async checkLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const info = this.storage.get(key) || { count: 0, timestamp: now };

    // Reset if window expired
    if (info.timestamp < windowStart) {
      info.count = 0;
      info.timestamp = now;
    }

    return info;
  }

  async increment(key: string, info: RateLimitInfo): Promise<void> {
    this.storage.set(key, info);
  }

  async reset(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async cleanup(windowMs: number): Promise<void> {
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [key, value] of this.storage.entries()) {
      if (value.timestamp < windowStart) {
        this.storage.delete(key);
      }
    }
  }

  // For testing
  clear(): void {
    this.storage.clear();
  }
}

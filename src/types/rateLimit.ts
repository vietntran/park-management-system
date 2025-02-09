export interface RateLimitConfig {
  maxRequests: number; // Maximum number of requests allowed in the window
  windowMs: number; // Time window in milliseconds
}

export interface RateLimitInfo {
  count: number; // Current count of requests
  timestamp: number; // Timestamp of the window start
}

export interface RateLimitProvider {
  /**
   * Check the current rate limit status for a key
   * @param key Unique identifier for the rate limit (e.g., "auth:register:127.0.0.1")
   * @param config Rate limit configuration
   * @returns Current rate limit information
   */
  checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitInfo>;

  /**
   * Increment the counter for a key
   * @param key Unique identifier for the rate limit
   * @param info Updated rate limit information
   */
  increment(key: string, info: RateLimitInfo): Promise<void>;

  /**
   * Reset the rate limit for a key
   * @param key Unique identifier for the rate limit
   */
  reset(key: string): Promise<void>;

  /**
   * Clean up expired rate limit entries
   * @param windowMs Time window in milliseconds
   */
  cleanup(windowMs: number): Promise<void>;
}

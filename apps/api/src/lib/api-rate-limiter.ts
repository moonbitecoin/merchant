/**
 * API Rate Limiter
 * Tracks API key usage and enforces rate limits
 * Default: 100 requests per minute per API key
 */

interface RateLimitConfig {
  maxRequests: number; // 100 per minute
  windowMs: number; // 60000ms
}

interface RateLimitState {
  count: number;
  resetAt: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Check if API key is within rate limit
 */
export function isWithinRateLimit(
  apiKey: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const state = rateLimitStore.get(apiKey);

  // No state or window expired
  if (!state || now > state.resetAt) {
    rateLimitStore.set(apiKey, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Within window
  if (state.count < config.maxRequests) {
    state.count++;

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - state.count,
      resetAt: state.resetAt,
    };
  }

  // Limit exceeded
  return {
    allowed: false,
    limit: config.maxRequests,
    remaining: 0,
    resetAt: state.resetAt,
  };
}

/**
 * Reset rate limit for API key (for testing)
 */
export function resetRateLimit(apiKey: string): void {
  rateLimitStore.delete(apiKey);
}

/**
 * Get rate limit status for API key
 */
export function getRateLimitStatus(
  apiKey: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): {
  limit: number;
  remaining: number;
  resetAt: number;
  resetIn: number; // seconds
} {
  const now = Date.now();
  const state = rateLimitStore.get(apiKey);

  if (!state || now > state.resetAt) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  }

  return {
    limit: config.maxRequests,
    remaining: config.maxRequests - state.count,
    resetAt: state.resetAt,
    resetIn: Math.ceil((state.resetAt - now) / 1000),
  };
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanupExpiredLimits(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [key, state] of rateLimitStore.entries()) {
    if (now > state.resetAt + 60000) {
      // Delete entries older than 1 minute after reset
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => rateLimitStore.delete(key));
}

/**
 * Rate limiting utility for Edge Functions
 * This code should be included in edge functions that need rate limiting
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  blockDurationMs: 300000, // 5 minutes
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check rate limit for a given identifier (user ID or IP)
 * Must be called from an edge function with service_role access
 */
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<RateLimitResult> {
  const cfg = { ...DEFAULT_RATE_LIMIT_CONFIG, ...config };
  const now = Date.now();
  const windowStart = now - cfg.windowMs;
  const key = `ratelimit:${identifier}`;

  try {
    // Get existing rate limit record
    const { data: existing } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', key)
      .single();

    if (existing) {
      // Check if blocked
      if (existing.blocked_until && new Date(existing.blocked_until) > new Date()) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(existing.blocked_until),
        };
      }

      // Check if within rate limit
      const requestsInWindow = existing.requests.filter(
        (timestamp: number) => timestamp > windowStart
      );

      if (requestsInWindow.length >= cfg.maxRequests) {
        // Block user
        const blockedUntil = new Date(now + (cfg.blockDurationMs || 0));
        await supabase
          .from('rate_limits')
          .update({
            blocked_until: blockedUntil.toISOString(),
            requests: [],
          })
          .eq('key', key);

        return {
          allowed: false,
          remaining: 0,
          resetAt: blockedUntil,
        };
      }

      // Add current request
      const updatedRequests = [...requestsInWindow, now];
      await supabase
        .from('rate_limits')
        .update({
          requests: updatedRequests,
          last_request: new Date().toISOString(),
        })
        .eq('key', key);

      return {
        allowed: true,
        remaining: cfg.maxRequests - updatedRequests.length,
        resetAt: new Date(now + cfg.windowMs),
      };
    } else {
      // Create new rate limit record
      await supabase.from('rate_limits').insert({
        key,
        requests: [now],
        last_request: new Date().toISOString(),
      });

      return {
        allowed: true,
        remaining: cfg.maxRequests - 1,
        resetAt: new Date(now + cfg.windowMs),
      };
    }
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      remaining: cfg.maxRequests,
      resetAt: new Date(now + cfg.windowMs),
    };
  }
}

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig
): HeadersInit {
  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}

// Rate limiting middleware for API security
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  blockDurationMs: 300000, // 5 minutes
};

/**
 * Rate limiter using Supabase as storage backend
 */
export async function rateLimit(
  supabase: any,
  identifier: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
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
 * Middleware wrapper for edge functions
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  config?: Partial<RateLimitConfig>
) {
  return async (req: Request): Promise<Response> => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get identifier (IP or user ID)
    const authHeader = req.headers.get('Authorization');
    let identifier = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) identifier = user.id;
      } catch {
        // Use IP as fallback
      }
    }

    // Check rate limit
    const rateLimitResult = await rateLimit(supabase, identifier, config);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: rateLimitResult.resetAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(config?.maxRequests || DEFAULT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    // Add rate limit headers
    const response = await handler(req);
    response.headers.set('X-RateLimit-Limit', String(config?.maxRequests || DEFAULT_CONFIG.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

    return response;
  };
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting config
const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  blockDurationMs: 300000, // 5 minutes
};

async function checkRateLimit(supabase: any, identifier: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_CONFIG.windowMs;
  const key = `ratelimit:mutation:${identifier}`;

  const { data: existing } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  if (existing) {
    if (existing.blocked_until && new Date(existing.blocked_until) > new Date()) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(existing.blocked_until),
      };
    }

    const requestsInWindow = existing.requests.filter(
      (timestamp: number) => timestamp > windowStart
    );

    if (requestsInWindow.length >= RATE_LIMIT_CONFIG.maxRequests) {
      const blockedUntil = new Date(now + RATE_LIMIT_CONFIG.blockDurationMs);
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
      remaining: RATE_LIMIT_CONFIG.maxRequests - updatedRequests.length,
      resetAt: new Date(now + RATE_LIMIT_CONFIG.windowMs),
    };
  } else {
    await supabase.from('rate_limits').insert({
      key,
      requests: [now],
      last_request: new Date().toISOString(),
    });

    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetAt: new Date(now + RATE_LIMIT_CONFIG.windowMs),
    };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get identifier (IP or user ID)
    const authHeader = req.headers.get('Authorization');
    let identifier = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) identifier = user.id;
      } catch {
        // Use IP as fallback
      }
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(supabaseClient, identifier);

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          resetAt: rateLimitResult.resetAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    // Continue with validation logic (from previous validate-mutation function)
    const { entity, data, operation } = await req.json();

    // Validation logic here...
    const validationResult = { valid: true, errors: [] };

    return new Response(
      JSON.stringify(validationResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
        } 
      }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

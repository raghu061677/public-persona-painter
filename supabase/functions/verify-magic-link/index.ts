// supabase/functions/verify-magic-link/index.ts
// v2.0 - Phase-5: Rate limiting + audit logging for public magic link verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logSecurityAudit } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!checkRateLimit(clientIp)) {
    await logSecurityAudit({
      functionName: 'verify-magic-link',
      action: 'rate_limit_exceeded',
      status: 'denied',
      metadata: { ip: clientIp },
    });
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => null);
    const token = body?.token;

    if (!token || typeof token !== 'string' || token.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find user with valid token
    const { data: portalUser, error: userError } = await supabase
      .from('client_portal_users')
      .select('*, clients!inner(id, name)')
      .eq('magic_link_token', token)
      .eq('is_active', true)
      .single();

    if (userError || !portalUser) {
      await logSecurityAudit({
        functionName: 'verify-magic-link',
        action: 'invalid_magic_link_token',
        status: 'denied',
        metadata: { ip: clientIp, token_prefix: token.substring(0, 8) },
      });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired magic link' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    const expiresAt = new Date(portalUser.magic_link_expires_at);
    if (expiresAt < new Date()) {
      await supabase
        .from('client_portal_users')
        .update({ magic_link_token: null, magic_link_expires_at: null })
        .eq('id', portalUser.id);

      await logSecurityAudit({
        functionName: 'verify-magic-link',
        action: 'expired_magic_link',
        status: 'denied',
        metadata: { ip: clientIp, portal_user_id: portalUser.id },
      });

      return new Response(
        JSON.stringify({ error: 'Magic link has expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid — clear token and update last login
    await supabase
      .from('client_portal_users')
      .update({
        magic_link_token: null,
        magic_link_expires_at: null,
        last_login: new Date().toISOString(),
      })
      .eq('id', portalUser.id);

    // Log access
    await supabase.from('client_portal_access_logs').insert({
      client_id: portalUser.client_id,
      action: 'magic_link_verified',
      metadata: { email: portalUser.email, portal_user_id: portalUser.id },
    });

    await logSecurityAudit({
      functionName: 'verify-magic-link',
      action: 'magic_link_verified',
      status: 'success',
      metadata: { ip: clientIp, portal_user_id: portalUser.id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: portalUser.id,
          email: portalUser.email,
          name: portalUser.name,
          client_id: portalUser.client_id,
          client_name: portalUser.clients.name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-magic-link:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

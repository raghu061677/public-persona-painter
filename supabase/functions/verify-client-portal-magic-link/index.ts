// supabase/functions/verify-client-portal-magic-link/index.ts
// v2.0 - Phase-5: Rate limiting + audit logging

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
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
    return new Response('ok', { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!checkRateLimit(clientIp)) {
    await logSecurityAudit({
      functionName: 'verify-client-portal-magic-link',
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
    const supabaseClient = createClient(
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

    // Find user with valid magic link token
    const { data: portalUser, error: userError } = await supabaseClient
      .from('client_portal_users')
      .select('*')
      .eq('magic_link_token', token)
      .gt('magic_link_expires_at', new Date().toISOString())
      .eq('is_active', true)
      .single();

    if (userError || !portalUser) {
      await logSecurityAudit({
        functionName: 'verify-client-portal-magic-link',
        action: 'invalid_token',
        status: 'denied',
        metadata: { ip: clientIp, token_prefix: token.substring(0, 8) },
      });
      return new Response(
        JSON.stringify({ error: 'Invalid or expired magic link' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or get auth user
    let authUserId = portalUser.auth_user_id;

    if (!authUserId) {
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email: portalUser.email,
        email_confirm: true,
        user_metadata: {
          is_client_portal_user: true,
          client_id: portalUser.client_id,
          portal_user_id: portalUser.id,
        },
      });

      if (authError) throw authError;
      authUserId = authData.user.id;

      await supabaseClient
        .from('client_portal_users')
        .update({ auth_user_id: authUserId })
        .eq('id', portalUser.id);
    }

    // Generate session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: portalUser.email,
      options: {
        redirectTo: `${Deno.env.get('SITE_URL')}/portal/dashboard`,
      },
    });

    if (sessionError) throw sessionError;

    // Clear magic token + update last login
    await supabaseClient
      .from('client_portal_users')
      .update({
        last_login: new Date().toISOString(),
        magic_link_token: null,
        magic_link_expires_at: null,
      })
      .eq('id', portalUser.id);

    await logSecurityAudit({
      functionName: 'verify-client-portal-magic-link',
      action: 'portal_magic_link_verified',
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
        },
        session: sessionData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

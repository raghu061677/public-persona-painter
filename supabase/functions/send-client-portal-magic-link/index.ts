// supabase/functions/send-client-portal-magic-link/index.ts
// v2.0 - Phase-5: Rate limiting + audit logging

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { logSecurityAudit } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 3 requests per minute per IP (magic link send is expensive)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

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
      functionName: 'send-client-portal-magic-link',
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
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Request body is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, client_id, company_name } = body;

    // Validate inputs
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client_id || typeof client_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate magic link token
    const magicToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Update or insert client portal user
    const { data: existingUser } = await supabaseClient
      .from('client_portal_users')
      .select('id')
      .eq('email', email)
      .eq('client_id', client_id)
      .single();

    if (existingUser) {
      await supabaseClient
        .from('client_portal_users')
        .update({
          magic_link_token: magicToken,
          magic_link_expires_at: expiresAt.toISOString(),
        })
        .eq('id', existingUser.id);
    } else {
      await supabaseClient
        .from('client_portal_users')
        .insert({
          email,
          client_id,
          magic_link_token: magicToken,
          magic_link_expires_at: expiresAt.toISOString(),
          invited_by: req.headers.get('user-id'),
        });
    }

    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173';
    const magicLink = `${baseUrl}/portal/auth?token=${magicToken}`;

    // TODO: Send email with magic link using Resend
    console.log('Magic link generated for:', email);

    await logSecurityAudit({
      functionName: 'send-client-portal-magic-link',
      action: 'magic_link_generated',
      status: 'success',
      metadata: { ip: clientIp, email, client_id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Magic link sent successfully',
        magicLink, // Remove this in production
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

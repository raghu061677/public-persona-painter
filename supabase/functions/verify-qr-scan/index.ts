// supabase/functions/verify-qr-scan/index.ts
// v2.0 - Phase-5: Rate limiting + audit logging

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logSecurityAudit } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

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
      functionName: 'verify-qr-scan',
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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      await logSecurityAudit({
        functionName: 'verify-qr-scan',
        action: 'unauthorized_qr_scan',
        status: 'denied',
        metadata: { ip: clientIp },
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: 'Request body is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation_id, asset_id, latitude, longitude } = body;

    if (!operation_id || typeof operation_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'operation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch operation
    const { data: operation, error: opError } = await supabase
      .from('operations')
      .select('*, campaigns!inner(company_id, campaign_name)')
      .eq('id', operation_id)
      .single();

    if (opError || !operation) {
      return new Response(
        JSON.stringify({ error: 'Operation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user access (company membership)
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', operation.campaigns.company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      await logSecurityAudit({
        functionName: 'verify-qr-scan',
        action: 'cross_company_qr_scan',
        userId: user.id,
        status: 'denied',
        metadata: { ip: clientIp, operation_id },
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update operation with QR verification
    await supabase
      .from('operations')
      .update({
        qr_verified: true,
        qr_verified_at: new Date().toISOString(),
        qr_location_lat: latitude ?? null,
        qr_location_lng: longitude ?? null,
        status: 'In Progress',
      })
      .eq('id', operation_id);

    // Log timeline event
    await supabase.functions.invoke('add-timeline-event', {
      body: {
        campaign_id: operation.campaign_id,
        company_id: operation.campaigns.company_id,
        event_type: 'qr_verified',
        event_title: 'QR Code Verified',
        event_description: `Mounter verified location via QR scan`,
        created_by: user.id,
        metadata: { operation_id, asset_id, latitude, longitude },
      },
    });

    await logSecurityAudit({
      functionName: 'verify-qr-scan',
      userId: user.id,
      companyId: companyUser.company_id,
      action: 'qr_scan_verified',
      recordIds: [operation_id],
      status: 'success',
      metadata: { ip: clientIp, asset_id },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'QR verification successful', operation_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying QR scan:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to verify QR scan' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

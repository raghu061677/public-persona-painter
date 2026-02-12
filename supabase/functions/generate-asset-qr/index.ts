// supabase/functions/generate-asset-qr/index.ts
// v2.0 - Phase-5: Rate limiting + audit logging for public QR generator

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import { corsHeaders } from "../_shared/cors.ts";
import { logSecurityAudit } from '../_shared/auth.ts';

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!checkRateLimit(clientIp)) {
    await logSecurityAudit({
      functionName: 'generate-asset-qr',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json().catch(() => null);
    const asset_id = body?.asset_id;
    
    if (!asset_id || typeof asset_id !== 'string' || asset_id.length > 100) {
      return new Response(
        JSON.stringify({ error: 'asset_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating QR code for asset: ${asset_id}`);

    // Verify asset exists
    const { data: asset, error: fetchError } = await supabase
      .from('media_assets')
      .select('id, latitude, longitude')
      .eq('id', asset_id)
      .single();

    if (fetchError || !asset) {
      return new Response(
        JSON.stringify({ error: `Asset not found` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine target URL
    let targetUrl: string;
    if (asset.latitude && asset.longitude) {
      targetUrl = `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`;
    } else {
      targetUrl = `https://go-ads.lovable.app/asset/${asset_id}`;
    }

    // Generate QR code as SVG
    const qrSvg = await new Promise<string>((resolve, reject) => {
      QRCode.toString(targetUrl, {
        errorCorrectionLevel: 'M',
        type: 'svg',
        margin: 2,
        width: 512,
      }, (err: Error | null | undefined, svg: string) => {
        if (err) reject(err);
        else resolve(svg);
      });
    });

    const qrData = new TextEncoder().encode(qrSvg);

    // Upload to storage
    const filePath = `${asset_id}.svg`;
    const { error: uploadError } = await supabase.storage
      .from('asset-qrcodes')
      .upload(filePath, qrData, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('asset-qrcodes')
      .getPublicUrl(filePath);

    // Update database
    const { error: updateError } = await supabase
      .from('media_assets')
      .update({ qr_code_url: publicUrl })
      .eq('id', asset_id);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, asset_id, qr_code_url: publicUrl, target_url: targetUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

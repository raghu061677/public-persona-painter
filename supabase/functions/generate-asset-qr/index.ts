import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { asset_id } = await req.json();
    
    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: 'asset_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating QR code for asset: ${asset_id}`);

    // 1. Verify asset exists
    const { data: asset, error: fetchError } = await supabase
      .from('media_assets')
      .select('id, latitude, longitude, google_street_view_url, location_url')
      .eq('id', asset_id)
      .single();

    if (fetchError || !asset) {
      throw new Error(`Asset not found: ${fetchError?.message}`);
    }

    // 2. Determine target URL
    let targetUrl: string;
    if (asset.google_street_view_url) {
      targetUrl = asset.google_street_view_url;
    } else if (asset.location_url) {
      targetUrl = asset.location_url;
    } else if (asset.latitude && asset.longitude) {
      targetUrl = `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`;
    } else {
      // Fallback to asset detail page
      targetUrl = `https://go-ads-ldbl1.web.app/asset/${asset_id}`;
    }

    // 3. Generate QR code as SVG string (works in Deno without canvas)
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

    // 4. Convert SVG string to Uint8Array
    const qrData = new TextEncoder().encode(qrSvg);

    // 5. Upload to storage
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

    // 6. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('asset-qrcodes')
      .getPublicUrl(filePath);

    // 7. Update database
    const { error: updateError } = await supabase
      .from('media_assets')
      .update({ qr_code_url: publicUrl })
      .eq('id', asset_id);

    if (updateError) {
      throw new Error(`DB update failed: ${updateError.message}`);
    }

    console.log(`✓ Generated QR for asset: ${asset_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        asset_id,
        qr_code_url: publicUrl,
        target_url: targetUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

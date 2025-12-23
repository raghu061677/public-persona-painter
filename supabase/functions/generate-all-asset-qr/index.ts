import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
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

    console.log('Starting bulk QR code generation...');

    // Fetch all assets without QR codes
    const { data: assets, error: fetchError } = await supabase
      .from('media_assets')
      .select('id, latitude, longitude')
      .is('qr_code_url', null);

    if (fetchError) {
      throw new Error(`Failed to fetch assets: ${fetchError.message}`);
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No assets need QR code generation',
          count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${assets.length} assets without QR codes`);

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Process each asset
    for (const asset of assets) {
      try {
        // Determine the URL to encode in QR
        let targetUrl: string;
        
        if (asset.latitude && asset.longitude) {
          targetUrl = `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`;
        } else {
          // Use asset detail page as fallback
          targetUrl = `https://go-ads-ldbl1.web.app/asset/${asset.id}`;
        }

        // Generate QR code as PNG buffer
        const qrBuffer = await QRCode.toBuffer(targetUrl, {
          errorCorrectionLevel: 'M',
          type: 'png',
          margin: 2,
          width: 512,
        });

        // Convert buffer to Uint8Array for upload
        const qrData = new Uint8Array(qrBuffer);

        // Upload to storage
        const filePath = `${asset.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from('asset-qrcodes')
          .upload(filePath, qrData, {
            contentType: 'image/png',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('asset-qrcodes')
          .getPublicUrl(filePath);

        // Update database
        const { error: updateError } = await supabase
          .from('media_assets')
          .update({ qr_code_url: publicUrl })
          .eq('id', asset.id);

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`);
        }

        successCount++;
        console.log(`✓ Generated QR for asset: ${asset.id}`);

      } catch (error) {
        failureCount++;
        const errorMsg = `Failed for ${asset.id}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(errorMsg);
        // Continue processing other assets
      }
    }

    console.log(`Completed: ${successCount} succeeded, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        total: assets.length,
        succeeded: successCount,
        failed: failureCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Generated ${successCount} QR codes successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`
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
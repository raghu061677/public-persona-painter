import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version',
};

interface RequestBody {
  company_id?: string;
  force_regenerate?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { company_id, force_regenerate = false } = await req.json() as RequestBody;

    console.log('Starting batch QR code generation', { company_id, force_regenerate });

    // Build query for assets that need QR codes
    let query = supabase
      .from('media_assets')
      .select('id, latitude, longitude, qr_code_url, company_id')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Filter by company if provided
    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    // Only generate for assets without QR codes unless force_regenerate is true
    if (!force_regenerate) {
      query = query.is('qr_code_url', null);
    }

    const { data: assets, error: assetsError } = await query;

    if (assetsError) {
      throw assetsError;
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No assets found that need QR code generation',
          generated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${assets.length} assets to generate QR codes for`);

    // Generate QR codes by calling the database function for each asset
    const results = [];
    for (const asset of assets) {
      try {
        const { data, error } = await supabase.rpc('generate_asset_qr_code', {
          p_asset_id: asset.id,
        });

        if (error) {
          console.error(`Failed to generate QR for asset ${asset.id}:`, error);
          results.push({ asset_id: asset.id, success: false, error: error.message });
        } else {
          console.log(`Generated QR code for asset ${asset.id}`);
          results.push({ asset_id: asset.id, success: true, qr_url: data });
        }
      } catch (err) {
        console.error(`Exception generating QR for asset ${asset.id}:`, err);
        results.push({ 
          asset_id: asset.id, 
          success: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Batch generation complete: ${successCount} success, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        success: true,
        total: assets.length,
        generated: successCount,
        failed: failureCount,
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch QR code generation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate QR codes',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

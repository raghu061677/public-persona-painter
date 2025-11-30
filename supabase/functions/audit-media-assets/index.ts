import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting Media Assets Audit...");

    // 1. Check for duplicate IDs
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, city, media_type, latitude, longitude, google_street_view_url, qr_code_url, dimensions, is_multi_face, total_sqft');

    if (assetsError) throw assetsError;

    const duplicateCheck = new Map<string, number>();
    (assets || []).forEach(asset => {
      duplicateCheck.set(asset.id, (duplicateCheck.get(asset.id) || 0) + 1);
    });

    const duplicates = Array.from(duplicateCheck.entries())
      .filter(([_, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    // 2. Check photo counts
    const { data: photos } = await supabase
      .from('media_photos')
      .select('asset_id, id');

    const photoCounts = (photos || []).reduce((acc, photo) => {
      acc[photo.asset_id] = (acc[photo.asset_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 3. Validate each asset
    const validationResults = (assets || []).map(asset => {
      const issues: string[] = [];
      const fixes: string[] = [];

      // Check GPS
      if (!asset.latitude || !asset.longitude) {
        issues.push("missing_gps");
      }

      // Check Street View
      if (asset.latitude && asset.longitude && !asset.google_street_view_url) {
        issues.push("missing_street_view");
        fixes.push("auto_generate_street_view");
      }

      // Check QR
      if (!asset.qr_code_url) {
        issues.push("missing_qr_code");
      }

      // Check photos
      const photoCount = photoCounts[asset.id] || 0;
      if (photoCount === 0) {
        issues.push("no_photos");
      } else if (photoCount < 2) {
        issues.push("insufficient_photos");
      }

      // Check dimensions
      if (!asset.dimensions || !asset.dimensions.match(/\d+\s*[xX×]\s*\d+/)) {
        issues.push("invalid_dimensions");
      }

      // Check multi-face consistency
      const hasDash = asset.dimensions?.includes('-');
      if (asset.is_multi_face !== hasDash) {
        issues.push("multi_face_mismatch");
        fixes.push("recalculate_dimensions");
      }

      // Check sqft
      if (!asset.total_sqft || asset.total_sqft === 0) {
        issues.push("missing_total_sqft");
        fixes.push("recalculate_dimensions");
      }

      return {
        asset_id: asset.id,
        city: asset.city,
        media_type: asset.media_type,
        photo_count: photoCount,
        issues,
        suggested_fixes: fixes,
        severity: issues.length === 0 ? 'healthy' : issues.length < 3 ? 'warning' : 'critical'
      };
    });

    // 4. Generate summary
    const summary = {
      total_assets: assets?.length || 0,
      duplicates_found: duplicates.length,
      duplicate_ids: duplicates,
      healthy_assets: validationResults.filter(v => v.severity === 'healthy').length,
      warning_assets: validationResults.filter(v => v.severity === 'warning').length,
      critical_assets: validationResults.filter(v => v.severity === 'critical').length,
      common_issues: {
        missing_qr: validationResults.filter(v => v.issues.includes('missing_qr_code')).length,
        missing_photos: validationResults.filter(v => v.issues.includes('no_photos')).length,
        missing_gps: validationResults.filter(v => v.issues.includes('missing_gps')).length,
        invalid_dimensions: validationResults.filter(v => v.issues.includes('invalid_dimensions')).length,
      }
    };

    console.log("Audit complete:", summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        validation_results: validationResults,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Audit error:', error);
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

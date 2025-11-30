import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Build Google Street View URL
 */
function buildStreetViewUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: '1',
    map_action: 'pano',
    viewpoint: `${lat},${lng}`,
    heading: '-45',
    pitch: '0',
    fov: '80',
  });
  return `https://www.google.com/maps/@?${params.toString()}`;
}

/**
 * Parse dimensions and calculate sqft
 */
function parseDimensions(dimensions: string): {
  totalSqft: number;
  isMultiFace: boolean;
} {
  if (!dimensions) return { totalSqft: 0, isMultiFace: false };

  const faceStrings = dimensions.split(/\s*[-–—]\s*/).filter(f => f.trim());
  const faces = faceStrings.map(faceStr => {
    const parts = faceStr.split(/[xX*×\s]+/).filter(p => p).map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * parts[1];
    }
    return 0;
  });

  const totalSqft = faces.reduce((sum, sqft) => sum + sqft, 0);
  return {
    totalSqft: Math.round(totalSqft),
    isMultiFace: faces.length > 1
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { fix_type = 'all' } = await req.json();

    console.log(`Starting asset fixes for: ${fix_type}`);

    const fixes = {
      street_view: 0,
      dimensions: 0,
      errors: [] as string[]
    };

    // Fetch all assets
    const { data: assets, error: fetchError } = await supabase
      .from('media_assets')
      .select('id, latitude, longitude, google_street_view_url, dimensions, is_multi_face, total_sqft');

    if (fetchError) throw fetchError;

    for (const asset of assets || []) {
      try {
        const updates: any = {};

        // Fix 1: Generate Street View URL if missing
        if ((fix_type === 'all' || fix_type === 'street_view') &&
            asset.latitude && asset.longitude && !asset.google_street_view_url) {
          updates.google_street_view_url = buildStreetViewUrl(asset.latitude, asset.longitude);
          fixes.street_view++;
        }

        // Fix 2: Recalculate dimensions
        if ((fix_type === 'all' || fix_type === 'dimensions') && asset.dimensions) {
          const parsed = parseDimensions(asset.dimensions);
          
          if (asset.is_multi_face !== parsed.isMultiFace || asset.total_sqft !== parsed.totalSqft) {
            updates.is_multi_face = parsed.isMultiFace;
            updates.total_sqft = parsed.totalSqft;
            fixes.dimensions++;
          }
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('media_assets')
            .update(updates)
            .eq('id', asset.id);

          if (updateError) {
            fixes.errors.push(`${asset.id}: ${updateError.message}`);
          }
        }
      } catch (assetError) {
        fixes.errors.push(`${asset.id}: ${assetError instanceof Error ? assetError.message : String(assetError)}`);
      }
    }

    console.log("Fix complete:", fixes);

    return new Response(
      JSON.stringify({
        success: true,
        fixes,
        message: `Fixed ${fixes.street_view} street view URLs and ${fixes.dimensions} dimension issues`,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fix error:', error);
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

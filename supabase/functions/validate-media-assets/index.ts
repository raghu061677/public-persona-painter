import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: assets, error: assetErr } = await supabase
      .from("media_assets")
      .select("*");

    if (assetErr) {
      console.error("Error fetching assets:", assetErr);
      return new Response(JSON.stringify({ error: assetErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: photos, error: photoErr } = await supabase
      .from("media_photos")
      .select("*");

    if (photoErr) {
      console.error("Error fetching photos:", photoErr);
      return new Response(JSON.stringify({ error: photoErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group photos by asset
    const photoMap: Record<string, any[]> = {};
    photos?.forEach((p) => {
      if (!photoMap[p.asset_id]) photoMap[p.asset_id] = [];
      photoMap[p.asset_id].push(p);
    });

    function validate(asset: any) {
      const errors: string[] = [];
      const gallery = photoMap[asset.id] || [];

      // Check for photos - warning only if no photos exist
      if (gallery.length === 0) {
        errors.push("No photos uploaded yet");
      }

      // Validate dimensions format
      if (!asset.dimensions) {
        errors.push("Missing dimensions");
      } else if (!/^\d+[xX]\d+(-\d+[xX]\d+)*$/.test(asset.dimensions)) {
        errors.push("Invalid dimensions format (use format: WxH or W1xH1-W2xH2)");
      }

      // GPS coordinates are recommended but not critical
      if (!asset.latitude || !asset.longitude) {
        errors.push("Missing GPS coordinates (recommended for mapping)");
      }

      // Illumination type is important for power billing
      if (!asset.illumination_type) {
        errors.push("Missing illumination_type");
      }

      // Validate multi-face setup
      if (asset.is_multi_face && (!asset.faces || asset.faces.length < 2)) {
        errors.push("Multi-face asset must have at least 2 faces defined");
      }

      // Municipal reference validation
      if (asset.municipal_authority && !asset.municipal_id) {
        errors.push("Municipal authority specified but municipal_id is missing");
      }

      // Basic required fields
      if (!asset.location) errors.push("Missing location");
      if (!asset.area) errors.push("Missing area");
      if (!asset.city) errors.push("Missing city");
      if (!asset.card_rate || asset.card_rate <= 0) errors.push("Invalid card_rate");

      return errors;
    }

    const results = assets.map((a) => ({
      id: a.id,
      asset_code: a.asset_code,
      errors: validate(a),
    }));

    const totalAssets = results.length;
    const assetsWithErrors = results.filter(r => r.errors.length > 0).length;
    const validAssets = totalAssets - assetsWithErrors;

    return new Response(
      JSON.stringify({
        summary: {
          total: totalAssets,
          valid: validAssets,
          invalid: assetsWithErrors,
        },
        results
      }, null, 2),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Validation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

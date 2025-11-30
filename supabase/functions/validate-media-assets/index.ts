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

      if (!asset.primary_photo_url) errors.push("Missing primary_photo_url");
      if (gallery.length === 0) errors.push("No photos in media_photos");

      if (!asset.dimensions) errors.push("Missing dimensions");
      else if (!/^\d+[xX]\d+(-\d+[xX]\d+)*$/.test(asset.dimensions)) {
        errors.push("Invalid dimensions format");
      }

      if (!asset.latitude || !asset.longitude)
        errors.push("Missing GPS coordinates");

      if (!asset.illumination_type) errors.push("Missing illumination_type");

      if (asset.is_multi_face && (!asset.faces || asset.faces.length < 2))
        errors.push("is_multi_face = true but faces[] invalid");

      if (asset.municipal_authority && !asset.municipal_id)
        errors.push("Municipal authority present but municipal_id missing");

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

/**
 * validate-media-assets — Phase-5 hardened
 * Roles: admin, ops (read-only validation)
 * Company scoped from JWT
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  withAuth,
  getAuthContext,
  requireRole,
  supabaseServiceClient,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(withAuth(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'ops']);

  const companyId = ctx.companyId;
  const supabase = supabaseServiceClient();

  // Fetch assets scoped to company
  const { data: assets, error: assetErr } = await supabase
    .from("media_assets")
    .select("*")
    .eq("company_id", companyId);

  if (assetErr) {
    console.error("Error fetching assets:", assetErr);
    return new Response(JSON.stringify({ error: assetErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Fetch photos for these assets
  const assetIds = assets?.map(a => a.id) || [];
  const { data: photos, error: photoErr } = await supabase
    .from("media_photos")
    .select("*")
    .in("asset_id", assetIds.length > 0 ? assetIds : ['__none__']);

  if (photoErr) {
    console.error("Error fetching photos:", photoErr);
    return new Response(JSON.stringify({ error: photoErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const photoMap: Record<string, any[]> = {};
  photos?.forEach((p) => {
    if (!photoMap[p.asset_id]) photoMap[p.asset_id] = [];
    photoMap[p.asset_id].push(p);
  });

  function validate(asset: any) {
    const errors: string[] = [];
    const gallery = photoMap[asset.id] || [];
    if (gallery.length === 0) errors.push("No photos uploaded yet");
    if (!asset.dimensions) errors.push("Missing dimensions");
    else if (!/^\d+[xX]\d+(-\d+[xX]\d+)*$/.test(asset.dimensions)) errors.push("Invalid dimensions format");
    if (!asset.latitude || !asset.longitude) errors.push("Missing GPS coordinates");
    if (!asset.illumination_type) errors.push("Missing illumination_type");
    if (asset.is_multi_face && (!asset.faces || asset.faces.length < 2)) errors.push("Multi-face asset must have at least 2 faces");
    if (asset.municipal_authority && !asset.municipal_id) errors.push("Municipal authority specified but municipal_id is missing");
    if (!asset.location) errors.push("Missing location");
    if (!asset.area) errors.push("Missing area");
    if (!asset.city) errors.push("Missing city");
    if (!asset.card_rate || asset.card_rate <= 0) errors.push("Invalid card_rate");
    return errors;
  }

  const results = (assets || []).map((a) => ({
    id: a.id,
    asset_code: a.asset_code || a.media_asset_code,
    errors: validate(a),
  }));

  const totalAssets = results.length;
  const assetsWithErrors = results.filter(r => r.errors.length > 0).length;

  return new Response(
    JSON.stringify({
      summary: { total: totalAssets, valid: totalAssets - assetsWithErrors, invalid: assetsWithErrors },
      results,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}));

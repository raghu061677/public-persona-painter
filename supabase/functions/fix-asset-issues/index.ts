/**
 * fix-asset-issues — Phase-5 hardened
 * Roles: admin only (write operation)
 * Company scoped from JWT
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  withAuth,
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseServiceClient,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

function buildStreetViewUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: '1', map_action: 'pano', viewpoint: `${lat},${lng}`, heading: '-45', pitch: '0', fov: '80',
  });
  return `https://www.google.com/maps/@?${params.toString()}`;
}

function parseDimensions(dimensions: string): { totalSqft: number; isMultiFace: boolean } {
  if (!dimensions) return { totalSqft: 0, isMultiFace: false };
  const faceStrings = dimensions.split(/\s*[-–—]\s*/).filter(f => f.trim());
  const faces = faceStrings.map(faceStr => {
    const parts = faceStr.split(/[xX*×\s]+/).filter(p => p).map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * parts[1];
    return 0;
  });
  return { totalSqft: Math.round(faces.reduce((s, v) => s + v, 0)), isMultiFace: faces.length > 1 };
}

serve(withAuth(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const companyId = ctx.companyId;
  const body = await req.json().catch(() => ({}));
  const fix_type = body.fix_type || 'all';

  // Validate fix_type
  const validTypes = ['all', 'street_view', 'dimensions'];
  if (!validTypes.includes(fix_type)) {
    return new Response(JSON.stringify({ error: `Invalid fix_type. Must be: ${validTypes.join(', ')}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`[fix-asset-issues] type=${fix_type}, company=${companyId}, by=${ctx.userId}`);

  const supabase = supabaseServiceClient();

  // Fetch only this company's assets
  const { data: assets, error: fetchError } = await supabase
    .from('media_assets')
    .select('id, latitude, longitude, google_street_view_url, dimensions, is_multi_face, total_sqft')
    .eq('company_id', companyId);

  if (fetchError) throw fetchError;

  const fixes = { street_view: 0, dimensions: 0, errors: [] as string[] };

  for (const asset of assets || []) {
    try {
      const updates: any = {};
      if ((fix_type === 'all' || fix_type === 'street_view') && asset.latitude && asset.longitude && !asset.google_street_view_url) {
        updates.google_street_view_url = buildStreetViewUrl(asset.latitude, asset.longitude);
        fixes.street_view++;
      }
      if ((fix_type === 'all' || fix_type === 'dimensions') && asset.dimensions) {
        const parsed = parseDimensions(asset.dimensions);
        if (asset.is_multi_face !== parsed.isMultiFace || asset.total_sqft !== parsed.totalSqft) {
          updates.is_multi_face = parsed.isMultiFace;
          updates.total_sqft = parsed.totalSqft;
          fixes.dimensions++;
        }
      }
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from('media_assets').update(updates).eq('id', asset.id).eq('company_id', companyId);
        if (updateError) fixes.errors.push(`${asset.id}: ${updateError.message}`);
      }
    } catch (e) {
      fixes.errors.push(`${asset.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Audit log
  await logSecurityAudit({
    functionName: 'fix-asset-issues',
    userId: ctx.userId,
    companyId,
    action: 'bulk_fix_assets',
    recordIds: [],
    status: 'success',
    metadata: { fix_type, street_view_fixed: fixes.street_view, dimensions_fixed: fixes.dimensions },
    req,
  });

  return new Response(
    JSON.stringify({
      success: true,
      fixes,
      message: `Fixed ${fixes.street_view} street view URLs and ${fixes.dimensions} dimension issues`,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

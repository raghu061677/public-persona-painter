// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation from JWT
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'finance']);

  const body = await req.json().catch(() => null);
  const filters = body?.filters || {};

  // Use company_id from auth context, NEVER from request body
  const company_id = ctx.companyId;

  const serviceClient = supabaseServiceClient();

  let query = serviceClient
    .from('media_assets')
    .select('*')
    .eq('company_id', company_id);

  if (filters.city) query = query.eq('city', filters.city);
  if (filters.media_type) query = query.eq('media_type', filters.media_type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.is_public !== undefined) query = query.eq('is_public', filters.is_public);

  const { data: assets, error: assetsError } = await query.order('city', { ascending: true });
  if (assetsError) throw assetsError;

  // Deduplicate by asset id
  const seen = new Set<string>();
  const deduped = (assets || []).filter((a: any) => {
    const key = a.media_asset_code || a.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: City → Media Type → Location
  deduped.sort((a: any, b: any) => {
    const cmp1 = (a.city || '').localeCompare(b.city || '');
    if (cmp1 !== 0) return cmp1;
    const cmp2 = (a.media_type || '').localeCompare(b.media_type || '');
    if (cmp2 !== 0) return cmp2;
    return (a.location || '').localeCompare(b.location || '');
  });

  // Standardised column order
  const csvRows: string[] = [];
  csvRows.push([
    'Asset Code', 'Media Type', 'City', 'Location', 'Area', 'Facing',
    'Size', 'Sq Ft', 'Lit Type', 'Rate', 'Status',
    'Available From', 'Available To', 'Latitude', 'Longitude',
  ].join(','));

  for (const asset of deduped) {
    csvRows.push([
      asset.media_asset_code || asset.id,
      asset.media_type || '',
      asset.city || '',
      `"${(asset.location || '').replace(/"/g, '""')}"`,
      asset.area || '',
      asset.facing || asset.direction || '',
      asset.dimension || asset.dimensions || '',
      asset.total_sqft || '',
      asset.illumination_type || asset.illumination || '',
      (asset.card_rate || 0).toFixed(2),
      asset.status || '',
      asset.next_available_from || '',
      '',
      asset.latitude || '',
      asset.longitude || '',
    ].join(','));
  }

  const csvContent = csvRows.join('\n');
  const csvBuffer = new TextEncoder().encode(csvContent);

  const fileName = `assets-export-${company_id}-${Date.now()}.csv`;
  const { error: uploadError } = await serviceClient.storage
    .from('client-documents')
    .upload(fileName, csvBuffer, { contentType: 'text/csv', upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = await serviceClient.storage
    .from('client-documents')
    .createSignedUrl(fileName, 3600);

  await logSecurityAudit({
    functionName: 'export-assets-excel', userId: ctx.userId,
    companyId: ctx.companyId, action: 'export_assets',
    status: 'success', req,
    metadata: { assetCount: assets?.length || 0, filters },
  });

  return jsonSuccess({
    success: true,
    url: urlData?.signedUrl,
    fileName,
    assetCount: assets?.length || 0,
  });
}));

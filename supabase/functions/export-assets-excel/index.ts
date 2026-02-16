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

  const csvRows: string[] = [];
  csvRows.push([
    'Asset ID', 'City', 'Area', 'Location', 'Media Type', 'Dimension',
    'Total Sq Ft', 'Facing', 'Status', 'Card Rate', 'Base Rate',
    'Printing Charge', 'Mounting Charge', 'Latitude', 'Longitude',
    'Municipal ID', 'Municipal Authority', 'Is Public', 'Zone', 'Sub Zone',
  ].join(','));

  for (const asset of assets || []) {
    csvRows.push([
      asset.id, asset.city || '', asset.area || '',
      `"${(asset.location || '').replace(/"/g, '""')}"`,
      asset.media_type || '', asset.dimension || '',
      asset.total_sqft || '', asset.facing || '', asset.status || '',
      (asset.card_rate || 0).toFixed(2), (asset.base_rate || 0).toFixed(2),
      (asset.printing_charge || 0).toFixed(2), (asset.mounting_charge || 0).toFixed(2),
      asset.latitude || '', asset.longitude || '',
      asset.municipal_id || '', asset.municipal_authority || '',
      asset.is_public ? 'Yes' : 'No', asset.zone || '', asset.sub_zone || '',
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

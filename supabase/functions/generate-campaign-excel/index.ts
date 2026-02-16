// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation
import {
  getAuthContext, requireRole, requireCompanyMatch, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'finance']);

  const body = await req.json().catch(() => null);
  if (!body?.campaignId || typeof body.campaignId !== 'string') {
    return jsonError('campaignId is required', 400);
  }
  const { campaignId } = body;

  const serviceClient = supabaseServiceClient();

  const { data: campaign, error: campaignError } = await serviceClient
    .from('campaigns')
    .select(`
      *,
      clients!inner(name, gstin),
      campaign_assets(
        id, asset_id, location, city, area, media_type,
        card_rate, printing_charges, mounting_charges,
        status, assigned_at, completed_at
      )
    `)
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) {
    return jsonError('Campaign not found', 404);
  }

  // Verify campaign belongs to user's company
  requireCompanyMatch(ctx, campaign.company_id);

  const csvRows: string[] = [];

  csvRows.push([
    'Campaign ID', 'Campaign Name', 'Client', 'Start Date', 'End Date',
    'Status', 'Total Amount', 'GST Amount', 'Grand Total',
  ].join(','));

  csvRows.push([
    campaign.id,
    `"${campaign.campaign_name}"`,
    `"${campaign.clients.name}"`,
    new Date(campaign.start_date).toLocaleDateString('en-IN'),
    new Date(campaign.end_date).toLocaleDateString('en-IN'),
    campaign.status,
    campaign.total_amount?.toFixed(2) || '0.00',
    campaign.gst_amount?.toFixed(2) || '0.00',
    campaign.grand_total?.toFixed(2) || '0.00',
  ].join(','));

  csvRows.push('');

  csvRows.push([
    'Asset ID', 'Location', 'City', 'Area', 'Media Type',
    'Card Rate', 'Printing', 'Mounting', 'Status',
    'Assigned Date', 'Completed Date',
  ].join(','));

  for (const asset of campaign.campaign_assets || []) {
    csvRows.push([
      asset.asset_id,
      `"${asset.location}"`,
      asset.city, asset.area, asset.media_type,
      asset.card_rate?.toFixed(2) || '0.00',
      (asset.printing_charges || 0).toFixed(2),
      (asset.mounting_charges || 0).toFixed(2),
      asset.status,
      asset.assigned_at ? new Date(asset.assigned_at).toLocaleDateString('en-IN') : '',
      asset.completed_at ? new Date(asset.completed_at).toLocaleDateString('en-IN') : '',
    ].join(','));
  }

  const csvContent = csvRows.join('\n');
  const csvBuffer = new TextEncoder().encode(csvContent);

  const fileName = `campaign-report-${campaign.id}-${Date.now()}.csv`;
  const { error: uploadError } = await serviceClient.storage
    .from('client-documents')
    .upload(fileName, csvBuffer, { contentType: 'text/csv', upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = await serviceClient.storage
    .from('client-documents')
    .createSignedUrl(fileName, 3600);

  await logSecurityAudit({
    functionName: 'generate-campaign-excel', userId: ctx.userId,
    companyId: ctx.companyId, action: 'generate_campaign_excel',
    recordIds: [campaignId], status: 'success', req,
    metadata: { assetCount: campaign.campaign_assets?.length || 0 },
  });

  return jsonSuccess({
    success: true,
    url: urlData?.signedUrl,
    fileName,
    assetCount: campaign.campaign_assets?.length || 0,
  });
}));

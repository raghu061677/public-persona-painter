/**
 * auto-create-mounting-tasks — Phase-6 Hardened
 * Auth: JWT + role gate (admin, ops)
 * Validates campaign belongs to caller's company
 * Audit logs task creation
 */
import {
  withAuth, getAuthContext, requireRole,
  supabaseServiceClient, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'ops']);

  const body = await req.json().catch(() => null);
  if (!body || typeof body.campaign_id !== 'string' || body.campaign_id.trim().length === 0) {
    return jsonError('campaign_id (string) is required');
  }
  const campaignId = body.campaign_id.trim();

  const supabase = supabaseServiceClient();

  // Verify campaign belongs to caller's company
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('company_id, start_date, end_date, campaign_name')
    .eq('id', campaignId)
    .single();

  if (campaignError || !campaign) return jsonError('Campaign not found', 404);
  if (campaign.company_id !== ctx.companyId) return jsonError('Campaign does not belong to your company', 403);

  // Fetch campaign assets
  const { data: assets, error: assetsError } = await supabase
    .from('campaign_assets')
    .select('asset_id, location, city, area, media_type')
    .eq('campaign_id', campaignId);

  if (assetsError) return jsonError(assetsError.message, 500);
  if (!assets || assets.length === 0) return jsonError('No assets found for this campaign', 404);

  const startDate = new Date(campaign.start_date);
  const printingDate = new Date(startDate);
  printingDate.setDate(printingDate.getDate() - 5);

  const tasks: any[] = [];

  for (const asset of assets) {
    tasks.push({
      campaign_id: campaignId, company_id: ctx.companyId, asset_id: asset.asset_id,
      job_type: 'Printing', status: 'Pending',
      start_date: printingDate.toISOString().split('T')[0],
      city: asset.city, area: asset.area, location: asset.location, media_type: asset.media_type,
      notes: `Printing for ${asset.location} - ${campaign.campaign_name}`,
    });
    tasks.push({
      campaign_id: campaignId, company_id: ctx.companyId, asset_id: asset.asset_id,
      job_type: 'Mounting', status: 'Pending',
      start_date: campaign.start_date,
      city: asset.city, area: asset.area, location: asset.location, media_type: asset.media_type,
      notes: `Mounting for ${asset.location} - ${campaign.campaign_name}`,
    });
    const photoDate = new Date(startDate);
    photoDate.setDate(photoDate.getDate() + 1);
    tasks.push({
      campaign_id: campaignId, company_id: ctx.companyId, asset_id: asset.asset_id,
      job_type: 'PhotoUpload', status: 'Pending',
      start_date: photoDate.toISOString().split('T')[0],
      city: asset.city, area: asset.area, location: asset.location, media_type: asset.media_type,
      notes: `Photo proof for ${asset.location} - ${campaign.campaign_name}`,
    });
  }

  const { data: createdTasks, error: tasksError } = await supabase
    .from('operations_tasks').insert(tasks).select();

  if (tasksError) return jsonError(tasksError.message, 500);

  await logSecurityAudit({
    functionName: 'auto-create-mounting-tasks',
    userId: ctx.userId, companyId: ctx.companyId,
    action: 'create_mounting_tasks',
    recordIds: [campaignId],
    metadata: { tasks_created: createdTasks?.length || 0 },
    req,
  });

  return jsonSuccess({ success: true, tasks_created: createdTasks?.length || 0, tasks: createdTasks });
}));

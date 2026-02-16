// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  // Allow admin, sales, ops roles to add timeline events
  requireRole(ctx, ['admin', 'sales', 'ops']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { campaign_id, event_type, event_title, event_description, metadata = {} } = body;

  if (!campaign_id || typeof campaign_id !== 'string') {
    return jsonError('campaign_id is required', 400);
  }
  if (!event_type || typeof event_type !== 'string') {
    return jsonError('event_type is required', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Verify campaign belongs to user's company (tenant isolation)
  const { data: campaign, error: campaignError } = await serviceClient
    .from('campaigns')
    .select('id, company_id')
    .eq('id', campaign_id)
    .single();

  if (campaignError || !campaign) {
    return jsonError('Campaign not found', 404);
  }

  if (campaign.company_id !== ctx.companyId) {
    return jsonError('Campaign does not belong to your company', 403);
  }

  console.log('Adding timeline event:', { campaign_id, event_type, event_title, userId: ctx.userId });

  const { data, error } = await serviceClient
    .from('campaign_timeline')
    .insert({
      campaign_id,
      company_id: ctx.companyId, // Always use verified company_id from JWT
      event_type,
      event_title: event_title || event_type,
      event_description: event_description || null,
      created_by: ctx.userId, // Always use verified user ID
      metadata,
    })
    .select()
    .single();

  if (error) throw error;

  await logSecurityAudit({
    functionName: 'add-timeline-event',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: 'add_timeline_event',
    recordIds: [campaign_id],
    status: 'success',
    req,
    metadata: { event_type },
  });

  return jsonSuccess({ success: true, data });
}));

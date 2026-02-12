// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { companyId } = body;
  const targetCompany = companyId || ctx.companyId;
  if (targetCompany !== ctx.companyId) {
    return jsonError('Can only clear demo data from your own company', 403);
  }

  const serviceClient = supabaseServiceClient();

  let deletedCounts = { campaigns: 0, campaign_assets: 0, plans: 0, leads: 0, clients: 0, assets: 0 };

  const { count: caCount } = await serviceClient.from('campaign_assets').delete({ count: 'exact' }).like('campaign_id', 'CAM-DEMO-%');
  deletedCounts.campaign_assets = caCount || 0;

  const { count: campCount } = await serviceClient.from('campaigns').delete({ count: 'exact' }).like('id', 'CAM-DEMO-%');
  deletedCounts.campaigns = campCount || 0;

  const { count: planCount } = await serviceClient.from('plans').delete({ count: 'exact' }).like('id', 'PLAN-DEMO-%');
  deletedCounts.plans = planCount || 0;

  const { count: leadCount } = await serviceClient.from('leads').delete({ count: 'exact' }).like('id', 'LEAD-DEMO-%');
  deletedCounts.leads = leadCount || 0;

  const { count: clientCount } = await serviceClient.from('clients').delete({ count: 'exact' }).like('id', 'CLT-DEMO-%');
  deletedCounts.clients = clientCount || 0;

  await logSecurityAudit({
    functionName: 'clear-demo-data', userId: ctx.userId,
    companyId: ctx.companyId, action: 'clear_demo_data',
    status: 'success', req, metadata: { deletedCounts },
  });

  return jsonSuccess({ message: 'Demo data cleared', deletedCounts });
}));

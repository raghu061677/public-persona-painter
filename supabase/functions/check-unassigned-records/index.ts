// v2.0 - Phase-6 Security: withAuth + getAuthContext + admin-only
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
  requireRole(ctx, ['admin']);

  const serviceClient = supabaseServiceClient();

  // Count records without company_id in each table, scoped to platform admin view
  const counts: Record<string, number> = {
    assets: 0,
    clients: 0,
    leads: 0,
    campaigns: 0,
    plans: 0,
  };

  const tables = [
    { key: 'assets', table: 'media_assets' },
    { key: 'clients', table: 'clients' },
    { key: 'leads', table: 'leads' },
    { key: 'campaigns', table: 'campaigns' },
    { key: 'plans', table: 'plans' },
  ];

  for (const { key, table } of tables) {
    const { count, error } = await serviceClient
      .from(table)
      .select('id', { count: 'exact', head: true })
      .is('company_id', null);

    if (!error && count !== null) {
      counts[key] = count;
    }
  }

  await logSecurityAudit({
    functionName: 'check-unassigned-records',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: 'check_unassigned_records',
    status: 'success',
    req,
    metadata: { counts },
  });

  return jsonSuccess({ success: true, counts });
}));

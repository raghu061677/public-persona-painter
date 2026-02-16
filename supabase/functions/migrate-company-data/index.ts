// v2.0 - Phase-6 Security: Platform admin only + audit logging
import {
  getAuthContext, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  const isAdmin = await isPlatformAdmin(ctx.userId);
  if (!isAdmin) {
    await logSecurityAudit({
      functionName: 'migrate-company-data', userId: ctx.userId,
      companyId: ctx.companyId, action: 'migrate_data_denied',
      status: 'denied', req,
    });
    throw new AuthError('Only platform admins can migrate company data', 403);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { targetCompanyId } = body;
  if (!targetCompanyId || typeof targetCompanyId !== 'string') {
    return jsonError('Target company ID is required', 400);
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetCompanyId)) {
    return jsonError('Invalid company ID format', 400);
  }

  const serviceClient = supabaseServiceClient();

  const { data: company, error: companyError } = await serviceClient
    .from('companies')
    .select('id, name')
    .eq('id', targetCompanyId)
    .single();

  if (companyError || !company) {
    return jsonError('Target company not found', 404);
  }

  const results: Record<string, number> = { assets: 0, clients: 0, leads: 0, campaigns: 0, plans: 0 };

  const tables = [
    { key: 'assets', table: 'media_assets' },
    { key: 'clients', table: 'clients' },
    { key: 'leads', table: 'leads' },
    { key: 'campaigns', table: 'campaigns' },
    { key: 'plans', table: 'plans' },
  ];

  for (const { key, table } of tables) {
    const { data, error } = await serviceClient
      .from(table)
      .update({ company_id: targetCompanyId })
      .is('company_id', null)
      .select('id');

    if (!error && data) {
      results[key] = data.length;
    } else if (error) {
      console.error(`${key} migration error:`, error);
    }
  }

  await logSecurityAudit({
    functionName: 'migrate-company-data', userId: ctx.userId,
    companyId: ctx.companyId, action: 'migrate_company_data',
    recordIds: [targetCompanyId], status: 'success', req,
    metadata: { targetCompanyName: company.name, results },
  });

  return jsonSuccess({
    success: true,
    message: `Successfully migrated data to ${company.name}`,
    results,
  });
}));

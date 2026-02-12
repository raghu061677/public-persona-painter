// supabase/functions/export-company-data/index.ts
// v2.0 - Phase-3 Security: User-scoped + admin role enforcement + audit logging
// IMPORTANT: companyId is NOT accepted from request body — derived from auth context

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseUserClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  // Use company from auth context — NEVER from request body
  const companyId = ctx.companyId;

  console.log('Exporting data for company:', companyId);

  // User-scoped client ensures RLS (only own company data)
  const userClient = supabaseUserClient(req);

  const [
    { data: company },
    { data: users },
    { data: clients },
    { data: mediaAssets },
    { data: plans },
    { data: campaigns },
    { data: invoices },
    { data: estimations },
    { data: expenses },
    { data: leads },
  ] = await Promise.all([
    userClient.from('companies').select('*').eq('id', companyId).single(),
    userClient.from('company_users').select('*').eq('company_id', companyId),
    userClient.from('clients').select('*').eq('company_id', companyId),
    userClient.from('media_assets').select('*').eq('company_id', companyId),
    userClient.from('plans').select('*').eq('company_id', companyId),
    userClient.from('campaigns').select('*').eq('company_id', companyId),
    userClient.from('invoices').select('*').eq('company_id', companyId),
    userClient.from('estimations').select('*').eq('company_id', companyId),
    userClient.from('expenses').select('*').eq('company_id', companyId),
    userClient.from('leads').select('*').eq('company_id', companyId),
  ]);

  const exportData = {
    company,
    users: users || [],
    clients: clients || [],
    mediaAssets: mediaAssets || [],
    plans: plans || [],
    campaigns: campaigns || [],
    invoices: invoices || [],
    estimations: estimations || [],
    expenses: expenses || [],
    leads: leads || [],
    exportedAt: new Date().toISOString(),
  };

  await logSecurityAudit({
    functionName: 'export-company-data', userId: ctx.userId,
    companyId: ctx.companyId, action: 'export_all_data', req,
    metadata: {
      counts: {
        users: (users || []).length,
        clients: (clients || []).length,
        mediaAssets: (mediaAssets || []).length,
      }
    },
  });

  return new Response(
    JSON.stringify(exportData),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="company-${companyId}-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    }
  );
}));

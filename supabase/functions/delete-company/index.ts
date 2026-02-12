// supabase/functions/delete-company/index.ts
// v2.0 - Phase-3 Security: Platform admin enforcement + audit logging
// This function legitimately needs service role for cascade deletes,
// but MUST enforce platform admin authentication.

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  isPlatformAdmin,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
  withAuth,
  AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  // Only platform admins can delete companies
  const isAdmin = await isPlatformAdmin(ctx.userId);
  if (!isAdmin) {
    await logSecurityAudit({
      functionName: 'delete-company', userId: ctx.userId,
      companyId: ctx.companyId, action: 'delete_company',
      status: 'denied', errorMessage: 'Not a platform admin', req,
    });
    throw new AuthError('Only platform admins can delete companies', 403);
  }

  const body = await req.json().catch(() => null);
  const companyId = body?.companyId;

  if (!companyId || typeof companyId !== 'string') {
    return jsonError('Company ID is required', 400);
  }

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyId)) {
    return jsonError('Invalid company ID format', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Check if it's a platform_admin company
  const { data: company, error: companyError } = await serviceClient
    .from('companies')
    .select('type, name')
    .eq('id', companyId)
    .single();

  if (companyError) {
    return jsonError(`Company not found: ${companyError.message}`, 404);
  }

  if (company?.type === 'platform_admin') {
    return jsonError('Cannot delete platform admin company', 403);
  }

  console.log(`[delete-company] Platform admin ${ctx.userId} deleting company ${companyId} (${company.name})`);

  // Delete all related data in order
  await serviceClient.from('company_users').delete().eq('company_id', companyId);
  await serviceClient.from('booking_requests').delete().eq('owner_company_id', companyId);
  await serviceClient.from('booking_requests').delete().eq('requester_company_id', companyId);
  await serviceClient.from('leads').delete().eq('company_id', companyId);
  await serviceClient.from('clients').delete().eq('company_id', companyId);
  await serviceClient.from('expenses').delete().eq('company_id', companyId);
  await serviceClient.from('invoices').delete().eq('company_id', companyId);
  await serviceClient.from('estimations').delete().eq('company_id', companyId);
  await serviceClient.from('campaigns').delete().eq('company_id', companyId);
  await serviceClient.from('plans').delete().eq('company_id', companyId);
  await serviceClient.from('media_assets').delete().eq('company_id', companyId);

  const { error } = await serviceClient.from('companies').delete().eq('id', companyId);

  if (error) {
    return jsonError(`Failed to delete company: ${error.message}`, 500);
  }

  await logSecurityAudit({
    functionName: 'delete-company', userId: ctx.userId,
    companyId: ctx.companyId, action: 'delete_company',
    recordIds: [companyId], req,
    metadata: { deleted_company_name: company.name, deleted_company_type: company.type },
  });

  return jsonSuccess({ success: true, message: 'Company and all related data deleted successfully' });
}));

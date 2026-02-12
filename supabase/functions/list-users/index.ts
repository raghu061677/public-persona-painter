// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const serviceClient = supabaseServiceClient();

  // Fetch all users with their auth info, scoped to requesting user's company
  const { data: companyUsers, error: cuError } = await serviceClient
    .from('company_users')
    .select('user_id, name, email, phone, role, status, company_id, created_at')
    .eq('company_id', ctx.companyId)
    .eq('status', 'active');

  if (cuError) throw cuError;

  // Enrich with auth metadata
  const enrichedUsers = [];
  for (const cu of companyUsers || []) {
    try {
      const { data: { user: authUser } } = await serviceClient.auth.admin.getUserById(cu.user_id);
      enrichedUsers.push({
        ...cu,
        auth_email: authUser?.email,
        last_sign_in: authUser?.last_sign_in_at,
        email_confirmed: authUser?.email_confirmed_at != null,
      });
    } catch {
      enrichedUsers.push(cu);
    }
  }

  return jsonSuccess({ users: enrichedUsers });
}));

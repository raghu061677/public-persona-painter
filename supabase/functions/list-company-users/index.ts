// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  
  // Platform admin only
  const isAdmin = await isPlatformAdmin(ctx.userId);
  if (!isAdmin) {
    throw new AuthError('Only platform admins can list all company users', 403);
  }

  const url = new URL(req.url);
  const companyId = url.searchParams.get('companyId');

  const serviceClient = supabaseServiceClient();

  let query = serviceClient
    .from('company_users')
    .select(`
      user_id, name, email, phone, role, status, company_id, created_at,
      companies!inner(name, type, status)
    `)
    .eq('status', 'active');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: users, error } = await query;
  if (error) throw error;

  // Enrich with auth metadata
  const enrichedUsers = [];
  for (const cu of users || []) {
    try {
      const { data: { user: authUser } } = await serviceClient.auth.admin.getUserById(cu.user_id);
      enrichedUsers.push({
        ...cu,
        auth_email: authUser?.email,
        last_sign_in: authUser?.last_sign_in_at,
      });
    } catch {
      enrichedUsers.push(cu);
    }
  }

  return jsonSuccess({ users: enrichedUsers, total: enrichedUsers.length });
}));

// v3.2 - Allow company admins to list their own company users, platform admins can list any
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  
  const url = new URL(req.url);
  const requestedCompanyId = url.searchParams.get('companyId');

  const isAdmin = await isPlatformAdmin(ctx.userId);

  // If requesting a different company's users, must be platform admin
  if (requestedCompanyId && requestedCompanyId !== ctx.companyId && !isAdmin) {
    throw new AuthError('Only platform admins can list other company users', 403);
  }

  // Non-platform admins must be company admin
  if (!isAdmin) {
    requireRole(ctx, ['admin']);
  }

  const targetCompanyId = requestedCompanyId || ctx.companyId;

  const serviceClient = supabaseServiceClient();

  let query = serviceClient
    .from('company_users')
    .select(`
      user_id, role, status, company_id, joined_at, is_primary,
      companies!inner(name, type, status)
    `)
    .eq('status', 'active');

  if (targetCompanyId) {
    query = query.eq('company_id', targetCompanyId);
  } else if (!isAdmin) {
    // Safety: non-platform admins always scoped to their company
    query = query.eq('company_id', ctx.companyId);
  }

  const { data: users, error } = await query;
  if (error) {
    console.error('[list-company-users] DB error:', error);
    throw error;
  }

  console.log(`[list-company-users] Found ${users?.length ?? 0} users`);

  // Enrich with auth metadata
  const enrichedUsers = [];
  for (const cu of users || []) {
    try {
      const { data: { user: authUser }, error: authErr } = await serviceClient.auth.admin.getUserById(cu.user_id);
      if (authErr) {
        console.error(`[list-company-users] Auth lookup failed for ${cu.user_id}:`, authErr);
        enrichedUsers.push({ ...cu, name: null, email: null, phone: null });
        continue;
      }
      enrichedUsers.push({
        ...cu,
        name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || null,
        email: authUser?.email || null,
        phone: authUser?.phone || null,
        auth_email: authUser?.email,
        last_sign_in: authUser?.last_sign_in_at,
      });
    } catch {
      enrichedUsers.push({ ...cu, name: null, email: null, phone: null });
    }
  }

  return jsonSuccess({ users: enrichedUsers, total: enrichedUsers.length });
}));

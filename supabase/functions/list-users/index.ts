// v3.1 - Fixed: removed non-existent columns, added error logging
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const serviceClient = supabaseServiceClient();

  // Fetch all users scoped to requesting user's company
  const { data: companyUsers, error: cuError } = await serviceClient
    .from('company_users')
    .select('user_id, role, status, company_id, joined_at, is_primary')
    .eq('company_id', ctx.companyId)
    .eq('status', 'active');

  if (cuError) {
    console.error('[list-users] DB error:', cuError);
    throw cuError;
  }

  console.log(`[list-users] Found ${companyUsers?.length ?? 0} company users`);

  // Enrich with auth metadata
  const enrichedUsers = [];
  for (const cu of companyUsers || []) {
    try {
      const { data: { user: authUser }, error: authError } = await serviceClient.auth.admin.getUserById(cu.user_id);
      if (authError) {
        console.error(`[list-users] Auth lookup failed for ${cu.user_id}:`, authError);
        enrichedUsers.push({
          ...cu,
          name: null,
          email: null,
          phone: null,
        });
        continue;
      }
      enrichedUsers.push({
        ...cu,
        name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || null,
        email: authUser?.email || null,
        phone: authUser?.phone || null,
        auth_email: authUser?.email,
        last_sign_in: authUser?.last_sign_in_at,
        email_confirmed: authUser?.email_confirmed_at != null,
      });
    } catch (err) {
      console.error(`[list-users] Error enriching user ${cu.user_id}:`, err);
      enrichedUsers.push({
        ...cu,
        name: null,
        email: null,
        phone: null,
      });
    }
  }

  return jsonSuccess({ users: enrichedUsers });
}));

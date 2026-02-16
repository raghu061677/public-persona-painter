// v2.0 - Phase-6 Security: withAuth + getAuthContext + admin role enforcement
import {
  getAuthContext, requireRole, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const serviceClient = supabaseServiceClient();

  // Platform admins see all users; company admins see only their company's users
  const isAdmin = await isPlatformAdmin(ctx.userId);

  let profilesQuery = serviceClient.from('company_users').select('user_id, name, email, role, company_id');
  if (!isAdmin) {
    profilesQuery = profilesQuery.eq('company_id', ctx.companyId);
  }
  profilesQuery = profilesQuery.eq('status', 'active');

  const { data: companyUsers, error: cuError } = await profilesQuery;
  if (cuError) throw cuError;

  const activitiesData = await Promise.all(
    (companyUsers || []).map(async (cu: any) => {
      const { count } = await serviceClient
        .from('activity_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', cu.user_id);

      const { data: recentActions } = await serviceClient
        .from('activity_logs')
        .select('action, resource_type, created_at')
        .eq('user_id', cu.user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        id: cu.user_id,
        username: cu.name || 'Unknown',
        email: cu.email || '',
        role: cu.role,
        total_actions: count || 0,
        recent_actions: (recentActions || []).map((action: any) => ({
          activity_type: action.action,
          activity_description: `${action.action} on ${action.resource_type}`,
          created_at: action.created_at,
        })),
      };
    })
  );

  await logSecurityAudit({
    functionName: 'get-user-activities', userId: ctx.userId,
    companyId: ctx.companyId, action: 'view_user_activities',
    status: 'success', req,
    metadata: { userCount: activitiesData.length },
  });

  return jsonSuccess({ data: activitiesData });
}));

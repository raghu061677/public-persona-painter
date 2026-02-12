// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { userId, companyId } = body;
  if (!userId || typeof userId !== 'string') return jsonError('userId is required', 400);
  if (!companyId || typeof companyId !== 'string') return jsonError('companyId is required', 400);

  // Platform admin can delete from any company; company admin only from own
  const isAdmin = await isPlatformAdmin(ctx.userId);
  if (!isAdmin && companyId !== ctx.companyId) {
    await logSecurityAudit({
      functionName: 'delete-user', userId: ctx.userId,
      companyId: ctx.companyId, action: 'delete_user_denied',
      status: 'denied', req, metadata: { targetUserId: userId, targetCompany: companyId },
    });
    return jsonError('Forbidden – cannot delete users from other companies', 403);
  }

  // Prevent self-deletion
  if (userId === ctx.userId) {
    return jsonError('Cannot delete yourself', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Remove from company_users
  const { error: cuError } = await serviceClient
    .from('company_users')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (cuError) throw cuError;

  // Check if user has any other company memberships
  const { data: otherMemberships } = await serviceClient
    .from('company_users')
    .select('id')
    .eq('user_id', userId);

  // If no other memberships, delete auth user
  if (!otherMemberships || otherMemberships.length === 0) {
    const { error: authDeleteError } = await serviceClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
    }
    // Also clean up user_roles
    await serviceClient.from('user_roles').delete().eq('user_id', userId);
  }

  await logSecurityAudit({
    functionName: 'delete-user', userId: ctx.userId,
    companyId: ctx.companyId, action: 'delete_user',
    recordIds: [userId], status: 'success', req,
    metadata: { targetCompany: companyId, authDeleted: !otherMemberships?.length },
  });

  return jsonSuccess({ message: 'User deleted successfully' });
}));

// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);

  const isAdmin = await isPlatformAdmin(ctx.userId);
  if (!isAdmin) {
    throw new AuthError('Only platform admins can reset admin passwords', 403);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { email, newPassword } = body;
  if (!email || typeof email !== 'string') return jsonError('Email is required', 400);
  if (!newPassword || newPassword.length < 8) return jsonError('Password must be 8+ chars', 400);

  const serviceClient = supabaseServiceClient();
  const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers();
  if (listError) throw listError;

  const targetUser = users?.find((u: any) => u.email === email);
  if (!targetUser) return jsonError('User not found', 404);

  const { error } = await serviceClient.auth.admin.updateUserById(targetUser.id, { password: newPassword });
  if (error) throw error;

  await logSecurityAudit({
    functionName: 'reset-admin-password', userId: ctx.userId,
    companyId: ctx.companyId, action: 'reset_admin_password',
    recordIds: [targetUser.id], status: 'success', req,
  });

  return jsonSuccess({ message: 'Admin password reset successfully' });
}));

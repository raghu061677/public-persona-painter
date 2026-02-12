// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

const ALL_MODULES = [
  'clients', 'media_assets', 'plans', 'campaigns', 'operations',
  'finance', 'invoices', 'expenses', 'power_bills', 'reports',
  'settings', 'users', 'companies',
];

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { targetUserId, role, permissions } = body;
  if (!targetUserId || typeof targetUserId !== 'string') {
    return jsonError('targetUserId is required', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Verify target user is in same company
  const { data: targetUser } = await serviceClient
    .from('company_users')
    .select('id, company_id, role')
    .eq('user_id', targetUserId)
    .eq('company_id', ctx.companyId)
    .maybeSingle();

  if (!targetUser) {
    return jsonError('User not found in your company', 404);
  }

  // Prevent non-platform-admin from assigning admin role
  if (role === 'admin' && ctx.role !== 'admin') {
    return jsonError('Only admins can assign admin role', 403);
  }

  const updates: any = {};
  if (role) updates.role = role;
  if (permissions) updates.permissions = permissions;

  const { error: updateError } = await serviceClient
    .from('company_users')
    .update(updates)
    .eq('user_id', targetUserId)
    .eq('company_id', ctx.companyId);

  if (updateError) throw updateError;

  // Update user_roles table if role changed
  if (role) {
    await serviceClient.from('user_roles').upsert(
      { user_id: targetUserId, role },
      { onConflict: 'user_id,role' }
    );
  }

  await logSecurityAudit({
    functionName: 'assign-user-permissions', userId: ctx.userId,
    companyId: ctx.companyId, action: 'assign_permissions',
    recordIds: [targetUserId], status: 'success', req,
    metadata: { role, permissions },
  });

  return jsonSuccess({ message: 'Permissions updated successfully' });
}));

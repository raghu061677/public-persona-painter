/**
 * assign-user-permissions — Production-safe permission assignment.
 * Validates roles against canonical set.
 */
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';
import { validateRole, CANONICAL_ROLES } from '../_shared/roles.ts';

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

  const updates: Record<string, unknown> = {};

  // Validate and normalize role if provided
  if (role) {
    try {
      updates.role = validateRole(role);
    } catch (e) {
      return jsonError(`Invalid role: "${role}". Valid roles: ${CANONICAL_ROLES.join(', ')}`, 400);
    }
  }

  if (permissions) updates.permissions = permissions;

  if (Object.keys(updates).length === 0) {
    return jsonError('No changes to apply', 400);
  }

  const { error: updateError } = await serviceClient
    .from('company_users')
    .update(updates)
    .eq('user_id', targetUserId)
    .eq('company_id', ctx.companyId);

  if (updateError) {
    console.error('[assign-perms] Error:', updateError);
    return jsonError('Failed to update permissions: ' + updateError.message, 500);
  }

  // Update user_roles table if role changed
  if (updates.role) {
    await serviceClient.from('user_roles').upsert(
      { user_id: targetUserId, role: updates.role as string },
      { onConflict: 'user_id,role' }
    );
  }

  await logSecurityAudit({
    functionName: 'assign-user-permissions', userId: ctx.userId,
    companyId: ctx.companyId, action: 'assign_permissions',
    recordIds: [targetUserId], status: 'success', req,
    metadata: { role: updates.role, permissions },
  });

  return jsonSuccess({ message: 'Permissions updated successfully' });
}));

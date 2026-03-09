/**
 * update-company-user — Production-safe company user update.
 * company_users columns: id, company_id, user_id, role, is_primary, status, joined_at, invited_by
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

  const { user_id, company_id, name, role, status } = body;
  if (!user_id || typeof user_id !== 'string') return jsonError('user_id is required', 400);

  const targetCompany = company_id || ctx.companyId;
  if (targetCompany !== ctx.companyId) {
    return jsonError('Cannot update users in other companies', 403);
  }

  const serviceClient = supabaseServiceClient();

  // Verify target user exists (only select existing columns)
  const { data: existing } = await serviceClient
    .from('company_users')
    .select('id')
    .eq('user_id', user_id)
    .eq('company_id', ctx.companyId)
    .maybeSingle();

  if (!existing) return jsonError('User not found in your company', 404);

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;

  if (role) {
    try {
      updates.role = validateRole(role);
    } catch (e) {
      return jsonError(
        `Invalid role: "${role}". Valid roles: ${CANONICAL_ROLES.join(', ')}`,
        400
      );
    }
  }

  if (Object.keys(updates).length === 0 && !name) {
    return jsonError('No valid fields to update', 400);
  }

  // Update company_users table fields
  if (Object.keys(updates).length > 0) {
    const { error } = await serviceClient
      .from('company_users')
      .update(updates)
      .eq('user_id', user_id)
      .eq('company_id', ctx.companyId);

    if (error) {
      console.error('[update-company-user] Error:', error);
      return jsonError('Failed to update user: ' + error.message, 500);
    }
  }

  // Name goes to auth metadata
  if (name && typeof name === 'string' && name.trim()) {
    try {
      await serviceClient.auth.admin.updateUserById(user_id, {
        user_metadata: { username: name.trim() },
      });
    } catch (e) {
      console.warn('[update-company-user] Auth metadata warning:', e);
    }
  }

  await logSecurityAudit({
    functionName: 'update-company-user', userId: ctx.userId,
    companyId: ctx.companyId, action: 'update_company_user',
    recordIds: [user_id], status: 'success', req,
    metadata: { updatedFields: [...Object.keys(updates), ...(name ? ['name'] : [])] },
  });

  return jsonSuccess({ message: 'Company user updated successfully' });
}));

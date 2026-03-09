/**
 * update-user — Production-safe user update edge function.
 * company_users table columns: id, company_id, user_id, role, is_primary, status, joined_at, invited_by
 * Name updates go to auth.users metadata only.
 */
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';
import { validateRole, CANONICAL_ROLES } from '../_shared/roles.ts';

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    return jsonError('Method not allowed', 405);
  }

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const targetUserId = body.userId || body.user_id;
  if (!targetUserId || typeof targetUserId !== 'string') {
    return jsonError('userId is required', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Verify target user belongs to same company (only select existing columns)
  const { data: targetUser, error: lookupError } = await serviceClient
    .from('company_users')
    .select('id, role, status')
    .eq('user_id', targetUserId)
    .eq('company_id', ctx.companyId)
    .maybeSingle();

  if (lookupError) {
    console.error('[update-user] Lookup error:', lookupError);
    return jsonError('Failed to look up user', 500);
  }

  if (!targetUser) {
    return jsonError('User not found in your company', 404);
  }

  // Build update for company_users (only columns that exist in the table)
  const companyUserUpdate: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  // Role
  if (body.role !== undefined && body.role !== null) {
    try {
      companyUserUpdate.role = validateRole(body.role);
      updatedFields.push('role');
    } catch (e) {
      return jsonError(
        `Invalid role: "${body.role}". Valid roles: ${CANONICAL_ROLES.join(', ')}`,
        400
      );
    }
  }

  // Status
  if (body.status !== undefined) {
    companyUserUpdate.status = body.status;
    updatedFields.push('status');
  } else if (body.isActive !== undefined) {
    companyUserUpdate.status = body.isActive ? 'active' : 'suspended';
    updatedFields.push('status');
  }

  // Update company_users if there are table-level changes
  if (Object.keys(companyUserUpdate).length > 0) {
    const { error: updateError } = await serviceClient
      .from('company_users')
      .update(companyUserUpdate)
      .eq('user_id', targetUserId)
      .eq('company_id', ctx.companyId);

    if (updateError) {
      console.error('[update-user] Update error:', updateError);
      return jsonError('Failed to update user: ' + updateError.message, 500);
    }
  }

  // Update user_roles if role changed
  if (companyUserUpdate.role) {
    const { error: roleError } = await serviceClient
      .from('user_roles')
      .upsert(
        { user_id: targetUserId, role: companyUserUpdate.role as string },
        { onConflict: 'user_id,role' }
      );
    if (roleError) {
      console.warn('[update-user] user_roles upsert warning:', roleError.message);
    }
  }

  // Name updates go to auth metadata (not company_users table)
  const nameValue = body.name || body.username || body.display_name;
  if (nameValue && typeof nameValue === 'string' && nameValue.trim()) {
    try {
      await serviceClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: { username: nameValue.trim() },
      });
      updatedFields.push('name');
    } catch (e) {
      console.warn('[update-user] Auth metadata update warning:', e);
    }
  }

  if (updatedFields.length === 0) {
    return jsonError('No valid fields to update', 400);
  }

  console.log(`[update-user] Updated user ${targetUserId}: ${updatedFields.join(', ')}`);

  await logSecurityAudit({
    functionName: 'update-user', userId: ctx.userId,
    companyId: ctx.companyId, action: 'update_user',
    recordIds: [targetUserId], status: 'success', req,
    metadata: { updatedFields },
  });

  return jsonSuccess({ message: 'User updated successfully' });
}));

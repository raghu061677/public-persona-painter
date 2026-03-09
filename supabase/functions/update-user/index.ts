/**
 * update-user — Production-safe user update edge function.
 * Handles: name, role, status updates for company users.
 * Email is read-only (requires separate secure flow).
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

  // Accept both userId and user_id for compatibility
  const targetUserId = body.userId || body.user_id;
  if (!targetUserId || typeof targetUserId !== 'string') {
    return jsonError('userId is required', 400);
  }

  const serviceClient = supabaseServiceClient();

  // Verify target user belongs to same company
  const { data: targetUser, error: lookupError } = await serviceClient
    .from('company_users')
    .select('id, role, status, name, email')
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

  // Build update object from allowed fields
  const updateData: Record<string, unknown> = {};

  // Name: accept both "name" and "username" from frontend
  const nameValue = body.name || body.username || body.display_name;
  if (nameValue && typeof nameValue === 'string' && nameValue.trim()) {
    updateData.name = nameValue.trim();
  }

  // Phone
  if (body.phone !== undefined) {
    updateData.phone = body.phone;
  }

  // Role: validate and normalize to canonical
  if (body.role !== undefined && body.role !== null) {
    try {
      const canonicalRole = validateRole(body.role);
      updateData.role = canonicalRole;
    } catch (e) {
      return jsonError(
        `Invalid role: "${body.role}". Valid roles: ${CANONICAL_ROLES.join(', ')}`,
        400
      );
    }
  }

  // Status: accept both status string and isActive boolean
  if (body.status !== undefined) {
    updateData.status = body.status;
  } else if (body.isActive !== undefined) {
    updateData.status = body.isActive ? 'active' : 'suspended';
  }

  // Display name
  if (body.display_name !== undefined) {
    updateData.display_name = body.display_name;
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError('No valid fields to update', 400);
  }

  console.log(`[update-user] Updating user ${targetUserId} in company ${ctx.companyId}:`, Object.keys(updateData));

  // Update company_users
  const { error: updateError } = await serviceClient
    .from('company_users')
    .update(updateData)
    .eq('user_id', targetUserId)
    .eq('company_id', ctx.companyId);

  if (updateError) {
    console.error('[update-user] Update error:', updateError);
    return jsonError('Failed to update user: ' + updateError.message, 500);
  }

  // Update user_roles if role changed
  if (updateData.role) {
    const { error: roleError } = await serviceClient
      .from('user_roles')
      .upsert(
        { user_id: targetUserId, role: updateData.role as string },
        { onConflict: 'user_id,role' }
      );
    if (roleError) {
      console.warn('[update-user] user_roles upsert warning:', roleError.message);
    }
  }

  // Update auth metadata if name changed
  if (updateData.name) {
    try {
      await serviceClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: { username: updateData.name },
      });
    } catch (e) {
      console.warn('[update-user] Auth metadata update warning:', e);
    }
  }

  await logSecurityAudit({
    functionName: 'update-user', userId: ctx.userId,
    companyId: ctx.companyId, action: 'update_user',
    recordIds: [targetUserId], status: 'success', req,
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return jsonSuccess({ message: 'User updated successfully' });
}));

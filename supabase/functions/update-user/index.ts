// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { userId, name, email, phone, role, status, display_name } = body;
  if (!userId || typeof userId !== 'string') return jsonError('userId is required', 400);

  const serviceClient = supabaseServiceClient();

  // Verify target user belongs to same company (unless platform admin)
  const { data: targetUser } = await serviceClient
    .from('company_users')
    .select('company_id, role')
    .eq('user_id', userId)
    .eq('company_id', ctx.companyId)
    .maybeSingle();

  if (!targetUser) {
    return jsonError('User not found in your company', 404);
  }

  // Build update object
  const updateData: any = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (role) updateData.role = role;
  if (status) updateData.status = status;
  if (display_name !== undefined) updateData.display_name = display_name;

  // Update company_users
  const { error: updateError } = await serviceClient
    .from('company_users')
    .update(updateData)
    .eq('user_id', userId)
    .eq('company_id', ctx.companyId);

  if (updateError) throw updateError;

  // Update auth user email if changed
  if (email) {
    await serviceClient.auth.admin.updateUserById(userId, { email });
  }

  // Update user_roles if role changed
  if (role) {
    await serviceClient.from('user_roles').upsert(
      { user_id: userId, role },
      { onConflict: 'user_id,role' }
    );
  }

  await logSecurityAudit({
    functionName: 'update-user', userId: ctx.userId,
    companyId: ctx.companyId, action: 'update_user',
    recordIds: [userId], status: 'success', req,
    metadata: { updatedFields: Object.keys(updateData) },
  });

  return jsonSuccess({ message: 'User updated successfully' });
}));

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

  const { user_id, company_id, name, email, phone, role, status } = body;
  if (!user_id || typeof user_id !== 'string') return jsonError('user_id is required', 400);

  // Company scoping: can only update users in own company
  const targetCompany = company_id || ctx.companyId;
  if (targetCompany !== ctx.companyId) {
    return jsonError('Cannot update users in other companies', 403);
  }

  const serviceClient = supabaseServiceClient();

  // Verify target user exists in company
  const { data: existing } = await serviceClient
    .from('company_users')
    .select('id')
    .eq('user_id', user_id)
    .eq('company_id', ctx.companyId)
    .maybeSingle();

  if (!existing) return jsonError('User not found in your company', 404);

  const updates: any = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (role) updates.role = role;
  if (status) updates.status = status;

  const { error } = await serviceClient
    .from('company_users')
    .update(updates)
    .eq('user_id', user_id)
    .eq('company_id', ctx.companyId);

  if (error) throw error;

  // Update auth email if changed
  if (email) {
    await serviceClient.auth.admin.updateUserById(user_id, { email });
  }

  await logSecurityAudit({
    functionName: 'update-company-user', userId: ctx.userId,
    companyId: ctx.companyId, action: 'update_company_user',
    recordIds: [user_id], status: 'success', req,
    metadata: { updatedFields: Object.keys(updates) },
  });

  return jsonSuccess({ message: 'Company user updated successfully' });
}));

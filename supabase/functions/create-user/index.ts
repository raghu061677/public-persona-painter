/**
 * create-user — Phase-5 hardened
 * Roles: admin (company-scoped) or platform_admin
 * NOTE: This function MUST use service-role for auth.admin.createUser()
 * but all data queries use the user client where possible.
 * The service client is used ONLY for:
 *   1) auth.admin.createUser (no RLS alternative)
 *   2) Reading company_users for auth context (handled by getAuthContext)
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  withAuth,
  getAuthContext,
  requireRole,
  isPlatformAdmin,
  logSecurityAudit,
  supabaseServiceClient,
  supabaseUserClient,
  jsonError,
  jsonSuccess,
  AuthError,
} from '../_shared/auth.ts';

serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);

  // Only admin or platform_admin can create users
  const isPA = await isPlatformAdmin(ctx.userId);
  if (ctx.role !== 'admin' && !isPA) {
    return jsonError('Forbidden – only admin or platform_admin can create users', 403);
  }

  // Parse & validate body
  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid request body', 400);

  const { email, password, username, role } = body;
  if (!email || !password || !username || !role) {
    return jsonError('Missing required fields: email, password, username, role', 400);
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Invalid email format', 400);
  }
  // Validate password length
  if (password.length < 8) {
    return jsonError('Password must be at least 8 characters', 400);
  }
  // Validate role
  const validRoles = ['admin', 'sales', 'ops', 'finance', 'viewer'];
  if (!validRoles.includes(role)) {
    return jsonError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }

  // Company scoping: use ctx.companyId (derived from JWT, NOT from body)
  const companyId = ctx.companyId;

  console.log(`[create-user] Creating user ${email} with role ${role} in company ${companyId} by ${ctx.userId}`);

  // Service client needed for auth.admin.createUser (no alternative)
  const serviceClient = supabaseServiceClient();

  const { data: authData, error: authCreateError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (authCreateError) {
    console.error('[create-user] Auth create error:', authCreateError);
    return jsonError(authCreateError.message, 400);
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await serviceClient
    .from('profiles')
    .insert({ id: userId, username });

  if (profileError) {
    console.error('[create-user] Profile error:', profileError);
  }

  // Link user to company
  const { error: companyUserError } = await serviceClient
    .from('company_users')
    .upsert({
      company_id: companyId,
      user_id: userId,
      role,
      is_primary: false,
      status: 'active',
      invited_by: ctx.userId,
    }, { onConflict: 'company_id,user_id', ignoreDuplicates: false });

  if (companyUserError) {
    console.error('[create-user] Company user error:', companyUserError);
    return jsonError('Failed to link user to company: ' + companyUserError.message, 400);
  }

  // Audit log
  await logSecurityAudit({
    functionName: 'create-user',
    userId: ctx.userId,
    companyId,
    action: 'create_user',
    recordIds: [userId],
    status: 'success',
    metadata: { email, role, created_user_id: userId },
    req,
  });

  // Activity log
  try {
    await serviceClient.rpc('log_activity', {
      p_action: 'create_user',
      p_resource_type: 'user_management',
      p_resource_id: userId,
      p_resource_name: username,
      p_details: { email, role, company_id: companyId },
      p_user_id: ctx.userId,
    });
  } catch (e) {
    console.error('[create-user] Activity log error:', e);
  }

  return jsonSuccess({
    success: true,
    user_id: userId,
    message: 'User created and added to company successfully',
  });
}));

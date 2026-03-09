/**
 * create-user — Production-safe user creation.
 * Validates roles against canonical set.
 */
import {
  withAuth,
  getAuthContext,
  isPlatformAdmin,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
} from '../_shared/auth.ts';
import { validateRole, CANONICAL_ROLES } from '../_shared/roles.ts';

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);

  // Only admin or platform_admin can create users
  const isPA = await isPlatformAdmin(ctx.userId);
  if (ctx.role !== 'admin' && !isPA) {
    return jsonError('Forbidden – only admin can create users', 403);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid request body', 400);

  const { email, password, username, role } = body;
  if (!email || !password || !username || !role) {
    return jsonError('Missing required fields: email, password, username, role', 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Invalid email format', 400);
  }
  if (password.length < 8) {
    return jsonError('Password must be at least 8 characters', 400);
  }

  // Validate and normalize role
  let canonicalRole: string;
  try {
    canonicalRole = validateRole(role);
  } catch (e) {
    return jsonError(`Invalid role: "${role}". Valid roles: ${CANONICAL_ROLES.join(', ')}`, 400);
  }

  const companyId = ctx.companyId;

  console.log(`[create-user] Creating ${email} role=${canonicalRole} company=${companyId}`);

  const serviceClient = supabaseServiceClient();

  const { data: authData, error: authCreateError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (authCreateError) {
    console.error('[create-user] Auth error:', authCreateError);
    return jsonError(authCreateError.message, 400);
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await serviceClient
    .from('profiles')
    .insert({ id: userId, username });
  if (profileError) console.warn('[create-user] Profile warning:', profileError.message);

  // Link user to company with canonical role
  const { error: companyUserError } = await serviceClient
    .from('company_users')
    .upsert({
      company_id: companyId,
      user_id: userId,
      role: canonicalRole,
      is_primary: false,
      status: 'active',
      invited_by: ctx.userId,
    }, { onConflict: 'company_id,user_id', ignoreDuplicates: false });

  if (companyUserError) {
    console.error('[create-user] Company user error:', companyUserError);
    return jsonError('Failed to link user to company: ' + companyUserError.message, 400);
  }

  await logSecurityAudit({
    functionName: 'create-user', userId: ctx.userId, companyId,
    action: 'create_user', recordIds: [userId], status: 'success',
    metadata: { email, role: canonicalRole }, req,
  });

  try {
    await serviceClient.rpc('log_activity', {
      p_action: 'create_user', p_resource_type: 'user_management',
      p_resource_id: userId, p_resource_name: username,
      p_details: { email, role: canonicalRole, company_id: companyId },
      p_user_id: ctx.userId,
    });
  } catch (e) {
    console.warn('[create-user] Activity log warning:', e);
  }

  return jsonSuccess({ success: true, user_id: userId, message: 'User created successfully' });
}));

// v3.0 - Phase-5: withAuth + getAuthContext + requireRole + audit
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext, requireRole, isPlatformAdmin, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth, AuthError,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const isAdmin = await isPlatformAdmin(ctx.userId);
  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON body', 400);

  const { companyId, userName, userEmail, userPassword, userRole } = body;

  if (!companyId || !userName || !userEmail || !userPassword || !userRole) {
    return jsonError('Missing required fields', 400);
  }

  // Check permission: platform admin can add to any company, company admin only to own
  const hasAccess = isAdmin || companyId === ctx.companyId;
  if (!hasAccess) {
    await logSecurityAudit({
      functionName: 'add-user-to-company', userId: ctx.userId,
      companyId: ctx.companyId, action: 'add_user_denied',
      status: 'denied', req, metadata: { targetCompany: companyId },
    });
    return jsonError('Forbidden – cannot add users to other companies', 403);
  }

  const serviceClient = supabaseServiceClient();

  // Check if user already exists
  const { data: existingUser } = await serviceClient
    .from('company_users')
    .select('id')
    .eq('email', userEmail)
    .eq('company_id', companyId)
    .maybeSingle();

  if (existingUser) {
    return jsonError('User already exists in this company', 409);
  }

  // Create auth user
  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email: userEmail,
    password: userPassword,
    email_confirm: true,
  });

  if (authError) {
    // User might already exist in auth, try to find them
    const { data: { users } } = await serviceClient.auth.admin.listUsers();
    const existing = users?.find((u: any) => u.email === userEmail);
    if (!existing) throw authError;

    // Add existing auth user to company
    const { error: insertError } = await serviceClient.from('company_users').insert({
      user_id: existing.id,
      company_id: companyId,
      name: userName,
      email: userEmail,
      role: userRole,
      status: 'active',
    });

    if (insertError) throw insertError;

    await logSecurityAudit({
      functionName: 'add-user-to-company', userId: ctx.userId,
      companyId: ctx.companyId, action: 'add_existing_user_to_company',
      recordIds: [existing.id], status: 'success', req,
    });

    return jsonSuccess({ message: 'Existing user added to company', userId: existing.id });
  }

  // New auth user created, add to company
  const { error: insertError } = await serviceClient.from('company_users').insert({
    user_id: authUser.user.id,
    company_id: companyId,
    name: userName,
    email: userEmail,
    role: userRole,
    status: 'active',
  });

  if (insertError) throw insertError;

  // Also add to user_roles
  await serviceClient.from('user_roles').insert({
    user_id: authUser.user.id,
    role: userRole,
  });

  await logSecurityAudit({
    functionName: 'add-user-to-company', userId: ctx.userId,
    companyId: ctx.companyId, action: 'add_new_user_to_company',
    recordIds: [authUser.user.id], status: 'success', req,
    metadata: { targetCompany: companyId, role: userRole },
  });

  return jsonSuccess({ message: 'User created and added to company', userId: authUser.user.id });
}));

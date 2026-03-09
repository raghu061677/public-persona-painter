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

  const { email, role, inviterName } = body;
  if (!email || typeof email !== 'string') return jsonError('Email is required', 400);
  if (!role || typeof role !== 'string') return jsonError('Role is required', 400);

  const serviceClient = supabaseServiceClient();
  const tempPassword = crypto.randomUUID();

  let userId: string;

  // Try to create auth user; if already exists, look them up
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email, password: tempPassword, email_confirm: false,
  });

  if (userError) {
    if (userError.message?.includes('already been registered') || (userError as any).code === 'email_exists') {
      // User exists in auth — find them
      const { data: { users }, error: listErr } = await serviceClient.auth.admin.listUsers();
      if (listErr) return jsonError('Failed to look up existing user', 500);
      const existing = users?.find((u: any) => u.email === email);
      if (!existing) return jsonError('User reported as existing but not found', 404);
      userId = existing.id;
    } else {
      return jsonError(userError.message || 'Failed to create user', 400);
    }
  } else {
    userId = userData.user.id;
  }

  // Check if already in this company
  const { data: existingMember } = await serviceClient
    .from('company_users')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', ctx.companyId)
    .maybeSingle();

  if (existingMember) {
    return jsonError('This user is already a member of your company', 409);
  }

  // Add to company_users
  await serviceClient.from('company_users').insert({
    user_id: userId, company_id: ctx.companyId,
    name: email.split('@')[0], email, role, status: 'active',
  });

  await serviceClient.from('user_roles').upsert(
    { user_id: userId, role },
    { onConflict: 'user_id,role' }
  );

  // Send invite email via Resend if available
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (RESEND_API_KEY) {
    try {
      const { Resend } = await import('https://esm.sh/resend@2.0.0');
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: 'Go-Ads 360° <onboarding@resend.dev>',
        to: [email],
        subject: `You're invited to Go-Ads 360°`,
        html: `<p>Hi,</p><p>${inviterName || 'An admin'} has invited you to Go-Ads 360°.</p><p>Your temporary password: <strong>${tempPassword}</strong></p><p>Please login and change your password immediately.</p>`,
      });
    } catch (e) { console.error('Email send failed:', e); }
  }

  await logSecurityAudit({
    functionName: 'send-user-invite', userId: ctx.userId,
    companyId: ctx.companyId, action: 'invite_user',
    recordIds: [userId], status: 'success', req,
    metadata: { invitedEmail: email, role },
  });

  return jsonSuccess({ message: 'User invited successfully', userId });
}));

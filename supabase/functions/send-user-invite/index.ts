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

  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email, password: tempPassword, email_confirm: false,
  });

  if (userError) throw userError;

  // Add to company_users
  await serviceClient.from('company_users').insert({
    user_id: userData.user.id, company_id: ctx.companyId,
    name: email.split('@')[0], email, role, status: 'active',
  });

  await serviceClient.from('user_roles').insert({ user_id: userData.user.id, role });

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
    recordIds: [userData.user.id], status: 'success', req,
    metadata: { invitedEmail: email, role },
  });

  return jsonSuccess({ message: 'User invited successfully', userId: userData.user.id });
}));

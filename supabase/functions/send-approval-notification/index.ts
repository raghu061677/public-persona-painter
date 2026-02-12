/**
 * send-approval-notification — Phase-6 Hardened
 * Auth: JWT + role gate (admin, sales, finance)
 * Validates plan belongs to caller's company
 * Rate limit: 5/min/user
 * Audit log
 */
import {
  withAuth, getAuthContext, requireRole, checkRateLimit,
  supabaseServiceClient, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const VALID_TYPES = ['approval_request', 'approval_completed', 'approval_rejected'];

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'finance']);
  checkRateLimit(`approval-notif:${ctx.userId}`, 5, 60_000);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid JSON');

  const { planId, approvalLevel, requiredRole, notificationType } = body;

  if (!planId || typeof planId !== 'string') return jsonError('planId is required');
  if (!notificationType || !VALID_TYPES.includes(notificationType)) return jsonError(`notificationType must be one of: ${VALID_TYPES.join(', ')}`);

  const supabase = supabaseServiceClient();

  // Verify plan belongs to caller's company
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, plan_name, client_name, grand_total, company_id')
    .eq('id', planId)
    .single();

  if (planError || !plan) return jsonError('Plan not found', 404);
  if (plan.company_id !== ctx.companyId) return jsonError('Plan does not belong to your company', 403);

  // Get approvers from company_users with required role
  const { data: approvers } = await supabase
    .from('company_users')
    .select('user_id, email, name')
    .eq('company_id', ctx.companyId)
    .eq('role', requiredRole || 'admin')
    .eq('status', 'active');

  const emails = (approvers || []).filter(a => a.email).map(a => a.email);

  if (emails.length === 0) {
    return jsonSuccess({ message: 'No approvers found', emailsSent: 0 });
  }

  // Build email
  let subject = '';
  let htmlContent = '';

  if (notificationType === 'approval_request') {
    subject = `Approval Required: ${plan.plan_name}`;
    htmlContent = `<h1>Plan Approval Required</h1><p>Plan: ${plan.plan_name}</p><p>Client: ${plan.client_name}</p><p>Amount: ₹${plan.grand_total?.toLocaleString('en-IN')}</p><p>Level: ${approvalLevel || 'N/A'}</p>`;
  } else if (notificationType === 'approval_completed') {
    subject = `Plan Approved: ${plan.plan_name}`;
    htmlContent = `<h1>Plan Approved</h1><p>Plan: ${plan.plan_name}</p><p>Client: ${plan.client_name}</p><p>Amount: ₹${plan.grand_total?.toLocaleString('en-IN')}</p>`;
  } else {
    subject = `Plan Rejected: ${plan.plan_name}`;
    htmlContent = `<h1>Plan Rejected</h1><p>Plan: ${plan.plan_name}</p><p>Client: ${plan.client_name}</p>`;
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return jsonError('Email service not configured', 500);

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Go-Ads 360° <notifications@resend.dev>',
      to: emails,
      subject,
      html: htmlContent,
    }),
  });

  const result = await emailResponse.json();

  await logSecurityAudit({
    functionName: 'send-approval-notification', userId: ctx.userId, companyId: ctx.companyId,
    action: `approval_notification_${notificationType}`, recordIds: [planId],
    metadata: { emailCount: emails.length, notificationType }, req,
  });

  return jsonSuccess({ success: true, emailsSent: emails.length, emailResponse: result });
}));

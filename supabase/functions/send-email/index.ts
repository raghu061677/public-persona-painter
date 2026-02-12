/**
 * send-email — Phase-6 Hardened
 * Auth: JWT + role gate (admin, sales, finance)
 * Validates recipient belongs to caller's company
 * Rate limit: 10 emails/min/user
 * Audit log on every send
 */
import {
  withAuth, getAuthContext, requireRole, checkRateLimit,
  validateRecipientInCompany, logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const MAX_BODY_SIZE = 16384; // 16KB max for email body

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'finance']);
  checkRateLimit(`send-email:${ctx.userId}`, 10, 60_000);

  const raw = await req.text();
  if (raw.length > MAX_BODY_SIZE) return jsonError('Request body too large', 413);

  let body: any;
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid JSON'); }

  const { to, subject, body: emailBody, fromName, fromEmail } = body;

  if (!to || typeof to !== 'string') return jsonError('to (email string) is required');
  if (!subject || typeof subject !== 'string' || subject.length > 200) return jsonError('subject is required (max 200 chars)');
  if (!emailBody || typeof emailBody !== 'string') return jsonError('body (html string) is required');

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return jsonError('Invalid email format');

  // Validate recipient belongs to company
  const isValid = await validateRecipientInCompany(to, ctx.companyId);
  if (!isValid) {
    await logSecurityAudit({
      functionName: 'send-email', userId: ctx.userId, companyId: ctx.companyId,
      action: 'email_blocked_invalid_recipient', status: 'denied',
      metadata: { to: to.slice(0, 50) }, req,
    });
    return jsonError('Recipient email not found in your company contacts', 403);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return jsonError('Email service not configured', 500);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail || 'Go-Ads 360° <noreply@go-ads.in>',
      to: [to],
      subject,
      html: emailBody,
    }),
  });

  const result = await response.json();
  if (!response.ok) return jsonError(result.message || 'Failed to send email', response.status);

  await logSecurityAudit({
    functionName: 'send-email', userId: ctx.userId, companyId: ctx.companyId,
    action: 'email_sent', recordIds: [result.id || ''],
    metadata: { to: to.slice(0, 50), subject: subject.slice(0, 50) }, req,
  });

  return jsonSuccess({ success: true, data: result });
}));

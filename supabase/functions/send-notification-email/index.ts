/**
 * send-notification-email — Phase-6 Hardened
 * Auth: JWT + role gate (admin, sales, finance)
 * Validates recipient belongs to caller's company
 * Rate limit: 10 emails/min/user
 * Audit log on every send
 */
import {
  withAuth, getAuthContext, requireRole, checkRateLimit,
  supabaseServiceClient, validateRecipientInCompany,
  logSecurityAudit, jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const VALID_TYPES = ['proof_upload', 'invoice_reminder', 'payment_confirmation', 'campaign_milestone'];
const MAX_BODY_SIZE = 8192;

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'finance']);
  checkRateLimit(`notif-email:${ctx.userId}`, 10, 60_000);

  const raw = await req.text();
  if (raw.length > MAX_BODY_SIZE) return jsonError('Request body too large', 413);

  let body: any;
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid JSON'); }

  const { type, recipientEmail, recipientName, data } = body;

  if (!type || !VALID_TYPES.includes(type)) return jsonError(`type must be one of: ${VALID_TYPES.join(', ')}`);
  if (!recipientEmail || typeof recipientEmail !== 'string') return jsonError('recipientEmail is required');
  if (!recipientName || typeof recipientName !== 'string') return jsonError('recipientName is required');
  if (!data || typeof data !== 'object') return jsonError('data object is required');

  // Validate recipient belongs to company
  const isValid = await validateRecipientInCompany(recipientEmail, ctx.companyId);
  if (!isValid) {
    await logSecurityAudit({
      functionName: 'send-notification-email', userId: ctx.userId, companyId: ctx.companyId,
      action: 'email_blocked_invalid_recipient', status: 'denied',
      metadata: { recipientEmail: recipientEmail.slice(0, 50) }, req,
    });
    return jsonError('Recipient email not found in your company contacts', 403);
  }

  const supabase = supabaseServiceClient();

  // Get company branding
  const { data: company } = await supabase.from('companies')
    .select('name, logo_url, theme_color').eq('id', ctx.companyId).single();

  const companyName = company?.name || 'Go-Ads 360°';
  const themeColor = company?.theme_color || '#1e40af';

  const emailTemplate = generateEmailTemplate(type, recipientName, data, companyName, company?.logo_url || '', themeColor);

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return jsonError('Email service not configured', 500);

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${companyName} <notifications@go-ads.app>`,
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    }),
  });

  if (!resendResponse.ok) {
    const error = await resendResponse.text();
    throw new Error(`Resend API error: ${error}`);
  }

  const result = await resendResponse.json();

  await logSecurityAudit({
    functionName: 'send-notification-email', userId: ctx.userId, companyId: ctx.companyId,
    action: `email_sent_${type}`, recordIds: [result.id || ''],
    metadata: { recipientEmail: recipientEmail.slice(0, 50), type }, req,
  });

  return jsonSuccess({ success: true, emailId: result.id });
}));

function generateEmailTemplate(type: string, recipientName: string, data: any, companyName: string, logoUrl: string, themeColor: string) {
  const subject = type === 'proof_upload' ? `New Proof Photos Available - ${data.campaignName || ''}`
    : type === 'invoice_reminder' ? `Payment Reminder - Invoice ${data.invoiceId || ''}`
    : type === 'payment_confirmation' ? 'Payment Received - Thank You!'
    : `Campaign Milestone: ${data.milestone || ''} - ${data.campaignName || ''}`;

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:20px;">
    <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
      <div style="background:${themeColor};padding:30px;text-align:center;color:white;">
        ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-width:120px;margin-bottom:10px;" />` : ''}
        <h1 style="margin:0;font-size:22px;">${subject}</h1>
      </div>
      <div style="padding:30px;color:#1e293b;line-height:1.6;">
        <p>Hi ${recipientName},</p>
        <p>${JSON.stringify(data).slice(0, 500)}</p>
      </div>
      <div style="padding:20px;text-align:center;color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;">
        © 2025 ${companyName}. All rights reserved.
      </div>
    </div>
  </body></html>`;

  return { subject, html };
}

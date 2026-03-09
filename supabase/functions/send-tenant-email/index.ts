/**
 * send-tenant-email — Unified email sender
 * 
 * Flow:
 * 1. Check if tenant has active SMTP config → use SMTP
 * 2. Else → fallback to Resend
 * 3. Log every send attempt to email_send_logs
 * 
 * Supports template-based and raw HTML emails.
 */
import {
  withAuth, getAuthContext, requireRole,
  supabaseServiceClient, logSecurityAudit,
  jsonError, jsonSuccess,
} from '../_shared/auth.ts';

const MAX_BODY_SIZE = 32768;

Deno.serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'finance', 'ops']);

  const raw = await req.text();
  if (raw.length > MAX_BODY_SIZE) return jsonError('Request body too large', 413);

  let body: any;
  try { body = JSON.parse(raw); } catch { return jsonError('Invalid JSON'); }

  const { to, subject, html, template_key, variables, test } = body;

  if (!to || typeof to !== 'string') return jsonError('to (email) is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return jsonError('Invalid email format');

  const sb = supabaseServiceClient();

  // Resolve template if template_key provided
  let finalSubject = subject;
  let finalHtml = html;

  if (template_key) {
    const { data: template } = await sb
      .from('email_templates')
      .select('*')
      .eq('company_id', ctx.companyId)
      .eq('template_key', template_key)
      .eq('is_active', true)
      .single();

    if (template) {
      finalSubject = replaceVariables(template.subject, variables || {});
      finalHtml = replaceVariables(template.html_body, variables || {});
    }
  }

  if (!finalSubject) return jsonError('subject is required (or use template_key)');
  if (!finalHtml) return jsonError('html body is required (or use template_key)');

  // Check for tenant SMTP configuration
  const { data: smtpConfig } = await sb
    .from('email_providers')
    .select('*')
    .eq('company_id', ctx.companyId)
    .eq('provider_type', 'smtp')
    .eq('is_active', true)
    .eq('is_default', true)
    .single();

  let providerUsed = 'resend';
  let sendResult: { success: boolean; error?: string; id?: string };

  if (smtpConfig && smtpConfig.smtp_host) {
    // Use tenant SMTP — via Deno SMTP client
    providerUsed = 'smtp';
    sendResult = await sendViaSmtp(smtpConfig, to, finalSubject, finalHtml);
  } else {
    // Fallback to Resend
    sendResult = await sendViaResend(to, finalSubject, finalHtml, ctx.companyId, sb);
  }

  // Log the email
  try {
    await sb.from('email_send_logs').insert({
      company_id: ctx.companyId,
      template_key: template_key || null,
      recipient_email: to,
      subject: finalSubject,
      status: sendResult.success ? 'sent' : 'failed',
      provider_used: providerUsed,
      error_message: sendResult.error || null,
      metadata: { test: !!test, variables: variables || {} },
      sent_at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.error('Failed to log email:', logErr);
  }

  await logSecurityAudit({
    functionName: 'send-tenant-email',
    userId: ctx.userId,
    companyId: ctx.companyId,
    action: sendResult.success ? 'email_sent' : 'email_failed',
    metadata: { to: to.slice(0, 50), provider: providerUsed, template_key },
    req,
  });

  if (!sendResult.success) {
    return jsonError(sendResult.error || 'Failed to send email', 500);
  }

  return jsonSuccess({ success: true, provider: providerUsed, emailId: sendResult.id });
}));

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  companyId: string,
  sb: any
): Promise<{ success: boolean; error?: string; id?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return { success: false, error: 'Resend API key not configured' };

  // Get company branding for from name
  const { data: company } = await sb
    .from('companies')
    .select('name')
    .eq('id', companyId)
    .single();

  const fromName = company?.name || 'Go-Ads 360°';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <notifications@go-ads.in>`,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || `Resend error: ${response.status}` };
    }
    return { success: true, id: result.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function sendViaSmtp(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  // Use Deno's built-in SMTP capabilities
  // For edge functions, we use a simple HTTP-to-SMTP bridge approach
  // Since Deno edge functions can't directly connect to SMTP ports,
  // we'll attempt a direct connection using Deno.connect for TCP
  try {
    const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");
    
    const client = new SmtpClient();
    
    const connectConfig: any = {
      hostname: config.smtp_host,
      port: config.smtp_port,
      username: config.smtp_user,
      password: config.smtp_password,
    };

    if (config.smtp_secure) {
      await client.connectTLS(connectConfig);
    } else {
      await client.connect(connectConfig);
    }

    await client.send({
      from: config.from_email,
      to: to,
      subject: subject,
      content: "Please view this email in an HTML-compatible client.",
      html: html,
    });

    await client.close();
    
    return { success: true, id: `smtp-${Date.now()}` };
  } catch (err: any) {
    console.error('SMTP send error:', err);
    return { success: false, error: `SMTP error: ${err.message}` };
  }
}

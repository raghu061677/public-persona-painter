/**
 * process-email-outbox — v2.0 Phase-6 Security
 * Processes queued emails from email_outbox table.
 * Dual auth: HMAC (cron) or authenticated admin user.
 */
import {
  requireHmac,
  getAuthContext,
  requireRole,
  supabaseServiceClient,
  AuthError,
  getCorsHeaders,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Dual auth: accepts either HMAC (cron) or authenticated admin/finance user.
 */
async function authenticateRequest(req: Request, rawBody: string): Promise<void> {
  const hasHmacHeaders = req.headers.get('X-GoAds-Timestamp') && req.headers.get('X-GoAds-Signature');
  if (hasHmacHeaders) {
    await requireHmac(req, rawBody);
    return;
  }
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);
}

Deno.serve(async (req) => {
  const responseHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: responseHeaders });

  const rawBody = await req.text();

  try {
    await authenticateRequest(req, rawBody);
  } catch (error) {
    const status = error instanceof AuthError ? error.statusCode : 401;
    const msg = error instanceof Error ? error.message : 'Authentication failed';
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { ...responseHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = supabaseServiceClient();

  // Fetch queued emails (max 20 per batch)
  const { data: outboxItems, error: fetchErr } = await supabase
    .from('email_outbox')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .lt('retry_count', 3)
    .order('scheduled_at')
    .limit(20);

  if (fetchErr || !outboxItems?.length) {
    return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let processed = 0;
  const platformResendKey = Deno.env.get('RESEND_API_KEY');

  for (const item of outboxItems) {
    // Mark as processing
    await supabase.from('email_outbox').update({ status: 'processing' }).eq('id', item.id);

    let providerType = 'resend';
    let providerName = 'platform_default';
    let success = false;
    let errorMsg = '';

    try {
      // Try tenant provider first
      let tenantProvider = null;
      if (item.provider_config_id) {
        const { data: cfg } = await supabase
          .from('email_provider_configs')
          .select('*')
          .eq('id', item.provider_config_id)
          .eq('is_active', true)
          .single();
        tenantProvider = cfg;
      } else if (item.company_id) {
        const { data: cfg } = await supabase
          .from('email_provider_configs')
          .select('*')
          .eq('company_id', item.company_id)
          .eq('is_default', true)
          .eq('is_active', true)
          .single();
        tenantProvider = cfg;
      }

      if (tenantProvider?.provider_type === 'resend' && tenantProvider.resend_api_key_encrypted) {
        // Use tenant's Resend key
        providerType = 'resend';
        providerName = tenantProvider.provider_name;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tenantProvider.resend_api_key_encrypted}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: tenantProvider.from_email ? `${tenantProvider.from_name || 'Go-Ads'} <${tenantProvider.from_email}>` : 'Go-Ads 360° <noreply@go-ads.in>',
            to: [item.recipient_to],
            ...(item.recipient_cc ? { cc: item.recipient_cc.split(',') } : {}),
            subject: item.subject_rendered,
            html: item.html_rendered,
            ...(item.text_rendered ? { text: item.text_rendered } : {}),
            reply_to: tenantProvider.reply_to_email || undefined,
          }),
        });
        if (res.ok) { success = true; } else {
          const err = await res.json();
          errorMsg = err.message || `Resend error: ${res.status}`;
        }
      } else if (tenantProvider?.provider_type === 'smtp') {
        // SMTP sending not implemented in Deno edge functions (would need external proxy)
        // Fall through to platform Resend
        errorMsg = 'SMTP direct sending not supported in edge functions, falling back to platform Resend';
      }

      // Fallback to platform Resend
      if (!success && platformResendKey) {
        providerType = 'resend';
        providerName = 'platform_fallback';
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${platformResendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Go-Ads 360° <noreply@go-ads.in>',
            to: [item.recipient_to],
            ...(item.recipient_cc ? { cc: item.recipient_cc.split(',') } : {}),
            subject: item.subject_rendered,
            html: item.html_rendered,
            ...(item.text_rendered ? { text: item.text_rendered } : {}),
          }),
        });
        if (res.ok) { success = true; errorMsg = ''; } else {
          const err = await res.json();
          errorMsg = err.message || `Platform Resend error: ${res.status}`;
        }
      }
    } catch (e: any) {
      errorMsg = e.message || 'Unknown error';
    }

    // Log delivery attempt
    await supabase.from('email_delivery_logs').insert({
      outbox_id: item.id,
      provider_type: providerType,
      provider_name: providerName,
      attempt_no: item.retry_count + 1,
      status: success ? 'success' : 'failed',
      error_message: errorMsg || null,
      response_meta: { success },
    });

    // Update outbox status
    if (success) {
      await supabase.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id);
      processed++;
    } else {
      const newRetry = item.retry_count + 1;
      await supabase.from('email_outbox').update({
        status: newRetry >= 3 ? 'failed' : 'queued',
        retry_count: newRetry,
        last_error: errorMsg,
      }).eq('id', item.id);
    }
  }

  return new Response(JSON.stringify({ processed, total: outboxItems.length }), {
    headers: { ...responseHeaders, 'Content-Type': 'application/json' },
  });
});

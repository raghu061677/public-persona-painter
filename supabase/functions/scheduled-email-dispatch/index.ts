/**
 * scheduled-email-dispatch — Cron-triggered edge function
 * Resolves email_templates by event_key, renders with payload,
 * and queues through the same outbox flow as all other emails.
 *
 * Runs daily at 1:30 AM UTC (7:00 AM IST).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { AuthError, supabaseServiceClient } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

/** Simple {{variable}} renderer — mirrors frontend emailRenderer.ts */
function renderTemplate(template: string, payload: Record<string, string>): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => payload[key] ?? '');
}

/** Resolve a template for an event_key + company, render with payload, return subject+html */
async function resolveAndRender(
  db: ReturnType<typeof createClient>,
  companyId: string,
  eventKey: string,
  payload: Record<string, string>,
): Promise<{ subject: string; html: string; templateKey: string } | null> {
  const { data: template } = await db
    .from('email_templates')
    .select('template_key, subject_template, html_template, html_body, subject')
    .eq('company_id', companyId)
    .or(`trigger_event.eq.${eventKey},template_key.eq.${eventKey}`)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!template) return null;

  const subjectTpl = template.subject_template || template.subject || '';
  const bodyTpl = template.html_template || template.html_body || '';

  return {
    subject: renderTemplate(subjectTpl, payload),
    html: renderTemplate(bodyTpl, payload),
    templateKey: template.template_key,
  };
}

/** Fallback subject/body when no template exists */
function fallback(subject: string, body: string) {
  return { subject, html: body, templateKey: '' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  await req.text(); // consume body

  // Auth: accept X-Cron-Secret header OR pg_cron calls with anon key
  const cronSecret = req.headers.get('X-Cron-Secret');
  const expectedSecret = Deno.env.get('CRON_HMAC_SECRET');
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY') || '';

  const cronSecretValid = cronSecret && expectedSecret && cronSecret === expectedSecret;
  const pgCronValid = authHeader && anonKey && authHeader === anonKey;

  if (!cronSecretValid && !pgCronValid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  
  console.log('[scheduled-email-dispatch] Authorized, running dispatches...');

  const sc = supabaseServiceClient();

  try {
    const { data: companies, error: compErr } = await sc
      .from('companies')
      .select('id, name, email')
      .eq('status', 'active');

    if (compErr) throw compErr;

    const allResults: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const sevenDays = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    for (const company of companies || []) {
      const cr: Record<string, any> = {};
      const cId = company.id;

      // ── 1. Campaign starting tomorrow ──
      try {
        const { data: camps } = await sc
          .from('campaigns')
          .select('id, campaign_name, client_name, start_date, end_date')
          .eq('company_id', cId)
          .eq('start_date', tomorrow)
          .in('status', ['Planned', 'Upcoming', 'Draft']);

        cr.campaign_start_tomorrow = { count: camps?.length || 0 };

        for (const c of camps || []) {
          const payload = {
            company_name: company.name || '',
            campaign_name: c.campaign_name || '',
            campaign_code: c.id,
            client_name: c.client_name || '',
            campaign_start_date: c.start_date || '',
            campaign_end_date: c.end_date || '',
          };
          const rendered = await resolveAndRender(sc, cId, 'campaign_start_tomorrow_internal', payload)
            || fallback(
              `Campaign "${c.campaign_name}" starts tomorrow`,
              `<p>Campaign <strong>${c.campaign_name}</strong> (${c.id}) for ${c.client_name} starts tomorrow (${c.start_date}).</p>`,
            );

          await sc.from('email_outbox').insert({
            company_id: cId,
            event_key: 'campaign_start_tomorrow_internal',
            template_key: rendered.templateKey || null,
            recipient_to: company.email || '',
            subject_rendered: rendered.subject,
            html_rendered: rendered.html,
            payload_json: payload,
            status: 'queued',
            source_id: c.id,
          });
        }
      } catch (e: any) {
        cr.campaign_start_tomorrow = { error: e.message };
      }

      // ── 2. Campaign ending within 7 days ──
      try {
        const { data: camps } = await sc
          .from('campaigns')
          .select('id, campaign_name, client_name, client_id, end_date')
          .eq('company_id', cId)
          .in('status', ['Running', 'InProgress'])
          .lte('end_date', sevenDays)
          .gte('end_date', today);

        cr.campaign_ending_soon = { count: camps?.length || 0 };

        for (const c of camps || []) {
          const payload = {
            company_name: company.name || '',
            campaign_name: c.campaign_name || '',
            campaign_code: c.id,
            client_name: c.client_name || '',
            campaign_end_date: c.end_date || '',
          };

          // Internal alert
          const intRendered = await resolveAndRender(sc, cId, 'campaign_ending_soon_internal', payload)
            || fallback(
              `Campaign "${c.campaign_name}" ending soon (${c.end_date})`,
              `<p>Campaign <strong>${c.campaign_name}</strong> for ${c.client_name} ends on ${c.end_date}.</p>`,
            );

          await sc.from('email_outbox').insert({
            company_id: cId,
            event_key: 'campaign_ending_soon_internal',
            template_key: intRendered.templateKey || null,
            recipient_to: company.email || '',
            subject_rendered: intRendered.subject,
            html_rendered: intRendered.html,
            payload_json: payload,
            status: 'queued',
            source_id: c.id,
          });

          // Client notice
          if (c.client_id) {
            const { data: client } = await sc
              .from('clients').select('email, name').eq('id', c.client_id).single();
            if (client?.email) {
              payload.client_name = client.name || c.client_name || '';
              const clRendered = await resolveAndRender(sc, cId, 'campaign_ending_notice_client', payload)
                || fallback(
                  `Your campaign "${c.campaign_name}" is ending on ${c.end_date}`,
                  `<p>Dear ${client.name}, your campaign <strong>${c.campaign_name}</strong> ends on ${c.end_date}. Please contact us for renewal.</p>`,
                );

              await sc.from('email_outbox').insert({
                company_id: cId,
                event_key: 'campaign_ending_notice_client',
                template_key: clRendered.templateKey || null,
                recipient_to: client.email,
                subject_rendered: clRendered.subject,
                html_rendered: clRendered.html,
                payload_json: payload,
                status: 'queued',
                source_id: c.id,
              });
            }
          }
        }
      } catch (e: any) {
        cr.campaign_ending_soon = { error: e.message };
      }

      // ── 3. Payment reminders & overdue ──
      try {
        const { data: invoices } = await sc
          .from('invoices')
          .select('id, invoice_no, client_id, client_name, due_date, total_amount, balance_due, status')
          .eq('company_id', cId)
          .in('status', ['Sent', 'Overdue'])
          .gt('balance_due', 0);

        let reminderCount = 0;
        let overdueCount = 0;

        for (const inv of invoices || []) {
          if (!inv.due_date) continue;
          const daysUntilDue = Math.ceil((new Date(inv.due_date).getTime() - Date.now()) / 86400000);
          const isOverdue = daysUntilDue < 0;
          if (!isOverdue && daysUntilDue > 7) continue;

          const eventKey = isOverdue ? 'payment_overdue_client' : 'payment_reminder_client';

          if (inv.client_id) {
            const { data: client } = await sc
              .from('clients').select('email').eq('id', inv.client_id).single();
            if (client?.email) {
              const amt = inv.balance_due ? `₹${Number(inv.balance_due).toLocaleString('en-IN')}` : '';
              const payload = {
                company_name: company.name || '',
                client_name: inv.client_name || '',
                invoice_number: inv.invoice_no || inv.id,
                invoice_total: `₹${Number(inv.total_amount || 0).toLocaleString('en-IN')}`,
                balance_due: amt,
                due_date: inv.due_date,
                amount_due: amt,
              };

              const rendered = await resolveAndRender(sc, cId, eventKey, payload)
                || fallback(
                  isOverdue
                    ? `Payment overdue for Invoice ${inv.invoice_no || inv.id}`
                    : `Payment reminder for Invoice ${inv.invoice_no || inv.id}`,
                  `<p>Dear ${inv.client_name}, invoice ${inv.invoice_no || inv.id} has a balance of ${amt} ${isOverdue ? 'which is overdue' : `due on ${inv.due_date}`}.</p>`,
                );

              await sc.from('email_outbox').insert({
                company_id: cId,
                event_key: eventKey,
                template_key: rendered.templateKey || null,
                recipient_to: client.email,
                subject_rendered: rendered.subject,
                html_rendered: rendered.html,
                payload_json: payload,
                status: 'queued',
                source_id: inv.id,
              });
              if (isOverdue) overdueCount++; else reminderCount++;
            }
          }
        }
        cr.payment_reminders = { reminders: reminderCount, overdue: overdueCount };
      } catch (e: any) {
        cr.payment_reminders = { error: e.message };
      }

      // ── 4. Daily digest ──
      try {
        const [
          { count: activeCampaigns },
          { count: pendingInvoices },
          { count: overdueInvoices },
        ] = await Promise.all([
          sc.from('campaigns').select('*', { count: 'exact', head: true })
            .eq('company_id', cId).in('status', ['Running', 'InProgress']),
          sc.from('invoices').select('*', { count: 'exact', head: true })
            .eq('company_id', cId).eq('status', 'Sent'),
          sc.from('invoices').select('*', { count: 'exact', head: true })
            .eq('company_id', cId).eq('status', 'Overdue'),
        ]);

        const payload = {
          company_name: company.name || '',
          active_campaigns: String(activeCampaigns || 0),
          pending_invoices: String(pendingInvoices || 0),
          overdue_invoices: String(overdueInvoices || 0),
          date: new Date().toLocaleDateString('en-IN'),
        };

        const rendered = await resolveAndRender(sc, cId, 'daily_digest_internal', payload)
          || fallback(
            `Go-Ads Daily Digest — ${payload.date}`,
            `<p><strong>Daily Summary for ${company.name}</strong></p>
            <ul>
              <li>Active Campaigns: ${activeCampaigns || 0}</li>
              <li>Pending Invoices: ${pendingInvoices || 0}</li>
              <li>Overdue Invoices: ${overdueInvoices || 0}</li>
            </ul>`,
          );

        await sc.from('email_outbox').insert({
          company_id: cId,
          event_key: 'daily_digest_internal',
          template_key: rendered.templateKey || null,
          recipient_to: company.email || '',
          subject_rendered: rendered.subject,
          html_rendered: rendered.html,
          payload_json: payload,
          status: 'queued',
        });
        cr.daily_digest = { sent: true };
      } catch (e: any) {
        cr.daily_digest = { error: e.message };
      }

      // ── 5. Failed email alerts ──
      try {
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count } = await sc
          .from('email_outbox')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', cId)
          .eq('status', 'failed')
          .gte('created_at', oneHourAgo);

        if (count && count > 0) {
          const payload = {
            company_name: company.name || '',
            failed_count: String(count),
          };

          const rendered = await resolveAndRender(sc, cId, 'failed_email_alert_internal', payload)
            || fallback(
              `⚠️ ${count} email(s) failed in the last hour`,
              `<p>${count} email(s) failed delivery in the last hour for ${company.name}. Please check the Email Outbox.</p>`,
            );

          await sc.from('email_outbox').insert({
            company_id: cId,
            event_key: 'failed_email_alert_internal',
            template_key: rendered.templateKey || null,
            recipient_to: company.email || '',
            subject_rendered: rendered.subject,
            html_rendered: rendered.html,
            payload_json: payload,
            status: 'queued',
          });
          cr.failed_email_alert = { failed_count: count };
        } else {
          cr.failed_email_alert = { skipped: true };
        }
      } catch (e: any) {
        cr.failed_email_alert = { error: e.message };
      }

      allResults[cId] = cr;
    }

    return new Response(JSON.stringify({
      success: true,
      companies_processed: Object.keys(allResults).length,
      results: allResults,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[scheduled-email-dispatch] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

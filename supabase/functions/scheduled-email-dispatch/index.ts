/**
 * scheduled-email-dispatch — Cron-triggered edge function that runs
 * all scheduled email dispatches for every active company.
 *
 * Protected by HMAC (system endpoint, no user JWT).
 * Designed to be called by pg_cron every hour or daily.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireHmac, AuthError, supabaseServiceClient } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rawBody = await req.text();

  // Auth: Accept either HMAC headers OR a simple cron secret (for pg_cron which can't compute HMAC)
  const cronSecret = req.headers.get('X-Cron-Secret');
  const expectedSecret = Deno.env.get('CRON_HMAC_SECRET');

  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    // pg_cron simple secret auth — valid
  } else {
    // Fall back to full HMAC validation
    try {
      await requireHmac(req, rawBody);
    } catch (err) {
      if (err instanceof AuthError) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const serviceClient = supabaseServiceClient();

  try {
    // Get all active companies
    const { data: companies, error: compErr } = await serviceClient
      .from('companies')
      .select('id, name, email')
      .eq('status', 'active');

    if (compErr) throw compErr;

    const allResults: Record<string, any> = {};

    for (const company of companies || []) {
      const companyResults: Record<string, any> = {};

      // 1. Campaign start tomorrow
      try {
        const { data: campaigns } = await serviceClient
          .from('campaigns')
          .select('id, campaign_name, client_name, start_date, end_date')
          .eq('company_id', company.id)
          .eq('start_date', new Date(Date.now() + 86400000).toISOString().split('T')[0])
          .in('status', ['Planned', 'Upcoming', 'Draft']);

        companyResults.campaign_start_tomorrow = { count: campaigns?.length || 0 };

        for (const c of campaigns || []) {
          await serviceClient.from('email_outbox').insert({
            company_id: company.id,
            event_key: 'campaign_start_tomorrow_internal',
            recipient_to: company.email || '',
            subject: `Campaign "${c.campaign_name}" starts tomorrow`,
            html_body: `<p>Campaign <strong>${c.campaign_name}</strong> (${c.id}) for ${c.client_name} starts tomorrow (${c.start_date}).</p>`,
            status: 'queued',
            source_id: c.id,
          });
        }
      } catch (e: any) {
        companyResults.campaign_start_tomorrow = { error: e.message };
      }

      // 2. Campaign ending soon (within 7 days)
      try {
        const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        const { data: campaigns } = await serviceClient
          .from('campaigns')
          .select('id, campaign_name, client_name, client_id, end_date')
          .eq('company_id', company.id)
          .in('status', ['Running', 'InProgress'])
          .lte('end_date', futureDate)
          .gte('end_date', today);

        companyResults.campaign_ending_soon = { count: campaigns?.length || 0 };

        for (const c of campaigns || []) {
          // Internal
          await serviceClient.from('email_outbox').insert({
            company_id: company.id,
            event_key: 'campaign_ending_soon_internal',
            recipient_to: company.email || '',
            subject: `Campaign "${c.campaign_name}" ending soon (${c.end_date})`,
            html_body: `<p>Campaign <strong>${c.campaign_name}</strong> (${c.id}) for ${c.client_name} ends on ${c.end_date}.</p>`,
            status: 'queued',
            source_id: c.id,
          });

          // Client notice
          if (c.client_id) {
            const { data: client } = await serviceClient
              .from('clients').select('email, name').eq('id', c.client_id).single();
            if (client?.email) {
              await serviceClient.from('email_outbox').insert({
                company_id: company.id,
                event_key: 'campaign_ending_notice_client',
                recipient_to: client.email,
                subject: `Your campaign "${c.campaign_name}" is ending on ${c.end_date}`,
                html_body: `<p>Dear ${client.name}, your campaign <strong>${c.campaign_name}</strong> is ending on ${c.end_date}. Please contact us for renewal.</p>`,
                status: 'queued',
                source_id: c.id,
              });
            }
          }
        }
      } catch (e: any) {
        companyResults.campaign_ending_soon = { error: e.message };
      }

      // 3. Payment reminders & overdue
      try {
        const { data: invoices } = await serviceClient
          .from('invoices')
          .select('id, invoice_no, client_id, client_name, due_date, total_amount, balance_due, status')
          .eq('company_id', company.id)
          .in('status', ['Sent', 'Overdue'])
          .gt('balance_due', 0);

        let reminderCount = 0;
        let overdueCount = 0;

        for (const inv of invoices || []) {
          if (!inv.due_date) continue;
          const dueDate = new Date(inv.due_date);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
          const isOverdue = daysUntilDue < 0;

          if (!isOverdue && daysUntilDue > 7) continue;

          const eventKey = isOverdue ? 'payment_overdue_client' : 'payment_reminder_client';

          if (inv.client_id) {
            const { data: client } = await serviceClient
              .from('clients').select('email').eq('id', inv.client_id).single();
            if (client?.email) {
              const amt = inv.balance_due ? `₹${Number(inv.balance_due).toLocaleString('en-IN')}` : '';
              await serviceClient.from('email_outbox').insert({
                company_id: company.id,
                event_key: eventKey,
                recipient_to: client.email,
                subject: isOverdue
                  ? `Payment overdue for Invoice ${inv.invoice_no || inv.id}`
                  : `Payment reminder for Invoice ${inv.invoice_no || inv.id}`,
                html_body: `<p>Dear ${inv.client_name}, invoice ${inv.invoice_no || inv.id} has a balance of ${amt} ${isOverdue ? 'which is overdue' : `due on ${inv.due_date}`}.</p>`,
                status: 'queued',
                source_id: inv.id,
              });
              if (isOverdue) overdueCount++; else reminderCount++;
            }
          }
        }
        companyResults.payment_reminders = { reminders: reminderCount, overdue: overdueCount };
      } catch (e: any) {
        companyResults.payment_reminders = { error: e.message };
      }

      // 4. Daily digest
      try {
        const [
          { count: activeCampaigns },
          { count: pendingInvoices },
          { count: overdueInvoices },
        ] = await Promise.all([
          serviceClient.from('campaigns').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).in('status', ['Running', 'InProgress']),
          serviceClient.from('invoices').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).eq('status', 'Sent'),
          serviceClient.from('invoices').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).eq('status', 'Overdue'),
        ]);

        await serviceClient.from('email_outbox').insert({
          company_id: company.id,
          event_key: 'daily_digest_internal',
          recipient_to: company.email || '',
          subject: `Go-Ads Daily Digest — ${new Date().toLocaleDateString('en-IN')}`,
          html_body: `<p><strong>Daily Summary for ${company.name}</strong></p>
            <ul>
              <li>Active Campaigns: ${activeCampaigns || 0}</li>
              <li>Pending Invoices: ${pendingInvoices || 0}</li>
              <li>Overdue Invoices: ${overdueInvoices || 0}</li>
            </ul>`,
          status: 'queued',
        });
        companyResults.daily_digest = { sent: true };
      } catch (e: any) {
        companyResults.daily_digest = { error: e.message };
      }

      // 5. Failed email alerts
      try {
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count } = await serviceClient
          .from('email_outbox')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'failed')
          .gte('created_at', oneHourAgo);

        if (count && count > 0) {
          await serviceClient.from('email_outbox').insert({
            company_id: company.id,
            event_key: 'failed_email_alert_internal',
            recipient_to: company.email || '',
            subject: `⚠️ ${count} email(s) failed in the last hour`,
            html_body: `<p>${count} email(s) failed delivery in the last hour for ${company.name}. Please check the Email Outbox.</p>`,
            status: 'queued',
          });
          companyResults.failed_email_alert = { failed_count: count };
        } else {
          companyResults.failed_email_alert = { skipped: true };
        }
      } catch (e: any) {
        companyResults.failed_email_alert = { error: e.message };
      }

      allResults[company.id] = companyResults;
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

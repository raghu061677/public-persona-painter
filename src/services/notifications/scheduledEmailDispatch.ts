/**
 * Go-Ads 360° — Scheduled Email Dispatch Service
 * 
 * Service functions for scheduled/cron-triggered email events.
 * These can be called from Edge Functions or UI-triggered batch jobs.
 * All use the central email engine (triggerEmailEvent).
 */

import { supabase } from "@/integrations/supabase/client";
import { triggerEmailEvent, type TriggerEmailOptions } from "./emailSender";
import type { EmailPayload } from "./emailRenderer";
import { format, addDays, differenceInDays, isPast, isFuture } from "date-fns";

interface ScheduledResult {
  event_key: string;
  triggered: number;
  skipped: number;
  errors: string[];
}

/**
 * campaign_start_tomorrow_internal
 * Find campaigns starting tomorrow, notify ops team.
 */
export async function dispatchCampaignStartTomorrow(companyId: string): Promise<ScheduledResult> {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const result: ScheduledResult = { event_key: 'campaign_start_tomorrow_internal', triggered: 0, skipped: 0, errors: [] };

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, campaign_name, client_name, start_date, end_date, company_id')
    .eq('company_id', companyId)
    .eq('start_date', tomorrow)
    .in('status', ['Planned', 'Upcoming', 'Draft']);

  for (const c of campaigns || []) {
    try {
      const payload: EmailPayload = {
        campaign_name: c.campaign_name || '',
        campaign_code: c.id,
        campaign_start_date: c.start_date,
        campaign_end_date: c.end_date,
        client_name: c.client_name || '',
      };

      const { data: company } = await supabase
        .from('companies').select('email').eq('id', companyId).single();

      await triggerEmailEvent({
        event_key: 'campaign_start_tomorrow_internal',
        payload,
        recipients: [{ to: company?.email || '' }],
        company_id: companyId,
        source_id: c.id,
      });
      result.triggered++;
    } catch (e: any) {
      result.errors.push(`${c.id}: ${e.message}`);
    }
  }
  return result;
}

/**
 * campaign_ending_soon_internal + campaign_ending_notice_client
 * Find campaigns ending within N days.
 */
export async function dispatchCampaignEndingSoon(companyId: string, withinDays = 7): Promise<ScheduledResult> {
  const result: ScheduledResult = { event_key: 'campaign_ending_soon_internal', triggered: 0, skipped: 0, errors: [] };
  const futureDate = format(addDays(new Date(), withinDays), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, campaign_name, client_name, client_id, start_date, end_date, company_id')
    .eq('company_id', companyId)
    .in('status', ['Running', 'InProgress'])
    .lte('end_date', futureDate)
    .gte('end_date', today);

  for (const c of campaigns || []) {
    try {
      const daysLeft = differenceInDays(new Date(c.end_date), new Date());
      const payload: EmailPayload = {
        campaign_name: c.campaign_name || '',
        campaign_code: c.id,
        campaign_start_date: c.start_date,
        campaign_end_date: c.end_date,
        campaign_duration_days: String(daysLeft),
        client_name: c.client_name || '',
      };

      const { data: company } = await supabase
        .from('companies').select('email').eq('id', companyId).single();

      // Internal notification
      await triggerEmailEvent({
        event_key: 'campaign_ending_soon_internal',
        payload,
        recipients: [{ to: company?.email || '' }],
        company_id: companyId,
        source_id: c.id,
      });

      // Client notification (will go through confirm mode in template)
      if (c.client_id) {
        const { data: client } = await supabase
          .from('clients').select('email').eq('id', c.client_id).single();
        if (client?.email) {
          await triggerEmailEvent({
            event_key: 'campaign_ending_notice_client',
            payload,
            recipients: [{ to: client.email }],
            company_id: companyId,
            source_id: c.id,
            force_send_mode: 'auto', // scheduled jobs bypass confirm
          });
        }
      }

      result.triggered++;
    } catch (e: any) {
      result.errors.push(`${c.id}: ${e.message}`);
    }
  }
  return result;
}

/**
 * payment_reminder_client + payment_overdue_client
 * Find invoices approaching or past due date.
 */
export async function dispatchPaymentReminders(companyId: string): Promise<ScheduledResult> {
  const result: ScheduledResult = { event_key: 'payment_reminder_client', triggered: 0, skipped: 0, errors: [] };
  const today = new Date();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_no, client_id, client_name, due_date, total_amount, balance_due, status, company_id')
    .eq('company_id', companyId)
    .in('status', ['Sent', 'Overdue'])
    .gt('balance_due', 0);

  for (const inv of invoices || []) {
    try {
      if (!inv.due_date) continue;
      const dueDate = new Date(inv.due_date);
      const daysUntilDue = differenceInDays(dueDate, today);
      const isOverdue = isPast(dueDate);

      // Skip if not within reminder window
      if (!isOverdue && daysUntilDue > 7) { result.skipped++; continue; }

      const eventKey = isOverdue ? 'payment_overdue_client' : 'payment_reminder_client';

      const payload: EmailPayload = {
        invoice_number: inv.invoice_no || inv.id,
        invoice_date: '',
        due_date: inv.due_date,
        invoice_total: inv.total_amount ? `₹${Number(inv.total_amount).toLocaleString('en-IN')}` : '',
        balance_due: inv.balance_due ? `₹${Number(inv.balance_due).toLocaleString('en-IN')}` : '',
        client_name: inv.client_name || '',
      };

      if (inv.client_id) {
        const { data: client } = await supabase
          .from('clients').select('email').eq('id', inv.client_id).single();
        if (client?.email) {
          await triggerEmailEvent({
            event_key: eventKey,
            payload,
            recipients: [{ to: client.email }],
            company_id: companyId,
            source_id: inv.id,
            force_send_mode: 'auto', // scheduled reminders bypass confirm
          });
          result.triggered++;
        }
      }
    } catch (e: any) {
      result.errors.push(`${inv.id}: ${e.message}`);
    }
  }
  return result;
}

/**
 * daily_digest_internal
 * Aggregate today's KPIs and send summary to admins.
 */
export async function dispatchDailyDigest(companyId: string): Promise<ScheduledResult> {
  const result: ScheduledResult = { event_key: 'daily_digest_internal', triggered: 0, skipped: 0, errors: [] };

  try {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Gather KPIs
    const [
      { count: activeCampaigns },
      { count: pendingInvoices },
      { count: overdueInvoices },
    ] = await Promise.all([
      supabase.from('campaigns').select('*', { count: 'exact', head: true })
        .eq('company_id', companyId).in('status', ['Running', 'InProgress']),
      supabase.from('invoices').select('*', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('status', 'Sent'),
      supabase.from('invoices').select('*', { count: 'exact', head: true })
        .eq('company_id', companyId).eq('status', 'Overdue'),
    ]);

    const payload: EmailPayload = {
      company_name: '',
      campaign_name: `Active: ${activeCampaigns || 0}`,
      invoice_number: `Pending: ${pendingInvoices || 0} | Overdue: ${overdueInvoices || 0}`,
      asset_summary_html: `
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Active Campaigns</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${activeCampaigns || 0}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Pending Invoices</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${pendingInvoices || 0}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;"><strong>Overdue Invoices</strong></td><td style="padding:8px;border:1px solid #e2e8f0;">${overdueInvoices || 0}</td></tr>
        </table>`,
    };

    const { data: company } = await supabase
      .from('companies').select('email, name').eq('id', companyId).single();
    payload.company_name = company?.name || '';

    await triggerEmailEvent({
      event_key: 'daily_digest_internal',
      payload,
      recipients: [{ to: company?.email || '' }],
      company_id: companyId,
    });
    result.triggered++;
  } catch (e: any) {
    result.errors.push(e.message);
  }
  return result;
}

/**
 * failed_email_alert_internal
 * Check for recently failed emails and alert admins.
 */
export async function dispatchFailedEmailAlert(companyId: string): Promise<ScheduledResult> {
  const result: ScheduledResult = { event_key: 'failed_email_alert_internal', triggered: 0, skipped: 0, errors: [] };

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: failedEmails, count } = await supabase
      .from('email_outbox' as any)
      .select('id, event_key, recipient_to, last_error', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('status', 'failed')
      .gte('created_at', oneHourAgo)
      .limit(10);

    if (!count || count === 0) { result.skipped++; return result; }

    const failedList = (failedEmails as any[] || [])
      .map((e: any) => `• ${e.event_key} → ${e.recipient_to}: ${e.last_error || 'unknown'}`)
      .join('<br/>');

    const payload: EmailPayload = {
      asset_summary_html: `<p><strong>${count} email(s) failed in the last hour:</strong></p><p>${failedList}</p>`,
    };

    const { data: company } = await supabase
      .from('companies').select('email').eq('id', companyId).single();

    await triggerEmailEvent({
      event_key: 'failed_email_alert_internal',
      payload,
      recipients: [{ to: company?.email || '' }],
      company_id: companyId,
    });
    result.triggered++;
  } catch (e: any) {
    result.errors.push(e.message);
  }
  return result;
}

/**
 * Run all scheduled dispatches for a company.
 * Designed to be called from an Edge Function cron job.
 */
export async function runAllScheduledDispatches(companyId: string) {
  const results = await Promise.allSettled([
    dispatchCampaignStartTomorrow(companyId),
    dispatchCampaignEndingSoon(companyId),
    dispatchPaymentReminders(companyId),
    dispatchDailyDigest(companyId),
    dispatchFailedEmailAlert(companyId),
  ]);

  return results.map((r, i) => {
    const labels = ['campaign_start_tomorrow', 'campaign_ending_soon', 'payment_reminders', 'daily_digest', 'failed_email_alert'];
    return {
      dispatch: labels[i],
      status: r.status,
      data: r.status === 'fulfilled' ? r.value : undefined,
      error: r.status === 'rejected' ? r.reason?.message : undefined,
    };
  });
}

/**
 * send-plan-reminders — Phase-6 Hardened
 * This is a cron/system endpoint — requires HMAC validation.
 * It sends reminders for pending approvals and expiring quotations.
 * Service role is justified because it runs without a user session.
 */
import { withHmac } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(withHmac(async (_req, rawBody) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log('[send-plan-reminders] HMAC validated, running reminders...');

  // Get active reminder settings
  const { data: reminderSettings, error: settingsError } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('is_active', true);

  if (settingsError) throw settingsError;

  let totalSent = 0;

  for (const setting of reminderSettings || []) {
    if (setting.reminder_type === 'pending_approval') {
      totalSent += await sendPendingApprovalReminders(supabase, setting);
    } else if (setting.reminder_type === 'expiring_quotation') {
      totalSent += await sendExpiringQuotationReminders(supabase, setting);
    }
  }

  console.log(`[send-plan-reminders] Total reminders sent: ${totalSent}`);

  return new Response(
    JSON.stringify({ success: true, message: 'Reminders processed', totalSent }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

async function sendPendingApprovalReminders(supabase: any, setting: any): Promise<number> {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - setting.days_before);

  const { data: pendingApprovals, error } = await supabase
    .from('plan_approvals')
    .select('*, plans(*)')
    .eq('status', 'pending')
    .lt('created_at', daysAgo.toISOString());

  if (error) { console.error('Error fetching pending approvals:', error); return 0; }

  let sent = 0;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) { console.error('RESEND_API_KEY not configured'); return 0; }

  for (const approval of pendingApprovals || []) {
    // Get company users with required role (scoped to plan's company)
    const planCompanyId = approval.plans?.company_id;
    if (!planCompanyId) continue;

    const { data: approvers } = await supabase
      .from('company_users')
      .select('email')
      .eq('company_id', planCompanyId)
      .eq('role', approval.required_role || 'admin')
      .eq('status', 'active');

    for (const approver of approvers || []) {
      if (!approver.email) continue;
      const emailContent = (setting.email_template || 'Plan {{plan_name}} ({{plan_id}}) for {{client_name}} needs your approval.')
        .replace('{{plan_name}}', approval.plans?.plan_name || '')
        .replace('{{plan_id}}', approval.plans?.id || '')
        .replace('{{client_name}}', approval.plans?.client_name || '');

      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Go-Ads 360° <notifications@resend.dev>',
            to: approver.email,
            subject: 'Reminder: Pending Plan Approval',
            html: `<p>${emailContent}</p>`,
          }),
        });
        sent++;
      } catch (e) { console.error('Email error:', e); }
    }
  }
  return sent;
}

async function sendExpiringQuotationReminders(supabase: any, setting: any): Promise<number> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + setting.days_before);

  const { data: expiringPlans, error } = await supabase
    .from('plans')
    .select('id, plan_name, client_name, end_date, created_by, company_id')
    .eq('plan_type', 'Quotation')
    .eq('status', 'Sent')
    .lte('end_date', futureDate.toISOString())
    .gte('end_date', new Date().toISOString());

  if (error) { console.error('Error fetching expiring quotations:', error); return 0; }

  let sent = 0;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return 0;

  for (const plan of expiringPlans || []) {
    // Get creator's email from company_users
    const { data: creator } = await supabase
      .from('company_users')
      .select('email')
      .eq('user_id', plan.created_by)
      .eq('company_id', plan.company_id)
      .eq('status', 'active')
      .single();

    if (!creator?.email) continue;

    const daysRemaining = Math.ceil((new Date(plan.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const emailContent = (setting.email_template || 'Quotation {{plan_id}} for {{client_name}} expires in {{days}} days.')
      .replace('{{plan_id}}', plan.id)
      .replace('{{client_name}}', plan.client_name || '')
      .replace('{{days}}', String(daysRemaining));

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Go-Ads 360° <notifications@resend.dev>',
          to: creator.email,
          subject: 'Reminder: Quotation Expiring Soon',
          html: `<p>${emailContent}</p>`,
        }),
      });
      sent++;
    } catch (e) { console.error('Email error:', e); }
  }
  return sent;
}

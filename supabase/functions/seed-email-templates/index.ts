/**
 * seed-email-templates — Seeds default email templates for all active companies.
 * Called once manually or on demand. Uses service role key auth.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WRAPPER = (content: string) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: #1e40af; padding: 24px 32px;">
    <h1 style="color: #ffffff; font-size: 20px; margin: 0;">Go-Ads 360°</h1>
  </div>
  <div style="padding: 32px;">
    ${content}
  </div>
  <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">Automated notification from {{company_name}} via Go-Ads 360°</p>
  </div>
</div>`;

const DEFAULT_TEMPLATES = [
  {
    template_key: 'campaign_created_internal',
    template_name: 'Campaign Created (Internal)',
    category: 'campaign', audience: 'internal',
    trigger_event: 'campaign_created_internal', send_mode: 'auto',
    description: 'Notify internal team of new campaign',
    subject_template: 'New Campaign: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`<h2 style="color:#1e293b;margin-top:0;">New Campaign Created</h2><p style="color:#475569;">A new campaign has been created.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;width:140px;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_code}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Client</td><td style="padding:8px 0;">{{client_company}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Period</td><td style="padding:8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr></table>`),
  },
  {
    template_key: 'campaign_confirmed_client',
    template_name: 'Campaign Confirmed (Client)',
    category: 'campaign', audience: 'client',
    trigger_event: 'campaign_confirmed_client', send_mode: 'confirm',
    description: 'Send campaign confirmation to client',
    subject_template: 'Campaign Confirmed: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`<h2 style="color:#10b981;margin-top:0;">Campaign Confirmed</h2><p style="color:#475569;">Dear {{client_name}},</p><p style="color:#475569;">Your outdoor advertising campaign has been confirmed.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_name}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Period</td><td style="padding:8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr></table>`),
  },
  {
    template_key: 'campaign_ending_soon_internal',
    template_name: 'Campaign Ending Soon (Internal)',
    category: 'campaign', audience: 'internal',
    trigger_event: 'campaign_ending_soon_internal', send_mode: 'auto',
    description: 'Alert internal team about campaign nearing end',
    subject_template: '⚠️ Campaign Ending Soon: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`<h2 style="color:#f59e0b;margin-top:0;">Campaign Ending Soon</h2><p style="color:#475569;">The following campaign is ending soon. Please plan accordingly.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_code}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Client</td><td style="padding:8px 0;">{{client_company}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">End Date</td><td style="padding:8px 0;font-weight:600;color:#f59e0b;">{{campaign_end_date}}</td></tr></table>`),
  },
  {
    template_key: 'campaign_ending_notice_client',
    template_name: 'Campaign Ending Notice (Client)',
    category: 'campaign', audience: 'client',
    trigger_event: 'campaign_ending_notice_client', send_mode: 'confirm',
    description: 'Notify client that campaign is ending soon',
    subject_template: 'Campaign Ending Soon: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`<h2 style="color:#f59e0b;margin-top:0;">Campaign Ending Notice</h2><p style="color:#475569;">Dear {{client_name}},</p><p style="color:#475569;">Your campaign is ending soon. Contact us to discuss renewal.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_name}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">End Date</td><td style="padding:8px 0;font-weight:600;color:#f59e0b;">{{campaign_end_date}}</td></tr></table>`),
  },
  {
    template_key: 'campaign_completed_internal',
    template_name: 'Campaign Completed (Internal)',
    category: 'campaign', audience: 'internal',
    trigger_event: 'campaign_completed_internal', send_mode: 'auto',
    description: 'Notify team of campaign completion',
    subject_template: '✅ Campaign Completed: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`<h2 style="color:#10b981;margin-top:0;">Campaign Completed</h2><p style="color:#475569;">The following campaign has been completed successfully.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_code}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Client</td><td style="padding:8px 0;">{{client_company}}</td></tr></table>`),
  },
  {
    template_key: 'campaign_completed_client',
    template_name: 'Campaign Completed (Client)',
    category: 'campaign', audience: 'client',
    trigger_event: 'campaign_completed_client', send_mode: 'confirm',
    description: 'Send campaign completion report to client',
    subject_template: 'Campaign Completed: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`<h2 style="color:#10b981;margin-top:0;">Campaign Completed</h2><p style="color:#475569;">Dear {{client_name}},</p><p style="color:#475569;">Your campaign has been successfully completed. Thank you for choosing {{company_name}}.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Campaign</td><td style="padding:8px 0;font-weight:600;">{{campaign_name}}</td></tr></table>`),
  },
  {
    template_key: 'plan_created_internal',
    template_name: 'Plan Created (Internal)',
    category: 'plan', audience: 'internal',
    trigger_event: 'plan_created_internal', send_mode: 'auto',
    description: 'Internal notification when a new plan is created',
    subject_template: 'New Plan Created: {{plan_code}} — {{plan_name}}',
    html_template: WRAPPER(`<h2 style="color:#1e293b;margin-top:0;">New Plan Created</h2><p style="color:#475569;">A new media plan has been created and is ready for review.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Plan Code</td><td style="padding:8px 0;font-weight:600;">{{plan_code}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Client</td><td style="padding:8px 0;">{{client_company}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Total</td><td style="padding:8px 0;font-weight:600;">{{plan_total}}</td></tr></table>`),
  },
  {
    template_key: 'invoice_created_internal',
    template_name: 'Invoice Created (Internal)',
    category: 'finance', audience: 'internal',
    trigger_event: 'invoice_created_internal', send_mode: 'auto',
    description: 'Notify finance team of new invoice',
    subject_template: 'New Invoice: {{invoice_number}} — {{client_company}}',
    html_template: WRAPPER(`<h2 style="color:#1e293b;margin-top:0;">Invoice Created</h2><p style="color:#475569;">A new invoice has been generated.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Invoice</td><td style="padding:8px 0;font-weight:600;">{{invoice_number}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Client</td><td style="padding:8px 0;">{{client_company}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:600;">₹{{invoice_total}}</td></tr></table>`),
  },
  {
    template_key: 'payment_overdue_internal',
    template_name: 'Payment Overdue (Internal)',
    category: 'finance', audience: 'internal',
    trigger_event: 'payment_overdue_internal', send_mode: 'auto',
    description: 'Alert finance about overdue payments',
    subject_template: '🔴 Payment Overdue: {{invoice_number}} — {{client_company}}',
    html_template: WRAPPER(`<h2 style="color:#ef4444;margin-top:0;">Payment Overdue</h2><p style="color:#475569;">The following invoice is overdue and requires immediate follow-up.</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Invoice</td><td style="padding:8px 0;font-weight:600;">{{invoice_number}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Client</td><td style="padding:8px 0;">{{client_company}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Outstanding</td><td style="padding:8px 0;font-weight:600;color:#ef4444;">₹{{outstanding_amount}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Due Date</td><td style="padding:8px 0;">{{due_date}}</td></tr></table>`),
  },
  {
    template_key: 'payment_reminder_client',
    template_name: 'Payment Reminder (Client)',
    category: 'finance', audience: 'client',
    trigger_event: 'payment_reminder_client', send_mode: 'confirm',
    description: 'Send payment reminder to client',
    subject_template: 'Payment Reminder: {{invoice_number}} | {{company_name}}',
    html_template: WRAPPER(`<h2 style="color:#f59e0b;margin-top:0;">Payment Reminder</h2><p style="color:#475569;">Dear {{client_name}},</p><p style="color:#475569;">This is a friendly reminder regarding the pending payment for the following invoice:</p><table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:8px 0;color:#64748b;">Invoice</td><td style="padding:8px 0;font-weight:600;">{{invoice_number}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Amount Due</td><td style="padding:8px 0;font-weight:600;color:#f59e0b;">₹{{outstanding_amount}}</td></tr><tr><td style="padding:8px 0;color:#64748b;">Due Date</td><td style="padding:8px 0;">{{due_date}}</td></tr></table>`),
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth: require service role key
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || !serviceKey || authHeader.replace('Bearer ', '') !== serviceKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  // Get all active companies
  const { data: companies } = await supabase.from('companies').select('id, name').eq('status', 'active');
  if (!companies?.length) {
    return new Response(JSON.stringify({ message: 'No active companies' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let totalSeeded = 0;

  for (const company of companies) {
    // Get existing templates for this company
    const { data: existing } = await supabase
      .from('email_templates')
      .select('template_key')
      .eq('company_id', company.id);

    const existingKeys = new Set((existing || []).map((t: any) => t.template_key));

    const toInsert = DEFAULT_TEMPLATES
      .filter(t => !existingKeys.has(t.template_key))
      .map(t => ({
        company_id: company.id,
        template_key: t.template_key,
        template_name: t.template_name,
        category: t.category,
        audience: t.audience,
        trigger_event: t.trigger_event,
        send_mode: t.send_mode,
        description: t.description,
        subject_template: t.subject_template,
        html_template: t.html_template,
        text_template: null,
        is_active: true,
        is_system: true,
        channel: 'email',
        version: 1,
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('email_templates').insert(toInsert);
      if (error) {
        console.error(`Error seeding for ${company.name}:`, error.message);
      } else {
        totalSeeded += toInsert.length;
        console.log(`Seeded ${toInsert.length} templates for ${company.name}`);
      }
    }
  }

  return new Response(JSON.stringify({ success: true, totalSeeded, companies: companies.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

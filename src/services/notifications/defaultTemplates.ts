/**
 * Go-Ads 360° — Default Email Templates for all notification events.
 * Professional OOH media business templates.
 */

interface DefaultTemplate {
  template_key: string;
  template_name: string;
  category: string;
  audience: string;
  trigger_event: string;
  send_mode: string;
  description: string;
  subject_template: string;
  html_template: string;
}

const WRAPPER = (content: string) => `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  <div style="background: #1e40af; padding: 24px 32px;">
    <h1 style="color: #ffffff; font-size: 20px; margin: 0;">Go-Ads 360°</h1>
  </div>
  <div style="padding: 32px;">
    ${content}
  </div>
  <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from {{company_name}} via Go-Ads 360°</p>
  </div>
</div>`;

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ── PLAN TEMPLATES ──
  {
    template_key: 'plan_created_internal',
    template_name: 'Plan Created (Internal)',
    category: 'plan',
    audience: 'internal',
    trigger_event: 'plan_created_internal',
    send_mode: 'auto',
    description: 'Internal notification when a new plan is created',
    subject_template: 'New Plan Created: {{plan_code}} — {{plan_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">New Plan Created</h2>
      <p style="color: #475569;">A new media plan has been created and is ready for review.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Plan Code</td><td style="padding: 8px 0; font-weight: 600;">{{plan_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Plan Name</td><td style="padding: 8px 0;">{{plan_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Total Amount</td><td style="padding: 8px 0; font-weight: 600;">{{plan_total}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
      </table>
      <h3 style="color: #1e293b; margin: 24px 0 8px;">Asset Details ({{asset_count}} assets)</h3>
      {{asset_table_html}}
      <a href="{{plan_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Plan</a>
    `),
  },
  {
    template_key: 'plan_approval_requested_internal',
    template_name: 'Plan Approval Requested',
    category: 'plan',
    audience: 'internal',
    trigger_event: 'plan_approval_requested_internal',
    send_mode: 'auto',
    description: 'Notify approvers when a plan needs approval',
    subject_template: 'Approval Required: Plan {{plan_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">Plan Approval Requested</h2>
      <p style="color: #475569;">A media plan requires your approval before it can proceed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Plan</td><td style="padding: 8px 0; font-weight: 600;">{{plan_code}} — {{plan_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Total</td><td style="padding: 8px 0; font-weight: 600;">{{plan_total}}</td></tr>
      </table>
      <a href="{{plan_link}}" style="display: inline-block; background: #f59e0b; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Review & Approve</a>
    `),
  },
  {
    template_key: 'plan_approved_internal',
    template_name: 'Plan Approved',
    category: 'plan',
    audience: 'internal',
    trigger_event: 'plan_approved_internal',
    send_mode: 'auto',
    description: 'Notify team when a plan is approved',
    subject_template: '✅ Plan Approved: {{plan_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Plan Approved</h2>
      <p style="color: #475569;">The following plan has been approved and is ready for conversion to a campaign.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Plan</td><td style="padding: 8px 0; font-weight: 600;">{{plan_code}} — {{plan_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Total</td><td style="padding: 8px 0;">{{plan_total}}</td></tr>
      </table>
      <a href="{{plan_link}}" style="display: inline-block; background: #10b981; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Plan</a>
    `),
  },
  {
    template_key: 'plan_rejected_internal',
    template_name: 'Plan Rejected',
    category: 'plan',
    audience: 'internal',
    trigger_event: 'plan_rejected_internal',
    send_mode: 'auto',
    description: 'Notify sales team when a plan is rejected',
    subject_template: '❌ Plan Rejected: {{plan_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #ef4444; margin-top: 0;">Plan Rejected</h2>
      <p style="color: #475569;">The following plan has been rejected. Please review and revise.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Plan</td><td style="padding: 8px 0; font-weight: 600;">{{plan_code}} — {{plan_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
      </table>
      <a href="{{plan_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Plan</a>
    `),
  },
  {
    template_key: 'plan_shared_client',
    template_name: 'Plan Shared with Client',
    category: 'plan',
    audience: 'client',
    trigger_event: 'plan_shared_client',
    send_mode: 'confirm',
    description: 'Send media plan/quotation to client for review',
    subject_template: 'Media Plan for Your Review: {{plan_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">Your Media Plan is Ready</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">Please find below the media plan prepared by {{company_name}} for your review and approval.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Plan</td><td style="padding: 8px 0; font-weight: 600;">{{plan_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Reference</td><td style="padding: 8px 0;">{{plan_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Total Investment</td><td style="padding: 8px 0; font-weight: 600; font-size: 18px; color: #1e40af;">{{plan_total}}</td></tr>
      </table>
      {{asset_table_html}}
      <a href="{{plan_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Full Plan</a>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">For any queries, please contact us at {{company_email}} or {{company_phone}}.</p>
    `),
  },
  {
    template_key: 'plan_converted_to_campaign_internal',
    template_name: 'Plan Converted to Campaign',
    category: 'plan',
    audience: 'internal',
    trigger_event: 'plan_converted_to_campaign_internal',
    send_mode: 'auto',
    description: 'Notify team when a plan is converted to a live campaign',
    subject_template: '🚀 Plan Converted to Campaign: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e40af; margin-top: 0;">Plan Converted to Campaign</h2>
      <p style="color: #475569;">A plan has been successfully converted into a campaign. Operations can now begin.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_code}} — {{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">From Plan</td><td style="padding: 8px 0;">{{plan_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
      </table>
      <a href="{{campaign_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Campaign</a>
    `),
  },

  // ── CAMPAIGN TEMPLATES ──
  {
    template_key: 'campaign_created_internal',
    template_name: 'Campaign Created (Internal)',
    category: 'campaign',
    audience: 'internal',
    trigger_event: 'campaign_created_internal',
    send_mode: 'auto',
    description: 'Notify internal team of new campaign',
    subject_template: 'New Campaign: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">New Campaign Created</h2>
      <p style="color: #475569;">A new campaign has been created and is ready for operations setup.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Name</td><td style="padding: 8px 0;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
      </table>
      <a href="{{campaign_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Campaign</a>
    `),
  },
  {
    template_key: 'campaign_confirmed_client',
    template_name: 'Campaign Confirmed (Client)',
    category: 'campaign',
    audience: 'client',
    trigger_event: 'campaign_confirmed_client',
    send_mode: 'confirm',
    description: 'Send campaign confirmation to client',
    subject_template: 'Campaign Confirmed: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Campaign Confirmed</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">We are pleased to confirm your outdoor advertising campaign. Below are the details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Reference</td><td style="padding: 8px 0;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Start Date</td><td style="padding: 8px 0;">{{campaign_start_date}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">End Date</td><td style="padding: 8px 0;">{{campaign_end_date}}</td></tr>
      </table>
      {{asset_table_html}}
      <p style="color: #475569;">Our operations team will begin installations shortly. You will receive proof of installation photos once completed.</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">View on Portal</a>
    `),
  },
  {
    template_key: 'campaign_start_tomorrow_internal',
    template_name: 'Campaign Starting Tomorrow',
    category: 'campaign',
    audience: 'internal',
    trigger_event: 'campaign_start_tomorrow_internal',
    send_mode: 'auto',
    description: 'Remind ops team about campaign starting next day',
    subject_template: '⏰ Campaign Starting Tomorrow: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #f59e0b; margin-top: 0;">Campaign Starting Tomorrow</h2>
      <p style="color: #475569;">The following campaign is scheduled to start tomorrow. Please ensure all installations are ready.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_code}} — {{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Start Date</td><td style="padding: 8px 0; font-weight: 600; color: #f59e0b;">{{campaign_start_date}}</td></tr>
      </table>
      {{asset_summary_html}}
    `),
  },
  {
    template_key: 'campaign_live_client',
    template_name: 'Campaign Live (Client)',
    category: 'campaign',
    audience: 'client',
    trigger_event: 'campaign_live_client',
    send_mode: 'confirm',
    description: 'Notify client that campaign is now live',
    subject_template: '🟢 Your Campaign is Live: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Your Campaign is Now Live!</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">We are excited to inform you that your outdoor advertising campaign is now live and active.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
      </table>
      <p style="color: #475569;">You can view proof of installation photos and track your campaign progress on the client portal:</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Campaign</a>
    `),
  },
  {
    template_key: 'campaign_ending_soon_internal',
    template_name: 'Campaign Ending Soon (Internal)',
    category: 'campaign',
    audience: 'internal',
    trigger_event: 'campaign_ending_soon_internal',
    send_mode: 'auto',
    description: 'Alert internal team about campaign nearing end',
    subject_template: '⚠️ Campaign Ending Soon: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #f59e0b; margin-top: 0;">Campaign Ending Soon</h2>
      <p style="color: #475569;">The following campaign is nearing its end date. Plan for unmounting or renewal.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_code}} — {{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">End Date</td><td style="padding: 8px 0; font-weight: 600; color: #f59e0b;">{{campaign_end_date}}</td></tr>
      </table>
    `),
  },
  {
    template_key: 'campaign_ending_notice_client',
    template_name: 'Campaign Ending Notice (Client)',
    category: 'campaign',
    audience: 'client',
    trigger_event: 'campaign_ending_notice_client',
    send_mode: 'confirm',
    description: 'Notify client that campaign is ending soon',
    subject_template: 'Campaign Ending Soon: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #f59e0b; margin-top: 0;">Campaign Ending Notice</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">This is to inform you that your campaign is approaching its end date.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">End Date</td><td style="padding: 8px 0; font-weight: 600; color: #f59e0b;">{{campaign_end_date}}</td></tr>
      </table>
      <p style="color: #475569;">If you would like to renew or extend this campaign, please contact us at your earliest convenience.</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Contact Us</a>
    `),
  },
  {
    template_key: 'campaign_completed_internal',
    template_name: 'Campaign Completed (Internal)',
    category: 'campaign',
    audience: 'internal',
    trigger_event: 'campaign_completed_internal',
    send_mode: 'auto',
    description: 'Notify team of campaign completion',
    subject_template: '✅ Campaign Completed: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Campaign Completed</h2>
      <p style="color: #475569;">The following campaign has been marked as completed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_code}} — {{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
      </table>
      {{asset_summary_html}}
    `),
  },
  {
    template_key: 'campaign_completed_client',
    template_name: 'Campaign Completed (Client)',
    category: 'campaign',
    audience: 'client',
    trigger_event: 'campaign_completed_client',
    send_mode: 'confirm',
    description: 'Send campaign completion report to client',
    subject_template: 'Campaign Completed: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Campaign Successfully Completed</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">We are pleased to inform you that your outdoor advertising campaign has been completed successfully.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Period</td><td style="padding: 8px 0;">{{campaign_start_date}} – {{campaign_end_date}}</td></tr>
      </table>
      {{proof_table_html}}
      <p style="color: #475569;">You can download your proof of performance report from the client portal.</p>
      <a href="{{proof_gallery_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Proof Gallery</a>
      <p style="color: #475569; margin-top: 16px;">Thank you for choosing {{company_name}}. We look forward to working with you again!</p>
    `),
  },

  // ── OPERATIONS TEMPLATES ──
  {
    template_key: 'campaign_assigned_to_operations_internal',
    template_name: 'Campaign Assigned to Operations',
    category: 'operations',
    audience: 'internal',
    trigger_event: 'campaign_assigned_to_operations_internal',
    send_mode: 'auto',
    description: 'Notify ops team of new campaign assignment',
    subject_template: '📋 New Operations Assignment: {{campaign_code}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e40af; margin-top: 0;">New Operations Assignment</h2>
      <p style="color: #475569;">A campaign has been assigned to operations for mounting and installation.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_code}} — {{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Start Date</td><td style="padding: 8px 0;">{{campaign_start_date}}</td></tr>
      </table>
      {{asset_table_html}}
      <a href="{{campaign_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Operations</a>
    `),
  },
  {
    template_key: 'asset_assigned_to_mounter_internal',
    template_name: 'Asset Assigned to Mounter',
    category: 'operations',
    audience: 'internal',
    trigger_event: 'asset_assigned_to_mounter_internal',
    send_mode: 'auto',
    description: 'Notify mounter of new installation assignment',
    subject_template: '🔧 Installation Assignment: {{asset_code}} — {{asset_location}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">New Installation Assignment</h2>
      <p style="color: #475569;">You have been assigned a new installation task.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Asset</td><td style="padding: 8px 0; font-weight: 600;">{{asset_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Location</td><td style="padding: 8px 0;">{{asset_location}}, {{asset_city}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Media Type</td><td style="padding: 8px 0;">{{media_type}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
      </table>
    `),
  },
  {
    template_key: 'installation_completed_internal',
    template_name: 'Installation Completed (Internal)',
    category: 'operations',
    audience: 'internal',
    trigger_event: 'installation_completed_internal',
    send_mode: 'auto',
    description: 'Notify team when installation is complete',
    subject_template: '✅ Installation Complete: {{asset_code}} — {{campaign_code}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Installation Completed</h2>
      <p style="color: #475569;">An asset installation has been marked as completed.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Asset</td><td style="padding: 8px 0; font-weight: 600;">{{asset_code}} — {{asset_location}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Installed By</td><td style="padding: 8px 0;">{{assigned_to}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Photos</td><td style="padding: 8px 0;">{{photo_count}} uploaded</td></tr>
      </table>
    `),
  },
  {
    template_key: 'installation_completed_client',
    template_name: 'Installation Completed (Client)',
    category: 'operations',
    audience: 'client',
    trigger_event: 'installation_completed_client',
    send_mode: 'confirm',
    description: 'Notify client of asset installation',
    subject_template: 'Installation Update: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Installation Update</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">We are pleased to inform you that an asset has been successfully installed for your campaign.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Asset</td><td style="padding: 8px 0; font-weight: 600;">{{asset_code}} — {{asset_location}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Installed On</td><td style="padding: 8px 0;">{{installation_date}}</td></tr>
      </table>
      <a href="{{proof_gallery_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Proof Photos</a>
    `),
  },
  {
    template_key: 'proof_uploaded_internal',
    template_name: 'Proof Photos Uploaded',
    category: 'operations',
    audience: 'internal',
    trigger_event: 'proof_uploaded_internal',
    send_mode: 'auto',
    description: 'Notify team when proof photos are uploaded',
    subject_template: '📸 Proof Uploaded: {{asset_code}} — {{campaign_code}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">Proof Photos Uploaded</h2>
      <p style="color: #475569;">Proof of installation photos have been uploaded and are ready for verification.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Asset</td><td style="padding: 8px 0; font-weight: 600;">{{asset_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Location</td><td style="padding: 8px 0;">{{asset_location}}, {{asset_city}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Photos</td><td style="padding: 8px 0;">{{photo_count}} photos uploaded</td></tr>
      </table>
    `),
  },
  {
    template_key: 'proof_verified_internal',
    template_name: 'Proof Verified (Internal)',
    category: 'operations',
    audience: 'internal',
    trigger_event: 'proof_verified_internal',
    send_mode: 'auto',
    description: 'Notify team when proof is verified/approved',
    subject_template: '✅ Proof Verified: {{asset_code}} — {{campaign_code}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Proof Verified</h2>
      <p style="color: #475569;">Installation proof has been verified and approved.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Asset</td><td style="padding: 8px 0; font-weight: 600;">{{asset_code}} — {{asset_location}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Verified At</td><td style="padding: 8px 0;">{{proof_verified_at}}</td></tr>
      </table>
    `),
  },
  {
    template_key: 'proof_verified_client',
    template_name: 'Proof Verified & Shared (Client)',
    category: 'operations',
    audience: 'client',
    trigger_event: 'proof_verified_client',
    send_mode: 'confirm',
    description: 'Share verified proof with client',
    subject_template: 'Proof of Installation: {{campaign_name}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Proof of Installation</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">Installation proof photos for your campaign have been verified and are ready for your review.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Asset</td><td style="padding: 8px 0;">{{asset_code}} — {{asset_location}}</td></tr>
      </table>
      {{proof_table_html}}
      <a href="{{proof_gallery_link}}" style="display: inline-block; background: #10b981; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Proof Gallery</a>
    `),
  },
  {
    template_key: 'proof_rejected_internal',
    template_name: 'Proof Rejected',
    category: 'operations',
    audience: 'internal',
    trigger_event: 'proof_rejected_internal',
    send_mode: 'auto',
    description: 'Notify team when proof is rejected and rework needed',
    subject_template: '❌ Proof Rejected: {{asset_code}} — Rework Required',
    html_template: WRAPPER(`
      <h2 style="color: #ef4444; margin-top: 0;">Proof Rejected — Rework Required</h2>
      <p style="color: #475569;">Installation proof has been rejected. Please re-upload compliant photos.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Asset</td><td style="padding: 8px 0; font-weight: 600;">{{asset_code}} — {{asset_location}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0;">{{campaign_code}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Assigned To</td><td style="padding: 8px 0;">{{assigned_to}}</td></tr>
      </table>
    `),
  },

  // ── FINANCE TEMPLATES ──
  {
    template_key: 'invoice_generated_internal',
    template_name: 'Invoice Generated (Internal)',
    category: 'finance',
    audience: 'internal',
    trigger_event: 'invoice_generated_internal',
    send_mode: 'auto',
    description: 'Notify finance team of new invoice',
    subject_template: '💰 Invoice Generated: {{invoice_number}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">Invoice Generated</h2>
      <p style="color: #475569;">A new invoice has been generated.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Invoice</td><td style="padding: 8px 0; font-weight: 600;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Amount</td><td style="padding: 8px 0; font-weight: 600;">{{invoice_total}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Due Date</td><td style="padding: 8px 0;">{{due_date}}</td></tr>
      </table>
    `),
  },
  {
    template_key: 'invoice_generated_client',
    template_name: 'Invoice Sent to Client',
    category: 'finance',
    audience: 'client',
    trigger_event: 'invoice_generated_client',
    send_mode: 'confirm',
    description: 'Send invoice to client',
    subject_template: 'Invoice {{invoice_number}} from {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">Invoice</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">Please find below the invoice details for your outdoor advertising campaign.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px;">
        <tr><td style="padding: 12px 16px; color: #64748b;">Invoice Number</td><td style="padding: 12px 16px; font-weight: 600;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 12px 16px; color: #64748b;">Date</td><td style="padding: 12px 16px;">{{invoice_date}}</td></tr>
        <tr><td style="padding: 12px 16px; color: #64748b;">Campaign</td><td style="padding: 12px 16px;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 12px 16px; color: #64748b;">Amount Due</td><td style="padding: 12px 16px; font-weight: 700; font-size: 20px; color: #1e40af;">{{amount_due}}</td></tr>
        <tr><td style="padding: 12px 16px; color: #64748b;">Due Date</td><td style="padding: 12px 16px; font-weight: 600; color: #f59e0b;">{{due_date}}</td></tr>
      </table>
      <a href="{{invoice_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px;">View & Pay Invoice</a>
      <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">For any billing queries, please contact {{company_email}}.</p>
    `),
  },
  {
    template_key: 'payment_reminder_client',
    template_name: 'Payment Reminder',
    category: 'finance',
    audience: 'client',
    trigger_event: 'payment_reminder_client',
    send_mode: 'auto',
    description: 'Automated payment reminder based on due date',
    subject_template: 'Payment Reminder: Invoice {{invoice_number}} — {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #f59e0b; margin-top: 0;">Payment Reminder</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">This is a friendly reminder that the following invoice is due for payment.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Invoice</td><td style="padding: 8px 0; font-weight: 600;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Amount Due</td><td style="padding: 8px 0; font-weight: 600; color: #f59e0b;">{{balance_due}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Due Date</td><td style="padding: 8px 0;">{{due_date}}</td></tr>
      </table>
      <a href="{{payment_link}}" style="display: inline-block; background: #f59e0b; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Pay Now</a>
    `),
  },
  {
    template_key: 'payment_overdue_client',
    template_name: 'Payment Overdue',
    category: 'finance',
    audience: 'client',
    trigger_event: 'payment_overdue_client',
    send_mode: 'auto',
    description: 'Automated overdue payment notice',
    subject_template: '⚠️ Payment Overdue: Invoice {{invoice_number}} — {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #ef4444; margin-top: 0;">Payment Overdue</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">The following invoice is past its due date. Please arrange payment at the earliest to avoid any disruption.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Invoice</td><td style="padding: 8px 0; font-weight: 600;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Campaign</td><td style="padding: 8px 0; font-weight: 600;">{{campaign_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Amount Overdue</td><td style="padding: 8px 0; font-weight: 700; color: #ef4444;">{{balance_due}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Due Date</td><td style="padding: 8px 0;">{{due_date}}</td></tr>
      </table>
      <a href="{{payment_link}}" style="display: inline-block; background: #ef4444; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Pay Now</a>
    `),
  },
  {
    template_key: 'payment_received_internal',
    template_name: 'Payment Received (Internal)',
    category: 'finance',
    audience: 'internal',
    trigger_event: 'payment_received_internal',
    send_mode: 'auto',
    description: 'Notify finance team of payment received',
    subject_template: '💵 Payment Received: {{invoice_number}} — {{client_company}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Payment Received</h2>
      <p style="color: #475569;">A payment has been recorded for the following invoice.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Invoice</td><td style="padding: 8px 0; font-weight: 600;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Client</td><td style="padding: 8px 0;">{{client_company}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Amount Paid</td><td style="padding: 8px 0; font-weight: 600; color: #10b981;">{{amount_paid}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Balance Due</td><td style="padding: 8px 0;">{{balance_due}}</td></tr>
      </table>
    `),
  },
  {
    template_key: 'payment_received_client',
    template_name: 'Payment Receipt (Client)',
    category: 'finance',
    audience: 'client',
    trigger_event: 'payment_received_client',
    send_mode: 'confirm',
    description: 'Send payment confirmation to client',
    subject_template: 'Payment Received — {{invoice_number}} | {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #10b981; margin-top: 0;">Payment Received — Thank You!</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">We confirm receipt of your payment. Details below:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Invoice</td><td style="padding: 8px 0; font-weight: 600;">{{invoice_number}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Amount Paid</td><td style="padding: 8px 0; font-weight: 600; color: #10b981;">{{amount_paid}}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Balance</td><td style="padding: 8px 0;">{{balance_due}}</td></tr>
      </table>
      <p style="color: #475569;">Thank you for your prompt payment.</p>
    `),
  },

  // ── SYSTEM TEMPLATES ──
  {
    template_key: 'portal_invite_client',
    template_name: 'Client Portal Invite',
    category: 'system',
    audience: 'client',
    trigger_event: 'portal_invite_client',
    send_mode: 'auto',
    description: 'Send portal access invite to client',
    subject_template: 'You are invited to {{company_name}} Client Portal',
    html_template: WRAPPER(`
      <h2 style="color: #1e40af; margin-top: 0;">Welcome to Your Client Portal</h2>
      <p style="color: #475569;">Dear {{client_name}},</p>
      <p style="color: #475569;">You have been invited to access the {{company_name}} client portal. From here you can track campaigns, view proof of installation, and manage invoices.</p>
      <a href="{{portal_link}}" style="display: inline-block; background: #1e40af; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px;">Access Portal</a>
    `),
  },
  {
    template_key: 'daily_digest_internal',
    template_name: 'Daily Digest',
    category: 'system',
    audience: 'internal',
    trigger_event: 'daily_digest_internal',
    send_mode: 'auto',
    description: 'Daily summary of campaigns, invoices, and availability',
    subject_template: 'GO-ADS Daily Digest — {{company_name}}',
    html_template: WRAPPER(`
      <h2 style="color: #1e293b; margin-top: 0;">Daily Digest</h2>
      <p style="color: #475569;">Here is your daily summary of operations, campaigns, and financial status.</p>
      {{asset_summary_html}}
      {{asset_table_html}}
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This is an automated daily digest from Go-Ads 360°.</p>
    `),
  },
  {
    template_key: 'failed_email_alert_internal',
    template_name: 'Failed Email Alert',
    category: 'system',
    audience: 'internal',
    trigger_event: 'failed_email_alert_internal',
    send_mode: 'auto',
    description: 'Alert when email delivery fails',
    subject_template: '🚨 Email Delivery Failed — Action Required',
    html_template: WRAPPER(`
      <h2 style="color: #ef4444; margin-top: 0;">Email Delivery Failed</h2>
      <p style="color: #475569;">An email delivery has failed. Please check the Email Outbox for details and retry if needed.</p>
      <p style="color: #475569;">Check the <strong>Email Outbox & Logs</strong> section in settings to review and retry failed emails.</p>
    `),
  },
];

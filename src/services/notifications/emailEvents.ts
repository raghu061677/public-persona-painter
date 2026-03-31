/**
 * Go-Ads 360° — Master Email Event System
 * Single source of truth for all email notification events.
 */

export type EmailAudience = 'internal' | 'client';
export type EmailSendMode = 'auto' | 'confirm' | 'manual';
export type EmailCategory = 'plan' | 'campaign' | 'operations' | 'finance' | 'system';

export interface EmailEventDefinition {
  event_key: string;
  label: string;
  category: EmailCategory;
  audience: EmailAudience;
  send_mode: EmailSendMode;
  source_module: string;
  description: string;
}

export const EMAIL_EVENTS: Record<string, EmailEventDefinition> = {
  // ── Plan Workflow ──
  plan_created_internal: {
    event_key: 'plan_created_internal',
    label: 'Plan Created',
    category: 'plan',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'plans',
    description: 'Notify internal team when a new plan is created',
  },
  plan_updated_internal: {
    event_key: 'plan_updated_internal',
    label: 'Plan Updated',
    category: 'plan',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'plans',
    description: 'Notify internal team when a plan is updated',
  },
  plan_approval_requested_internal: {
    event_key: 'plan_approval_requested_internal',
    label: 'Plan Approval Requested',
    category: 'plan',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'plans',
    description: 'Notify approver when plan needs approval',
  },
  plan_approved_internal: {
    event_key: 'plan_approved_internal',
    label: 'Plan Approved',
    category: 'plan',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'plans',
    description: 'Notify sales team when plan is approved',
  },
  plan_rejected_internal: {
    event_key: 'plan_rejected_internal',
    label: 'Plan Rejected',
    category: 'plan',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'plans',
    description: 'Notify sales team when plan is rejected',
  },
  plan_shared_client: {
    event_key: 'plan_shared_client',
    label: 'Plan Shared with Client',
    category: 'plan',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'plans',
    description: 'Send plan/quotation to client for review',
  },
  plan_converted_to_campaign_internal: {
    event_key: 'plan_converted_to_campaign_internal',
    label: 'Plan Converted to Campaign',
    category: 'plan',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'plans',
    description: 'Notify team when plan is converted to campaign',
  },

  // ── Campaign Workflow ──
  campaign_created_internal: {
    event_key: 'campaign_created_internal',
    label: 'Campaign Created',
    category: 'campaign',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'campaigns',
    description: 'Notify internal team of new campaign',
  },
  campaign_confirmed_client: {
    event_key: 'campaign_confirmed_client',
    label: 'Campaign Confirmed',
    category: 'campaign',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'campaigns',
    description: 'Send campaign confirmation to client',
  },
  campaign_start_tomorrow_internal: {
    event_key: 'campaign_start_tomorrow_internal',
    label: 'Campaign Starting Tomorrow',
    category: 'campaign',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'campaigns',
    description: 'Remind ops team about campaign starting next day',
  },
  campaign_live_client: {
    event_key: 'campaign_live_client',
    label: 'Campaign Live',
    category: 'campaign',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'campaigns',
    description: 'Notify client that campaign is now live',
  },
  campaign_ending_soon_internal: {
    event_key: 'campaign_ending_soon_internal',
    label: 'Campaign Ending Soon',
    category: 'campaign',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'campaigns',
    description: 'Alert internal team about campaign nearing end',
  },
  campaign_ending_notice_client: {
    event_key: 'campaign_ending_notice_client',
    label: 'Campaign Ending Notice',
    category: 'campaign',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'campaigns',
    description: 'Notify client that campaign is ending soon',
  },
  campaign_completed_internal: {
    event_key: 'campaign_completed_internal',
    label: 'Campaign Completed (Internal)',
    category: 'campaign',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'campaigns',
    description: 'Notify team of campaign completion',
  },
  campaign_completed_client: {
    event_key: 'campaign_completed_client',
    label: 'Campaign Completed',
    category: 'campaign',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'campaigns',
    description: 'Send campaign completion report to client',
  },

  // ── Operations Workflow ──
  campaign_assigned_to_operations_internal: {
    event_key: 'campaign_assigned_to_operations_internal',
    label: 'Campaign Assigned to Operations',
    category: 'operations',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'operations',
    description: 'Notify ops team of new campaign assignment',
  },
  asset_assigned_to_mounter_internal: {
    event_key: 'asset_assigned_to_mounter_internal',
    label: 'Asset Assigned to Mounter',
    category: 'operations',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'operations',
    description: 'Notify mounter of new installation assignment',
  },
  installation_completed_internal: {
    event_key: 'installation_completed_internal',
    label: 'Installation Completed (Internal)',
    category: 'operations',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'operations',
    description: 'Notify team when installation is complete',
  },
  installation_completed_client: {
    event_key: 'installation_completed_client',
    label: 'Installation Completed',
    category: 'operations',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'operations',
    description: 'Notify client of asset installation',
  },
  proof_uploaded_internal: {
    event_key: 'proof_uploaded_internal',
    label: 'Proof Photos Uploaded',
    category: 'operations',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'operations',
    description: 'Notify team when proof photos are uploaded',
  },
  proof_verified_internal: {
    event_key: 'proof_verified_internal',
    label: 'Proof Verified (Internal)',
    category: 'operations',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'operations',
    description: 'Notify team when proof is verified/approved',
  },
  proof_verified_client: {
    event_key: 'proof_verified_client',
    label: 'Proof Verified & Shared',
    category: 'operations',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'operations',
    description: 'Share verified proof with client',
  },
  proof_rejected_internal: {
    event_key: 'proof_rejected_internal',
    label: 'Proof Rejected',
    category: 'operations',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'operations',
    description: 'Notify team when proof is rejected and rework needed',
  },

  // ── Finance Workflow ──
  invoice_generated_internal: {
    event_key: 'invoice_generated_internal',
    label: 'Invoice Generated (Internal)',
    category: 'finance',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'finance',
    description: 'Notify finance team of new invoice',
  },
  invoice_generated_client: {
    event_key: 'invoice_generated_client',
    label: 'Invoice Sent to Client',
    category: 'finance',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'finance',
    description: 'Send invoice to client',
  },
  payment_reminder_client: {
    event_key: 'payment_reminder_client',
    label: 'Payment Reminder',
    category: 'finance',
    audience: 'client',
    send_mode: 'auto',
    source_module: 'finance',
    description: 'Automated payment reminder based on due date',
  },
  payment_overdue_client: {
    event_key: 'payment_overdue_client',
    label: 'Payment Overdue',
    category: 'finance',
    audience: 'client',
    send_mode: 'auto',
    source_module: 'finance',
    description: 'Automated overdue payment notice',
  },
  payment_received_internal: {
    event_key: 'payment_received_internal',
    label: 'Payment Received (Internal)',
    category: 'finance',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'finance',
    description: 'Notify finance team of payment received',
  },
  payment_received_client: {
    event_key: 'payment_received_client',
    label: 'Payment Receipt',
    category: 'finance',
    audience: 'client',
    send_mode: 'confirm',
    source_module: 'finance',
    description: 'Send payment confirmation to client',
  },

  // ── System Workflow ──
  portal_invite_client: {
    event_key: 'portal_invite_client',
    label: 'Portal Invite',
    category: 'system',
    audience: 'client',
    send_mode: 'auto',
    source_module: 'system',
    description: 'Send portal access invite to client',
  },
  daily_digest_internal: {
    event_key: 'daily_digest_internal',
    label: 'Daily Digest',
    category: 'system',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'system',
    description: 'Daily summary of campaigns, invoices, and availability',
  },
  failed_email_alert_internal: {
    event_key: 'failed_email_alert_internal',
    label: 'Failed Email Alert',
    category: 'system',
    audience: 'internal',
    send_mode: 'auto',
    source_module: 'system',
    description: 'Alert when email delivery fails',
  },
};

export const EMAIL_EVENT_LIST = Object.values(EMAIL_EVENTS);

export const getEventsByCategory = (category: EmailCategory) =>
  EMAIL_EVENT_LIST.filter(e => e.category === category);

export const getEventsByAudience = (audience: EmailAudience) =>
  EMAIL_EVENT_LIST.filter(e => e.audience === audience);

export const getConfirmEvents = () =>
  EMAIL_EVENT_LIST.filter(e => e.send_mode === 'confirm');

export const CATEGORY_LABELS: Record<EmailCategory, string> = {
  plan: 'Plans',
  campaign: 'Campaigns',
  operations: 'Operations',
  finance: 'Finance',
  system: 'System',
};

export const AUDIENCE_LABELS: Record<EmailAudience, string> = {
  internal: 'Internal',
  client: 'Client',
};

export const SEND_MODE_LABELS: Record<EmailSendMode, string> = {
  auto: 'Auto Send',
  confirm: 'Confirm Before Send',
  manual: 'Manual Only',
};

/**
 * Campaign Lifecycle Rules — Single Source of Truth
 * 
 * STATUS FLOW:
 *   Draft → Upcoming → Running → Completed
 *                                   ↘ Cancelled
 *                                   ↘ Archived
 *
 * AUTOMATIC TRANSITIONS (handled by pg_cron + auto_update_campaign_status RPC):
 *   - Draft → Upcoming:   when start_date > today
 *   - Draft/Upcoming → Running: when start_date <= today <= end_date
 *   - Running/Upcoming → Completed: when end_date < today  ← AUTO-COMPLETE
 *
 * MANUAL TRANSITIONS (via UI actions):
 *   - Running → Completed: via "Complete Campaign" dialog (early closure / exception)
 *   - Any active → Cancelled: via cancellation flow
 *   - Completed/Cancelled → Archived: via archive action
 *
 * BILLING:
 *   Invoices are NEVER auto-generated from status transitions.
 *   All billing is handled exclusively via the Billing & Invoices module.
 *
 * RENEWAL CHAIN:
 *   - parent_campaign_id: links to the immediate source campaign
 *   - campaign_group_id: shared UUID across all campaigns in a series
 *   - created_from: stores "renewal:{parent_id}" for audit trail
 */

/**
 * Subset of campaign_status enum values that represent real campaign lifecycle.
 * Legacy values (Planned, Assigned, InProgress, PhotoUploaded, Verified)
 * exist in the DB enum but map to operational asset statuses, not campaign states.
 */
export type CampaignLifecycleStatus = 
  | 'Draft' | 'Upcoming' | 'Running' | 'Completed' | 'Cancelled' | 'Archived';

/** Ordered lifecycle stages */
export const CAMPAIGN_STATUS_ORDER: CampaignLifecycleStatus[] = [
  'Draft', 'Upcoming', 'Running', 'Completed', 'Cancelled', 'Archived',
];

/** Statuses considered "active" (campaign is live or pending) */
export const ACTIVE_CAMPAIGN_STATUSES: CampaignLifecycleStatus[] = [
  'Draft', 'Upcoming', 'Running',
];

/** Statuses considered "terminal" (campaign is done) */
export const TERMINAL_CAMPAIGN_STATUSES: CampaignLifecycleStatus[] = [
  'Completed', 'Cancelled', 'Archived',
];

/** 
 * Valid manual status transitions. 
 * Automatic transitions (Draft→Upcoming, Upcoming→Running, Running→Completed)
 * are handled by the database RPC auto_update_campaign_status().
 */
export const MANUAL_TRANSITIONS: Partial<Record<CampaignLifecycleStatus, CampaignLifecycleStatus[]>> = {
  Draft: ['Cancelled'],
  Upcoming: ['Cancelled'],
  Running: ['Completed', 'Cancelled'],
  Completed: ['Archived'],
  Cancelled: ['Archived'],
  Archived: [],
};

/**
 * Check if a manual status transition is allowed.
 */
export function canTransitionTo(current: string, target: string): boolean {
  return MANUAL_TRANSITIONS[current as CampaignLifecycleStatus]?.includes(target as CampaignLifecycleStatus) ?? false;
}

/**
 * Check if campaign is in an active (non-terminal) state.
 */
export function isCampaignActive(status: string): boolean {
  return ACTIVE_CAMPAIGN_STATUSES.includes(status as CampaignLifecycleStatus);
}

/**
 * Check if campaign should auto-complete (end_date has passed).
 * This is informational — actual auto-completion is done by the DB function.
 */
export function shouldAutoComplete(campaign: { status: string; end_date: string }): boolean {
  if (campaign.status !== 'Running' && campaign.status !== 'Upcoming') return false;
  return new Date(campaign.end_date) < new Date();
}

/**
 * Check if manual completion is appropriate (early closure / exception case).
 * Normal campaigns auto-complete; this is for special situations.
 */
export function isManualCompleteCase(campaign: { status: string; end_date: string }): boolean {
  if (campaign.status !== 'Running') return false;
  return new Date(campaign.end_date) >= new Date();
}

/**
 * Get human-readable context about campaign completion.
 */
export function getCompletionContext(campaign: { status: string; end_date: string }): {
  canComplete: boolean;
  isAutoEligible: boolean;
  reason: string;
} {
  const endDate = new Date(campaign.end_date);
  const isPast = endDate < new Date();

  if (TERMINAL_CAMPAIGN_STATUSES.includes(campaign.status as CampaignLifecycleStatus)) {
    return { canComplete: false, isAutoEligible: false, reason: `Campaign is already ${campaign.status}` };
  }

  if (campaign.status === 'Draft') {
    return { canComplete: false, isAutoEligible: false, reason: 'Draft campaigns should be cancelled, not completed' };
  }

  if (isPast) {
    return { canComplete: true, isAutoEligible: true, reason: 'End date has passed — will auto-complete on next sync' };
  }

  return { canComplete: true, isAutoEligible: false, reason: 'Early closure — manual completion' };
}

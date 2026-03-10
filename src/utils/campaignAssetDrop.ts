/**
 * Campaign Asset Drop/Removal Service — Non-destructive mid-campaign asset removal.
 *
 * Supports two business cases:
 * 1. Client Drop — client requests removal, billing defaults to prorated
 * 2. Admin/Company Removal — operational reasons, billing defaults to waived
 *
 * Removal types: client_drop, admin_removed, damaged, maintenance,
 * authority_issue, site_removed, replacement, other
 *
 * Billing modes: prorated, full_term, manual_override, waived
 */

import { supabase } from "@/integrations/supabase/client";

const BILLING_CYCLE_DAYS = 30;

// ─── Types ───────────────────────────────────────────────────────

export type RemovalType =
  | 'client_drop'
  | 'admin_removed'
  | 'damaged'
  | 'maintenance'
  | 'authority_issue'
  | 'site_removed'
  | 'replacement'
  | 'other';

export type BillingMode = 'prorated' | 'full_term' | 'manual_override' | 'waived';

export interface DropAssetParams {
  campaignAssetId: string;
  dropDate: string; // YYYY-MM-DD
  dropReason?: string;
  billingMode?: BillingMode;
  billingOverrideAmount?: number | null;
  removalType?: RemovalType;
  removalNotes?: string;
  replacementAssetId?: string;
}

export interface DropAssetResult {
  success: boolean;
  proratedAmount?: number;
  originalAmount?: number;
  error?: string;
}

// ─── Default Billing Mode per Removal Type ──────────────────────

const REMOVAL_BILLING_DEFAULTS: Record<RemovalType, BillingMode> = {
  client_drop: 'prorated',
  admin_removed: 'waived',
  damaged: 'waived',
  maintenance: 'waived',
  authority_issue: 'waived',
  site_removed: 'waived',
  replacement: 'waived',
  other: 'prorated',
};

export function getDefaultBillingModeForRemovalType(type: RemovalType): BillingMode {
  return REMOVAL_BILLING_DEFAULTS[type] || 'prorated';
}

// ─── Activity Log Action per Removal Type ───────────────────────

const REMOVAL_LOG_ACTIONS: Record<RemovalType, string> = {
  client_drop: 'CAMPAIGN_ASSET_CLIENT_DROPPED',
  admin_removed: 'CAMPAIGN_ASSET_ADMIN_REMOVED',
  damaged: 'CAMPAIGN_ASSET_DAMAGED',
  maintenance: 'CAMPAIGN_ASSET_ADMIN_REMOVED',
  authority_issue: 'CAMPAIGN_ASSET_ADMIN_REMOVED',
  site_removed: 'CAMPAIGN_ASSET_ADMIN_REMOVED',
  replacement: 'CAMPAIGN_ASSET_REPLACED',
  other: 'CAMPAIGN_ASSET_ADMIN_REMOVED',
};

// ─── Proration Calculator ───────────────────────────────────────

/**
 * Calculate prorated billing amount for a dropped asset.
 * Formula: (monthly_rate / 30) × effective_days
 */
export function calculateProratedAmount(
  monthlyRate: number,
  effectiveStartDate: string,
  dropDate: string
): number {
  const start = new Date(effectiveStartDate);
  const drop = new Date(dropDate);
  const effectiveDays = Math.max(1, Math.ceil((drop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dailyRate = monthlyRate / BILLING_CYCLE_DAYS;
  return Math.round(dailyRate * effectiveDays * 100) / 100;
}

/**
 * Calculate full-term amount for reference.
 */
export function calculateFullTermAmount(
  monthlyRate: number,
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const dailyRate = monthlyRate / BILLING_CYCLE_DAYS;
  return Math.round(dailyRate * totalDays * 100) / 100;
}

// ─── Drop Action ────────────────────────────────────────────────

/**
 * Drop/remove a single campaign asset non-destructively.
 */
export async function dropCampaignAsset(params: DropAssetParams): Promise<DropAssetResult> {
  const {
    campaignAssetId,
    dropDate,
    dropReason,
    billingMode = 'prorated',
    billingOverrideAmount,
    removalType = 'client_drop',
    removalNotes,
    replacementAssetId,
  } = params;

  try {
    // Fetch current asset data
    const { data: asset, error: fetchErr } = await supabase
      .from('campaign_assets')
      .select('id, campaign_id, asset_id, negotiated_rate, card_rate, effective_start_date, effective_end_date, booking_start_date, booking_end_date, start_date, end_date, rent_amount, is_removed')
      .eq('id', campaignAssetId)
      .single();

    if (fetchErr || !asset) {
      return { success: false, error: 'Campaign asset not found' };
    }

    if (asset.is_removed) {
      return { success: false, error: 'Asset is already removed' };
    }

    const effectiveStart = asset.effective_start_date || asset.booking_start_date || asset.start_date;
    const effectiveEnd = asset.effective_end_date || asset.booking_end_date || asset.end_date;
    const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;

    // Calculate amounts
    const originalAmount = calculateFullTermAmount(monthlyRate, effectiveStart, effectiveEnd);
    const proratedAmount = calculateProratedAmount(monthlyRate, effectiveStart, dropDate);

    // Determine final billing based on mode
    const updatePayload: Record<string, any> = {
      is_removed: true,
      dropped_on: dropDate,
      drop_reason: dropReason || null,
      effective_end_date: dropDate,
      billing_mode_override: billingMode,
      removal_type: removalType,
      removal_notes: removalNotes || null,
    };

    if (replacementAssetId) {
      updatePayload.replacement_asset_id = replacementAssetId;
    }

    // Set rent_amount based on billing mode
    switch (billingMode) {
      case 'waived':
        updatePayload.rent_amount = 0;
        updatePayload.billing_override_amount = 0;
        break;
      case 'prorated':
        updatePayload.rent_amount = proratedAmount;
        updatePayload.billing_override_amount = null;
        break;
      case 'full_term':
        // Keep original rent_amount
        updatePayload.billing_override_amount = null;
        break;
      case 'manual_override':
        if (billingOverrideAmount != null) {
          updatePayload.rent_amount = billingOverrideAmount;
          updatePayload.billing_override_amount = billingOverrideAmount;
        }
        break;
    }

    const { error: updateErr } = await supabase
      .from('campaign_assets')
      .update(updatePayload)
      .eq('id', campaignAssetId);

    if (updateErr) {
      return { success: false, error: `Update failed: ${updateErr.message}` };
    }

    // Log activity with specific action per removal type
    const logAction = REMOVAL_LOG_ACTIONS[removalType] || 'CAMPAIGN_ASSET_ADMIN_REMOVED';
    const billingLogAction = billingMode === 'waived'
      ? 'CAMPAIGN_ASSET_BILLING_WAIVED'
      : billingMode === 'manual_override'
      ? 'CAMPAIGN_ASSET_BILLING_OVERRIDDEN'
      : null;

    const logEntries: any[] = [
      {
        action: logAction,
        resource_type: 'campaign_asset',
        resource_id: campaignAssetId,
        resource_name: asset.asset_id,
        details: {
          campaign_id: asset.campaign_id,
          drop_date: dropDate,
          drop_reason: dropReason,
          removal_type: removalType,
          removal_notes: removalNotes,
          billing_mode: billingMode,
          original_amount: originalAmount,
          prorated_amount: proratedAmount,
          final_amount: billingMode === 'waived' ? 0 : billingMode === 'prorated' ? proratedAmount : billingOverrideAmount,
          replacement_asset_id: replacementAssetId,
        },
      },
    ];

    if (billingLogAction) {
      logEntries.push({
        action: billingLogAction,
        resource_type: 'campaign_asset',
        resource_id: campaignAssetId,
        resource_name: asset.asset_id,
        details: {
          campaign_id: asset.campaign_id,
          billing_mode: billingMode,
          amount: billingMode === 'waived' ? 0 : billingOverrideAmount,
        },
      });
    }

    try {
      await supabase.from('activity_logs').insert(logEntries);
    } catch {
      // Non-critical
    }

    return {
      success: true,
      proratedAmount,
      originalAmount,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error' };
  }
}

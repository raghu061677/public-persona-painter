/**
 * Campaign Asset Drop Service — Non-destructive mid-campaign asset removal.
 *
 * Business rules:
 * - Dropped assets are soft-removed (is_removed=true), never hard-deleted
 * - effective_end_date is set to the drop date
 * - Billing auto-prorates to the drop date unless manually overridden
 * - Historical proof, photos, and financial data remain linked
 * - Other campaign assets are unaffected
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const BILLING_CYCLE_DAYS = 30;

// ─── Types ───────────────────────────────────────────────────────

export interface DropAssetParams {
  campaignAssetId: string;
  dropDate: string; // YYYY-MM-DD
  dropReason?: string;
  billingMode?: 'prorated' | 'full_term' | 'manual_override';
  billingOverrideAmount?: number | null;
}

export interface DropAssetResult {
  success: boolean;
  proratedAmount?: number;
  originalAmount?: number;
  error?: string;
}

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
 * Drop a single campaign asset non-destructively.
 * Sets is_removed=true, records drop date/reason, updates effective_end_date,
 * and optionally applies prorated billing.
 */
export async function dropCampaignAsset(params: DropAssetParams): Promise<DropAssetResult> {
  const { campaignAssetId, dropDate, dropReason, billingMode = 'prorated', billingOverrideAmount } = params;

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
      return { success: false, error: 'Asset is already dropped' };
    }

    const effectiveStart = asset.effective_start_date || asset.booking_start_date || asset.start_date;
    const effectiveEnd = asset.effective_end_date || asset.booking_end_date || asset.end_date;
    const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;

    // Calculate amounts
    const originalAmount = calculateFullTermAmount(monthlyRate, effectiveStart, effectiveEnd);
    let proratedAmount = calculateProratedAmount(monthlyRate, effectiveStart, dropDate);

    // Determine final billing
    let finalBillingOverride: number | null = null;
    let finalBillingMode = billingMode;

    if (billingMode === 'manual_override' && billingOverrideAmount != null) {
      finalBillingOverride = billingOverrideAmount;
    } else if (billingMode === 'full_term') {
      finalBillingOverride = null; // Keep original
    }
    // prorated → no override, rent_amount recalculated

    // Update campaign_asset — soft removal
    const updatePayload: Record<string, any> = {
      is_removed: true,
      dropped_on: dropDate,
      drop_reason: dropReason || null,
      effective_end_date: dropDate,
      billing_mode_override: finalBillingMode,
    };

    if (finalBillingMode === 'prorated') {
      updatePayload.rent_amount = proratedAmount;
    }
    if (finalBillingOverride != null) {
      updatePayload.billing_override_amount = finalBillingOverride;
      updatePayload.rent_amount = finalBillingOverride;
    }

    const { error: updateErr } = await supabase
      .from('campaign_assets')
      .update(updatePayload)
      .eq('id', campaignAssetId);

    if (updateErr) {
      return { success: false, error: `Update failed: ${updateErr.message}` };
    }

    // Log activity
    try {
      await supabase.from('activity_logs').insert({
        action: 'CAMPAIGN_ASSET_DROPPED',
        resource_type: 'campaign_asset',
        resource_id: campaignAssetId,
        resource_name: asset.asset_id,
        details: {
          campaign_id: asset.campaign_id,
          drop_date: dropDate,
          drop_reason: dropReason,
          billing_mode: finalBillingMode,
          original_amount: originalAmount,
          prorated_amount: proratedAmount,
          override_amount: finalBillingOverride,
        },
      });
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

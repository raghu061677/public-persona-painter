/**
 * Campaign Asset Helpers — Active/Dropped/Total counting utilities.
 *
 * Single source of truth for separating active vs dropped campaign assets.
 * Used by Campaign Detail, Campaign Edit, and financial calculators.
 */

import { differenceInDays } from "date-fns";
import { toDateString } from "./dateOverlap";

export interface CampaignAssetRecord {
  id: string;
  asset_id: string;
  is_removed?: boolean;
  dropped_on?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  booking_start_date?: string | null;
  booking_end_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  [key: string]: any;
}

export interface CampaignAssetCounts {
  total: number;
  active: number;
  dropped: number;
  installed: number;
  verified: number;
  completed: number;
  pending: number;
}

/**
 * Separate campaign assets into active and dropped.
 */
export function getActiveAssets<T extends CampaignAssetRecord>(assets: T[]): T[] {
  return assets.filter(a => !a.is_removed);
}

export function getDroppedAssets<T extends CampaignAssetRecord>(assets: T[]): T[] {
  return assets.filter(a => a.is_removed === true);
}

/**
 * Compute comprehensive counts for campaign assets.
 * Active counts exclude dropped assets. Status counts are based on active assets only.
 */
export function computeCampaignAssetCounts(assets: CampaignAssetRecord[]): CampaignAssetCounts {
  const active = getActiveAssets(assets);
  const dropped = getDroppedAssets(assets);

  const normalizeStatus = (s: string | undefined): string => {
    if (!s) return 'Pending';
    const lower = s.toLowerCase();
    if (lower === 'mounted' || lower === 'installed') return 'Installed';
    if (lower === 'photouploaded' || lower === 'completed') return 'Completed';
    if (lower === 'verified') return 'Verified';
    if (lower === 'assigned') return 'Assigned';
    return s;
  };

  return {
    total: assets.length,
    active: active.length,
    dropped: dropped.length,
    installed: active.filter(a => {
      const n = normalizeStatus(a.status);
      return n === 'Installed' || n === 'Completed';
    }).length,
    verified: active.filter(a => normalizeStatus(a.status) === 'Verified').length,
    completed: active.filter(a => normalizeStatus(a.status) === 'Completed').length,
    pending: active.filter(a => {
      const n = normalizeStatus(a.status);
      return n === 'Pending' || n === 'Assigned' || !a.status;
    }).length,
  };
}

/**
 * Compute effective booking window for a campaign asset.
 * Returns start and end dates, plus active days and planned days.
 */
export function computeAssetBookingWindow(
  asset: CampaignAssetRecord,
  campaignStartDate?: string,
  campaignEndDate?: string
): {
  effectiveStart: string;
  effectiveEnd: string;
  activeDays: number;
  plannedDays: number;
  isDropped: boolean;
  droppedDate?: string;
} {
  const start = toDateString(
    asset.effective_start_date || asset.booking_start_date || asset.start_date || campaignStartDate
  ) || toDateString(new Date());

  const campaignEnd = toDateString(campaignEndDate) || toDateString(new Date());

  const end = asset.is_removed
    ? toDateString(asset.effective_end_date || asset.dropped_on) || campaignEnd
    : toDateString(asset.effective_end_date || asset.booking_end_date || asset.end_date || campaignEndDate) || campaignEnd;

  const startD = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  const campEndD = new Date(campaignEnd + 'T00:00:00');

  const activeDays = Math.max(1, differenceInDays(endD, startD) + 1);
  const plannedDays = Math.max(1, differenceInDays(campEndD, startD) + 1);

  return {
    effectiveStart: start,
    effectiveEnd: end,
    activeDays,
    plannedDays,
    isDropped: asset.is_removed === true,
    droppedDate: asset.is_removed ? (asset.dropped_on || undefined) : undefined,
  };
}

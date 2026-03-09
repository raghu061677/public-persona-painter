/**
 * Booking Engine — Single source of truth for booking date resolution and conflict checking.
 * 
 * All campaign/plan asset selection and validation must use these utilities.
 * Never rely on media_assets.status for booking decisions.
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────

export interface BookingConflict {
  booking_id?: string;
  source_type?: string;
  source_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  client_name?: string;
  start_date: string;
  end_date: string;
  status?: string;
}

export interface ConflictCheckResult {
  has_conflict: boolean;
  conflicting_bookings?: BookingConflict[];
  conflicting_campaigns?: BookingConflict[];
}

export type BookingDisplayStatus = 'available' | 'available_soon' | 'conflict' | 'blocked' | 'upcoming';

export interface AssetBookingInfo {
  displayStatus: BookingDisplayStatus;
  availableFrom?: string; // ISO date string
  conflicts: BookingConflict[];
  isSelectable: boolean;
}

// ─── Date Resolver ───────────────────────────────────────────────

/**
 * Resolves effective booking dates for an asset item.
 * Priority: item-level dates > parent-level dates
 * 
 * Used consistently across Plan create/edit, Campaign create/edit,
 * asset selection dialogs, and edge functions.
 */
export function resolveEffectiveDates(
  item: {
    display_from?: string | Date | null;
    display_to?: string | Date | null;
    start_date?: string | Date | null;
    end_date?: string | Date | null;
  },
  parent: {
    start_date?: string | Date | null;
    end_date?: string | Date | null;
  }
): { startDate: string; endDate: string } {
  const resolveDate = (
    ...candidates: (string | Date | null | undefined)[]
  ): string => {
    for (const d of candidates) {
      if (!d) continue;
      if (typeof d === 'string' && d.trim()) return d.split('T')[0];
      if (d instanceof Date && !isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  return {
    startDate: resolveDate(item.display_from, item.start_date, parent.start_date),
    endDate: resolveDate(item.display_to, item.end_date, parent.end_date),
  };
}

// ─── Conflict Checking ──────────────────────────────────────────

/**
 * Check a single asset for booking conflicts using the check_asset_conflict RPC.
 * This is the canonical conflict checker — uses campaign_assets as source of truth.
 */
export async function checkAssetConflict(
  assetId: string,
  startDate: string,
  endDate: string,
  excludeCampaignId?: string | null
): Promise<ConflictCheckResult> {
  try {
    const { data, error } = await supabase.rpc('check_asset_conflict', {
      p_asset_id: assetId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_exclude_campaign_id: excludeCampaignId || null,
    });

    if (error) throw error;

    const result = data as unknown as ConflictCheckResult;
    return {
      has_conflict: result.has_conflict || false,
      conflicting_campaigns: result.conflicting_campaigns || [],
      conflicting_bookings: result.conflicting_campaigns || [],
    };
  } catch (error) {
    console.error('Conflict check error for', assetId, error);
    return { has_conflict: false, conflicting_campaigns: [], conflicting_bookings: [] };
  }
}

/**
 * Batch check multiple assets for conflicts.
 * Processes in parallel batches of 10 for performance.
 */
export async function batchCheckConflicts(
  assetIds: string[],
  startDate: string,
  endDate: string,
  excludeCampaignId?: string | null
): Promise<Map<string, BookingConflict[]>> {
  const conflictMap = new Map<string, BookingConflict[]>();
  
  if (!startDate || !endDate || assetIds.length === 0) return conflictMap;

  const batchSize = 10;
  for (let i = 0; i < assetIds.length; i += batchSize) {
    const batch = assetIds.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (assetId) => {
      const result = await checkAssetConflict(assetId, startDate, endDate, excludeCampaignId);
      if (result.has_conflict && result.conflicting_campaigns?.length) {
        conflictMap.set(assetId, result.conflicting_campaigns);
      }
    }));
  }

  return conflictMap;
}

// ─── Display Status ─────────────────────────────────────────────

/**
 * Determine display status and selectability for an asset in context of requested booking dates.
 * 
 * This replaces all old getEffectiveStatus / hasConflict / status-based logic.
 * 
 * @param assetId - The asset ID
 * @param conflictMap - Pre-computed conflict map from batchCheckConflicts
 * @param assetCurrentStatus - The current media_assets.status (display hint only)
 * @param latestBookingEndDate - The latest active booking end date for this asset (optional)
 * @param requestedStartDate - The campaign/plan start date being requested
 */
export function getAssetBookingInfo(
  assetId: string,
  conflictMap: Map<string, BookingConflict[]>,
  assetCurrentStatus?: string,
  latestBookingEndDate?: string | null,
  requestedStartDate?: string | null
): AssetBookingInfo {
  const conflicts = conflictMap.get(assetId) || [];
  
  // If RPC found a conflict, this asset is blocked for the requested dates
  if (conflicts.length > 0) {
    return {
      displayStatus: 'conflict',
      conflicts,
      isSelectable: false,
    };
  }

  // No conflict — asset is available for the requested dates
  // Check if it's currently booked but becomes free (available_soon)
  const isCurrentlyBooked = assetCurrentStatus === 'Booked' || assetCurrentStatus === 'Running';
  
  if (isCurrentlyBooked && latestBookingEndDate && requestedStartDate) {
    const bookingEnd = new Date(latestBookingEndDate);
    const reqStart = new Date(requestedStartDate);
    
    if (bookingEnd < reqStart) {
      // Currently booked but free before requested start
      const nextDay = new Date(bookingEnd);
      nextDay.setDate(nextDay.getDate() + 1);
      return {
        displayStatus: 'available_soon',
        availableFrom: format(nextDay, 'yyyy-MM-dd'),
        conflicts: [],
        isSelectable: true,
      };
    }
  }

  // Check for upcoming display status (no dates provided case)
  if (!requestedStartDate && (assetCurrentStatus === 'Upcoming')) {
    return {
      displayStatus: 'upcoming',
      conflicts: [],
      isSelectable: true, // Still selectable if user hasn't set dates yet
    };
  }

  return {
    displayStatus: 'available',
    conflicts: [],
    isSelectable: true,
  };
}

// ─── Conflict Summary Formatter ─────────────────────────────────

/**
 * Format conflict info for display in tooltips/toasts.
 */
export function formatConflictSummary(conflicts: BookingConflict[]): string {
  if (conflicts.length === 0) return '';
  
  return conflicts.map(c => {
    const name = c.campaign_name || c.source_type || 'Booking';
    const start = c.start_date ? format(new Date(c.start_date), 'dd MMM yyyy') : '?';
    const end = c.end_date ? format(new Date(c.end_date), 'dd MMM yyyy') : '?';
    return `${name}: ${start} to ${end}`;
  }).join('\n');
}

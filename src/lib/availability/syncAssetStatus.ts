/**
 * Asset Status Sync Engine — Single source of truth for media_assets status synchronization.
 *
 * Call after any booking-related action (campaign add/remove/drop, plan block/release, etc.)
 * to ensure media_assets.status stays in sync with actual bookings.
 *
 * This is a CACHE updater — the availability engine (getAssetAvailability) remains
 * the authoritative source for booking decisions. This just keeps the status column
 * consistent for quick display purposes.
 */

import { supabase } from "@/integrations/supabase/client";
import { toDateString, datesOverlap } from "./dateOverlap";

const ACTIVE_CAMPAIGN_STATUSES = ['Draft', 'Upcoming', 'Running'];
const EXCLUDED_CAMPAIGN_STATUSES = ['Cancelled', 'Archived', 'Completed'];

export interface SyncResult {
  assetId: string;
  previousStatus?: string;
  newStatus: string;
  bookingSource?: string;
  error?: string;
}

/**
 * Sync a single media asset's status based on its actual bookings.
 * Updates media_assets.status to reflect current booking state.
 */
export async function syncMediaAssetBookingState(assetId: string): Promise<SyncResult> {
  const today = toDateString(new Date());

  try {
    // Fetch all active campaign_assets for this asset
    const { data: bookings } = await supabase
      .from('campaign_assets')
      .select(`
        asset_id, is_removed,
        effective_start_date, effective_end_date,
        booking_start_date, booking_end_date,
        campaigns!inner(id, campaign_name, status, is_deleted)
      `)
      .eq('asset_id', assetId);

    // Fetch active holds
    const { data: holds } = await supabase
      .from('asset_holds')
      .select('id, start_date, end_date, status')
      .eq('asset_id', assetId)
      .eq('status', 'ACTIVE');

    // Determine current status
    let newStatus = 'Available';
    let bookingSource = '';

    // Check campaign bookings — only non-removed assets with active campaign statuses
    for (const b of (bookings || [])) {
      const campaign = b.campaigns as any;
      if (!campaign || campaign.is_deleted) continue;
      if (EXCLUDED_CAMPAIGN_STATUSES.includes(campaign.status)) continue;

      // For removed assets, only consider their effective window
      const bStart = toDateString(b.effective_start_date || b.booking_start_date);
      const bEnd = toDateString(b.effective_end_date || b.booking_end_date);
      if (!bStart || !bEnd) continue;

      // Skip dropped assets — they shouldn't block availability after their effective_end_date
      if (b.is_removed) continue;

      if (datesOverlap(bStart, bEnd, today, today)) {
        newStatus = 'Booked';
        bookingSource = campaign.campaign_name || campaign.id;
        break;
      } else if (bStart > today) {
        // Future booking — set to Upcoming if not already Booked
        if (newStatus !== 'Booked') {
          newStatus = 'Upcoming';
          bookingSource = campaign.campaign_name || campaign.id;
        }
      }
    }

    // Check holds if not already booked
    if (newStatus === 'Available') {
      for (const h of (holds || [])) {
        if (!h.start_date || !h.end_date) continue;
        if (datesOverlap(toDateString(h.start_date), toDateString(h.end_date), today, today)) {
          newStatus = 'Blocked';
          bookingSource = 'Hold';
          break;
        }
      }
    }

    // Update the asset status - cast to enum type
    const statusEnum = (newStatus === 'Upcoming' ? 'Booked' : newStatus) as 'Available' | 'Blocked' | 'Booked';
    const { error } = await supabase
      .from('media_assets')
      .update({ status: statusEnum })
      .eq('id', assetId);

    if (error) {
      console.error(`[syncAssetStatus] Failed to update ${assetId}:`, error);
      return { assetId, newStatus, error: error.message };
    }

    return { assetId, newStatus, bookingSource };
  } catch (err: any) {
    console.error(`[syncAssetStatus] Error syncing ${assetId}:`, err);
    return { assetId, newStatus: 'Unknown', error: err.message };
  }
}

/**
 * Sync multiple media assets' statuses in parallel batches.
 * Use after bulk operations like campaign save, plan conversion, etc.
 */
export async function syncMultipleMediaAssetBookingStates(
  assetIds: string[]
): Promise<SyncResult[]> {
  if (assetIds.length === 0) return [];

  const uniqueIds = [...new Set(assetIds)];
  const results: SyncResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => syncMediaAssetBookingState(id))
    );
    results.push(...batchResults);
  }

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.warn(`[syncAssetStatus] ${errors.length}/${results.length} assets failed to sync`);
  }

  return results;
}

/**
 * Get a tooltip-friendly booking summary for an asset.
 * Returns structured data for hover tooltips in asset pickers.
 */
export async function getAssetBookingTooltip(
  assetId: string,
  fromDate?: string,
  toDate?: string
): Promise<{
  currentStatus: string;
  bookings: Array<{
    type: 'campaign' | 'hold';
    name: string;
    clientName?: string;
    startDate: string;
    endDate: string;
    status: string;
  }>;
  nextAvailableDate?: string;
}> {
  const today = toDateString(new Date());
  const rangeStart = fromDate || today;
  const rangeEnd = toDate || today;

  const { data: campaignBookings } = await supabase
    .from('campaign_assets')
    .select(`
      effective_start_date, effective_end_date,
      booking_start_date, booking_end_date,
      is_removed,
      campaigns!inner(id, campaign_name, client_name, status, is_deleted)
    `)
    .eq('asset_id', assetId);

  const { data: holds } = await supabase
    .from('asset_holds')
    .select('id, start_date, end_date, status, client_name')
    .eq('asset_id', assetId)
    .eq('status', 'ACTIVE');

  const bookings: Array<{
    type: 'campaign' | 'hold';
    name: string;
    clientName?: string;
    startDate: string;
    endDate: string;
    status: string;
  }> = [];

  let latestEndDate = '';

  for (const b of (campaignBookings || [])) {
    const campaign = b.campaigns as any;
    if (!campaign || campaign.is_deleted) continue;
    if (EXCLUDED_CAMPAIGN_STATUSES.includes(campaign.status)) continue;
    if (b.is_removed) continue;

    const bStart = toDateString(b.effective_start_date || b.booking_start_date);
    const bEnd = toDateString(b.effective_end_date || b.booking_end_date);
    if (!bStart || !bEnd) continue;

    if (datesOverlap(bStart, bEnd, rangeStart, rangeEnd)) {
      bookings.push({
        type: 'campaign',
        name: campaign.campaign_name || 'Campaign',
        clientName: campaign.client_name,
        startDate: bStart,
        endDate: bEnd,
        status: campaign.status,
      });
      if (bEnd > latestEndDate) latestEndDate = bEnd;
    }
  }

  for (const h of (holds || [])) {
    if (!h.start_date || !h.end_date) continue;
    const hStart = toDateString(h.start_date);
    const hEnd = toDateString(h.end_date);
    if (datesOverlap(hStart, hEnd, rangeStart, rangeEnd)) {
      bookings.push({
        type: 'hold',
        name: h.client_name || 'Reserved',
        startDate: hStart,
        endDate: hEnd,
        status: 'ACTIVE',
      });
      if (hEnd > latestEndDate) latestEndDate = hEnd;
    }
  }

  // Calculate next available date
  let nextAvailableDate: string | undefined;
  if (latestEndDate) {
    const d = new Date(latestEndDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    nextAvailableDate = toDateString(d);
  }

  const currentStatus = bookings.length > 0
    ? bookings.some(b => b.type === 'campaign') ? 'Booked' : 'Blocked'
    : 'Available';

  return { currentStatus, bookings, nextAvailableDate };
}

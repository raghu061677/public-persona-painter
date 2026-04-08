/**
 * Asset Availability Engine — Single source of truth for booking/vacancy status.
 *
 * This replaces all scattered media_assets.status-based vacancy logic.
 * All modules (Vacant Report, Booked Report, Dashboard, Plan Builder, Campaign Conflict)
 * MUST use this engine for availability determination.
 *
 * Source of truth priority:
 *   1. Active/running campaign_assets (strongest) — uses effective_start/end_date
 *   2. Future approved campaign_assets
 *   3. Active asset_holds
 *   4. Otherwise → Vacant
 *
 * Dropped assets (is_removed=true) are INCLUDED in overlap checks using their
 * effective_start_date → effective_end_date window. They block dates only up to
 * their effective_end_date (which equals dropped_on). After that date they do
 * not block availability.
 *
 * media_assets.status is NOT authoritative for booking — it's a display hint only.
 */

import { supabase } from "@/integrations/supabase/client";
import { datesOverlap, toDateString } from "./dateOverlap";

// ─── Types ───────────────────────────────────────────────────────

export type BookingAvailability = 'Vacant' | 'Upcoming' | 'Running' | 'Booked' | 'Blocked';

export interface BookingSource {
  sourceType: 'campaign' | 'plan' | 'hold' | 'manual_block';
  sourceId: string;
  sourceNumber?: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  status?: string;
}

export interface AssetAvailabilityResult {
  availability: BookingAvailability;
  sourceType?: BookingSource['sourceType'];
  sourceId?: string;
  sourceNumber?: string;
  startDate?: string;
  endDate?: string;
  clientName?: string;
  hasConflict: boolean;
  allBookings: BookingSource[];
}

// Campaign statuses that represent active/valid bookings
const BOOKING_CAMPAIGN_STATUSES = ['Draft', 'Upcoming', 'Running'];
// Campaign statuses to exclude from booking consideration
const EXCLUDED_CAMPAIGN_STATUSES = ['Cancelled', 'Archived', 'Completed'];

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Resolve effective booking dates for a campaign_asset row.
 * Priority: effective_start/end_date > booking_start/end_date > start/end_date > campaign dates
 *
 * For dropped assets, effective_end_date is set to dropped_on, so the booking
 * window automatically shrinks to cover only the period the asset was active.
 */
function resolveBookingDates(
  row: any,
  campaign: any
): { start: string; end: string } | null {
  const start =
    row.effective_start_date ||
    row.booking_start_date ||
    row.start_date ||
    campaign.start_date;
  const end =
    row.effective_end_date ||
    row.booking_end_date ||
    row.end_date ||
    campaign.end_date;
  if (!start || !end) return null;
  return { start: toDateString(start), end: toDateString(end) };
}

// ─── Single Asset Availability ──────────────────────────────────

/**
 * Get availability for a single asset within a date range.
 * Uses campaign_assets as the source of truth.
 * Both active AND dropped assets are included — their effective date window
 * determines the booking overlap, not the is_removed flag.
 */
export async function getAssetAvailability(
  assetId: string,
  rangeStart: string,
  rangeEnd: string,
  excludeCampaignId?: string | null
): Promise<AssetAvailabilityResult> {
  const today = toDateString(new Date());
  const allBookings: BookingSource[] = [];

  // 1. Check campaign_assets bookings — include ALL rows (active + dropped)
  //    Dropped rows have effective_end_date = dropped_on, so their booking
  //    window is already correctly truncated.
  let query = supabase
    .from('campaign_assets')
    .select(`
      asset_id, campaign_id, booking_start_date, booking_end_date, start_date, end_date,
      is_removed, effective_start_date, effective_end_date,
      campaigns!inner(id, campaign_name, client_name, start_date, end_date, status, is_deleted)
    `)
    .eq('asset_id', assetId);

  if (excludeCampaignId) {
    query = query.neq('campaign_id', excludeCampaignId);
  }

  const { data: bookings } = await query;

  for (const b of (bookings || [])) {
    const campaign = b.campaigns as any;
    if (!campaign || campaign.is_deleted) continue;
    if (EXCLUDED_CAMPAIGN_STATUSES.includes(campaign.status)) continue;

    const dates = resolveBookingDates(b, campaign);
    if (!dates) continue;

    allBookings.push({
      sourceType: 'campaign',
      sourceId: campaign.id,
      sourceNumber: campaign.campaign_name,
      clientName: campaign.client_name,
      startDate: dates.start,
      endDate: dates.end,
      status: campaign.status,
    });
  }

  // 2. Check asset_holds
  const { data: holds } = await supabase
    .from('asset_holds')
    .select('id, start_date, end_date, status, client_name, hold_type')
    .eq('asset_id', assetId)
    .eq('status', 'ACTIVE');

  for (const h of (holds || [])) {
    if (!h.start_date || !h.end_date) continue;
    allBookings.push({
      sourceType: 'hold',
      sourceId: h.id,
      clientName: h.client_name || undefined,
      startDate: toDateString(h.start_date),
      endDate: toDateString(h.end_date),
      status: 'ACTIVE',
    });
  }

  // 3. Determine availability for the requested range
  const overlapping = allBookings.filter(b =>
    datesOverlap(b.startDate, b.endDate, rangeStart, rangeEnd)
  );

  if (overlapping.length === 0) {
    return { availability: 'Vacant', hasConflict: false, allBookings };
  }

  // Find the primary overlapping booking (prefer campaigns over holds)
  const primaryBooking = overlapping.find(b => b.sourceType === 'campaign') || overlapping[0];

  // Determine specific status
  let availability: BookingAvailability = 'Booked';

  if (primaryBooking.sourceType === 'hold') {
    availability = 'Blocked';
  } else if (primaryBooking.sourceType === 'campaign') {
    const isRunning = datesOverlap(primaryBooking.startDate, primaryBooking.endDate, today, today);
    const isFuture = primaryBooking.startDate > today;

    if (isRunning) {
      availability = 'Running';
    } else if (isFuture) {
      availability = 'Upcoming';
    } else {
      availability = 'Booked';
    }
  }

  return {
    availability,
    sourceType: primaryBooking.sourceType,
    sourceId: primaryBooking.sourceId,
    sourceNumber: primaryBooking.sourceNumber,
    startDate: primaryBooking.startDate,
    endDate: primaryBooking.endDate,
    clientName: primaryBooking.clientName,
    hasConflict: true,
    allBookings,
  };
}

// ─── Batch Availability ─────────────────────────────────────────

/**
 * Get availability for multiple assets efficiently.
 * Used by Dashboard counters, Plan Builder, Reports.
 * Both active AND dropped assets are included — effective dates control the window.
 */
export async function batchGetAssetAvailability(
  assetIds: string[],
  rangeStart: string,
  rangeEnd: string,
  excludeCampaignId?: string | null
): Promise<Map<string, AssetAvailabilityResult>> {
  const results = new Map<string, AssetAvailabilityResult>();
  if (assetIds.length === 0) return results;

  const today = toDateString(new Date());

  // Fetch ALL campaign_assets (active + dropped) for these assets
  let query = supabase
    .from('campaign_assets')
    .select(`
      asset_id, campaign_id, booking_start_date, booking_end_date, start_date, end_date,
      is_removed, effective_start_date, effective_end_date,
      campaigns!inner(id, campaign_name, client_name, start_date, end_date, status, is_deleted)
    `)
    .in('asset_id', assetIds);

  if (excludeCampaignId) {
    query = query.neq('campaign_id', excludeCampaignId);
  }

  const { data: allBookings } = await query;

  // Fetch holds
  const { data: allHolds } = await supabase
    .from('asset_holds')
    .select('id, asset_id, start_date, end_date, status, client_name')
    .in('asset_id', assetIds)
    .eq('status', 'ACTIVE');

  // Group by asset_id
  const bookingsByAsset = new Map<string, BookingSource[]>();

  for (const b of (allBookings || [])) {
    const campaign = b.campaigns as any;
    if (!campaign || campaign.is_deleted) continue;
    if (EXCLUDED_CAMPAIGN_STATUSES.includes(campaign.status)) continue;

    const dates = resolveBookingDates(b, campaign);
    if (!dates) continue;

    const sources = bookingsByAsset.get(b.asset_id) || [];
    sources.push({
      sourceType: 'campaign',
      sourceId: campaign.id,
      sourceNumber: campaign.campaign_name,
      clientName: campaign.client_name,
      startDate: dates.start,
      endDate: dates.end,
      status: campaign.status,
    });
    bookingsByAsset.set(b.asset_id, sources);
  }

  for (const h of (allHolds || [])) {
    if (!h.start_date || !h.end_date) continue;
    const sources = bookingsByAsset.get(h.asset_id) || [];
    sources.push({
      sourceType: 'hold',
      sourceId: h.id,
      clientName: h.client_name || undefined,
      startDate: toDateString(h.start_date),
      endDate: toDateString(h.end_date),
      status: 'ACTIVE',
    });
    bookingsByAsset.set(h.asset_id, sources);
  }

  // Compute availability for each asset
  for (const assetId of assetIds) {
    const assetBookings = bookingsByAsset.get(assetId) || [];
    const overlapping = assetBookings.filter(b =>
      datesOverlap(b.startDate, b.endDate, rangeStart, rangeEnd)
    );

    if (overlapping.length === 0) {
      results.set(assetId, { availability: 'Vacant', hasConflict: false, allBookings: assetBookings });
      continue;
    }

    const primaryBooking = overlapping.find(b => b.sourceType === 'campaign') || overlapping[0];
    let availability: BookingAvailability = 'Booked';

    if (primaryBooking.sourceType === 'hold') {
      availability = 'Blocked';
    } else if (primaryBooking.sourceType === 'campaign') {
      const isRunning = datesOverlap(primaryBooking.startDate, primaryBooking.endDate, today, today);
      const isFuture = primaryBooking.startDate > today;
      availability = isRunning ? 'Running' : isFuture ? 'Upcoming' : 'Booked';
    }

    results.set(assetId, {
      availability,
      sourceType: primaryBooking.sourceType,
      sourceId: primaryBooking.sourceId,
      sourceNumber: primaryBooking.sourceNumber,
      startDate: primaryBooking.startDate,
      endDate: primaryBooking.endDate,
      clientName: primaryBooking.clientName,
      hasConflict: true,
      allBookings: assetBookings,
    });
  }

  return results;
}

// ─── Dashboard Counters ─────────────────────────────────────────

/**
 * Get vacancy/booked counts for a company's entire inventory.
 * Used by Dashboard KPI cards.
 * Both active and dropped assets are included — effective dates control the window.
 */
export async function getCompanyAvailabilityCounts(
  companyId: string
): Promise<{ total: number; vacant: number; booked: number; running: number; upcoming: number; blocked: number }> {
  const today = toDateString(new Date());

  // Get all active asset IDs (exclude removed/inactive)
  const { data: assets } = await supabase
    .from('media_assets')
    .select('id')
    .eq('company_id', companyId)
    .eq('operational_status', 'active');

  const allIds = (assets || []).map(a => a.id);
  if (allIds.length === 0) return { total: 0, vacant: 0, booked: 0, running: 0, upcoming: 0, blocked: 0 };

  // Check ALL campaign_assets (active + dropped) — effective dates control the window
  const { data: activeBookings } = await supabase
    .from('campaign_assets')
    .select('asset_id, effective_start_date, effective_end_date, booking_start_date, booking_end_date, is_removed, campaigns!inner(status, is_deleted)')
    .in('asset_id', allIds);

  // Check holds overlapping today
  const { data: activeHolds } = await supabase
    .from('asset_holds')
    .select('asset_id')
    .in('asset_id', allIds)
    .eq('status', 'ACTIVE')
    .lte('start_date', today)
    .gte('end_date', today);

  const bookedIds = new Set<string>();
  const runningIds = new Set<string>();
  const upcomingIds = new Set<string>();
  const blockedIds = new Set<string>();

  for (const b of (activeBookings || [])) {
    const campaign = b.campaigns as any;
    if (!campaign || campaign.is_deleted) continue;
    if (EXCLUDED_CAMPAIGN_STATUSES.includes(campaign.status)) continue;

    const bStart = toDateString(b.effective_start_date || b.booking_start_date);
    const bEnd = toDateString(b.effective_end_date || b.booking_end_date);
    if (!bStart || !bEnd) continue;

    if (datesOverlap(bStart, bEnd, today, today)) {
      runningIds.add(b.asset_id);
      bookedIds.add(b.asset_id);
    } else if (bStart > today) {
      upcomingIds.add(b.asset_id);
      bookedIds.add(b.asset_id);
    }
  }

  for (const h of (activeHolds || [])) {
    blockedIds.add(h.asset_id);
    bookedIds.add(h.asset_id);
  }

  const vacant = allIds.length - bookedIds.size;

  return {
    total: allIds.length,
    vacant: Math.max(0, vacant),
    booked: bookedIds.size,
    running: runningIds.size,
    upcoming: upcomingIds.size,
    blocked: blockedIds.size,
  };
}

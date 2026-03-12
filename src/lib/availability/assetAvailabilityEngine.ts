/**
 * Asset Availability Engine — Unified availability layer powered by asset_availability_view.
 *
 * This module provides the canonical API for all availability queries across Go-Ads.
 * It replaces scattered campaign_assets + asset_holds queries with a single SQL view.
 *
 * Consumers: Plan picker, Campaign picker, Vacant report, Dashboard KPIs,
 *            Tooltips, Booking diagnostics, AI recommendations, Exports.
 *
 * Business rules enforced by the view:
 *  1. Dropped campaign assets block only up to effective_end_date
 *  2. Holds block only during active hold dates
 *  3. Cancelled/Archived/Completed campaigns excluded
 *  4. Every asset appears (even if fully available)
 */

import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────

export type AvailabilityStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'BOOKED'
  | 'RUNNING'
  | 'FUTURE_BOOKED'
  | 'MAINTENANCE'
  | 'UNAVAILABLE';

export type BookingType = 'CAMPAIGN' | 'HOLD' | null;

export interface AssetAvailabilityRow {
  asset_id: string;
  media_asset_code: string | null;
  location: string | null;
  area: string | null;
  city: string | null;
  media_type: string | null;
  category: string | null;
  size: string | null;
  facing: string | null;
  authority: string | null;
  illumination_type: string | null;
  total_sqft: number | null;
  card_rate: number | null;
  base_rate: number | null;
  company_id: string | null;
  availability_status: AvailabilityStatus;
  booking_type: BookingType;
  current_campaign_id: string | null;
  current_campaign_name: string | null;
  current_plan_id: string | null;
  current_plan_name: string | null;
  client_name: string | null;
  booking_start_date: string | null;
  booking_end_date: string | null;
  effective_booking_start: string | null;
  effective_booking_end: string | null;
  is_running: boolean;
  is_future_booking: boolean;
  is_held: boolean;
  next_available_date: string | null;
  display_label: string | null;
}

export interface AssetAvailabilitySummary {
  asset_id: string;
  media_asset_code: string | null;
  location: string | null;
  availability_status: AvailabilityStatus;
  booking_type: BookingType;
  blocking_entity_id: string | null;
  blocking_entity_name: string | null;
  client_name: string | null;
  booking_start: string | null;
  booking_end: string | null;
  next_available_date: string | null;
  is_available_for_range: boolean;
  all_bookings: AssetAvailabilityRow[];
}

// ─── Date helpers ────────────────────────────────────────────────

function toDateStr(d: string | Date | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  return format(d, 'yyyy-MM-dd');
}

function rangesOverlap(
  s1: string, e1: string,
  s2: string, e2: string
): boolean {
  return s1 <= e2 && e1 >= s2;
}

// ─── Core query builder ─────────────────────────────────────────

const VIEW_COLUMNS = `
  asset_id, media_asset_code, location, area, city, media_type, category,
  size, facing, authority, illumination_type, total_sqft, card_rate, base_rate,
  company_id, availability_status, booking_type,
  current_campaign_id, current_campaign_name,
  current_plan_id, current_plan_name, client_name,
  booking_start_date, booking_end_date,
  effective_booking_start, effective_booking_end,
  is_running, is_future_booking, is_held,
  next_available_date, display_label
`;

// ─── Public API ─────────────────────────────────────────────────

/**
 * Get full availability info for a single asset within a date range.
 * Returns all booking windows that overlap the requested range,
 * plus a summary status.
 */
export async function getAssetAvailabilityFromView(
  assetId: string,
  startDate: string,
  endDate: string,
  excludeCampaignId?: string | null
): Promise<AssetAvailabilitySummary> {
  const s = toDateStr(startDate);
  const e = toDateStr(endDate);

  let query = supabase
    .from('asset_availability_view')
    .select(VIEW_COLUMNS)
    .eq('asset_id', assetId);

  if (excludeCampaignId) {
    query = query.or(`current_campaign_id.is.null,current_campaign_id.neq.${excludeCampaignId}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[availabilityEngine] Query error:', error);
    return makeVacantSummary(assetId);
  }

  const rows = (data || []) as AssetAvailabilityRow[];
  return summarizeForRange(assetId, rows, s, e);
}

/**
 * Batch availability check for multiple assets.
 * Single DB round-trip — critical for plan/campaign pickers.
 */
export async function getAssetAvailabilityBatch(
  assetIds: string[],
  startDate: string,
  endDate: string,
  excludeCampaignId?: string | null
): Promise<Map<string, AssetAvailabilitySummary>> {
  const results = new Map<string, AssetAvailabilitySummary>();
  if (assetIds.length === 0) return results;

  const s = toDateStr(startDate);
  const e = toDateStr(endDate);

  // Supabase .in() supports up to ~300 IDs; chunk if needed
  const chunkSize = 200;
  const allRows: AssetAvailabilityRow[] = [];

  for (let i = 0; i < assetIds.length; i += chunkSize) {
    const chunk = assetIds.slice(i, i + chunkSize);
    let query = supabase
      .from('asset_availability_view')
      .select(VIEW_COLUMNS)
      .in('asset_id', chunk);

    if (excludeCampaignId) {
      query = query.or(`current_campaign_id.is.null,current_campaign_id.neq.${excludeCampaignId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[availabilityEngine] Batch query error:', error);
    } else {
      allRows.push(...((data || []) as AssetAvailabilityRow[]));
    }
  }

  // Group by asset_id
  const grouped = new Map<string, AssetAvailabilityRow[]>();
  for (const row of allRows) {
    const existing = grouped.get(row.asset_id) || [];
    existing.push(row);
    grouped.set(row.asset_id, existing);
  }

  // Compute summary for each asset
  for (const assetId of assetIds) {
    const rows = grouped.get(assetId) || [];
    results.set(assetId, summarizeForRange(assetId, rows, s, e));
  }

  return results;
}

/**
 * Get all assets available for a given date range.
 * Used by Vacant Media Report and AI asset recommendations.
 */
export async function getAvailableAssetsForRange(
  startDate: string,
  endDate: string,
  filters?: {
    city?: string;
    area?: string;
    media_type?: string;
    company_id?: string;
  }
): Promise<AssetAvailabilityRow[]> {
  const s = toDateStr(startDate);
  const e = toDateStr(endDate);

  // First get all assets from the view
  let query = supabase
    .from('asset_availability_view')
    .select(VIEW_COLUMNS);

  if (filters?.city) query = query.eq('city', filters.city);
  if (filters?.area) query = query.eq('area', filters.area);
  if (filters?.media_type) query = query.eq('media_type', filters.media_type);
  if (filters?.company_id) query = query.eq('company_id', filters.company_id);

  const { data, error } = await query;
  if (error) {
    console.error('[availabilityEngine] getAvailable error:', error);
    return [];
  }

  const rows = (data || []) as AssetAvailabilityRow[];

  // Group by asset_id and check which are available for the range
  const grouped = new Map<string, AssetAvailabilityRow[]>();
  for (const row of rows) {
    const existing = grouped.get(row.asset_id) || [];
    existing.push(row);
    grouped.set(row.asset_id, existing);
  }

  const availableAssets: AssetAvailabilityRow[] = [];

  for (const [assetId, assetRows] of grouped) {
    // Check if any booking overlaps the requested range
    const hasOverlap = assetRows.some(r =>
      r.booking_start_date && r.booking_end_date &&
      r.booking_type !== null &&
      rangesOverlap(r.booking_start_date, r.booking_end_date, s, e)
    );

    if (!hasOverlap) {
      // Use the base row (AVAILABLE status) or first row for asset info
      const baseRow = assetRows.find(r => r.availability_status === 'AVAILABLE') || assetRows[0];
      availableAssets.push({
        ...baseRow,
        availability_status: 'AVAILABLE',
      });
    }
  }

  return availableAssets;
}

/**
 * Get tooltip-friendly booking info for an asset.
 * Returns formatted text for hover tooltips in pickers.
 */
export async function getAssetBookingTooltipFromView(
  assetId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  status: AvailabilityStatus;
  tooltipLines: string[];
  bookings: Array<{
    type: BookingType;
    name: string;
    clientName: string | null;
    startDate: string;
    endDate: string;
  }>;
  nextAvailableDate: string | null;
}> {
  const today = toDateStr(new Date());
  const s = startDate || today;
  const e = endDate || today;

  const { data, error } = await supabase
    .from('asset_availability_view')
    .select(VIEW_COLUMNS)
    .eq('asset_id', assetId);

  if (error || !data || data.length === 0) {
    return { status: 'AVAILABLE', tooltipLines: ['Available'], bookings: [], nextAvailableDate: null };
  }

  const rows = (data as AssetAvailabilityRow[]);
  const overlapping = rows.filter(r =>
    r.booking_start_date && r.booking_end_date &&
    r.booking_type !== null &&
    rangesOverlap(r.booking_start_date, r.booking_end_date, s, e)
  );

  if (overlapping.length === 0) {
    return { status: 'AVAILABLE', tooltipLines: ['Available'], bookings: [], nextAvailableDate: null };
  }

  const bookings = overlapping.map(r => ({
    type: r.booking_type,
    name: r.current_campaign_name || r.current_plan_name || 'Booking',
    clientName: r.client_name,
    startDate: r.booking_start_date!,
    endDate: r.booking_end_date!,
  }));

  const tooltipLines: string[] = [];
  for (const b of bookings) {
    const typeLabel = b.type === 'CAMPAIGN'
      ? (overlapping.find(r => r.is_running) ? 'Running Campaign' : 'Booked Campaign')
      : 'On Hold';
    tooltipLines.push(typeLabel);
    if (b.clientName) tooltipLines.push(`Client: ${b.clientName}`);
    tooltipLines.push(`${b.name}`);
    const sFormatted = formatDisplayDate(b.startDate);
    const eFormatted = formatDisplayDate(b.endDate);
    tooltipLines.push(`${sFormatted} → ${eFormatted}`);
  }

  // Next available date
  const nextAvail = rows.find(r => r.next_available_date)?.next_available_date || null;
  if (nextAvail) {
    tooltipLines.push(`Available from: ${formatDisplayDate(nextAvail)}`);
  }

  const primary = overlapping[0];
  const status: AvailabilityStatus = primary.is_running
    ? 'RUNNING'
    : primary.booking_type === 'HOLD'
      ? 'HELD'
      : primary.is_future_booking
        ? 'FUTURE_BOOKED'
        : 'BOOKED';

  return { status, tooltipLines, bookings, nextAvailableDate: nextAvail };
}

// ─── Internal helpers ───────────────────────────────────────────

function summarizeForRange(
  assetId: string,
  rows: AssetAvailabilityRow[],
  rangeStart: string,
  rangeEnd: string
): AssetAvailabilitySummary {
  if (rows.length === 0) {
    return makeVacantSummary(assetId);
  }

  // Find bookings that overlap the requested range
  const overlapping = rows.filter(r =>
    r.booking_start_date && r.booking_end_date &&
    r.booking_type !== null &&
    rangesOverlap(r.booking_start_date, r.booking_end_date, rangeStart, rangeEnd)
  );

  const baseRow = rows[0];

  if (overlapping.length === 0) {
    return {
      asset_id: assetId,
      media_asset_code: baseRow.media_asset_code,
      location: baseRow.location,
      availability_status: 'AVAILABLE',
      booking_type: null,
      blocking_entity_id: null,
      blocking_entity_name: null,
      client_name: null,
      booking_start: null,
      booking_end: null,
      next_available_date: baseRow.next_available_date,
      is_available_for_range: true,
      all_bookings: rows,
    };
  }

  // Prefer campaign over hold for primary blocking entry
  const primary = overlapping.find(r => r.booking_type === 'CAMPAIGN') || overlapping[0];

  let status: AvailabilityStatus = 'BOOKED';
  if (primary.is_running) status = 'RUNNING';
  else if (primary.booking_type === 'HOLD') status = 'HELD';
  else if (primary.is_future_booking) status = 'FUTURE_BOOKED';

  return {
    asset_id: assetId,
    media_asset_code: baseRow.media_asset_code,
    location: baseRow.location,
    availability_status: status,
    booking_type: primary.booking_type,
    blocking_entity_id: primary.current_campaign_id || primary.current_plan_id,
    blocking_entity_name: primary.current_campaign_name || primary.current_plan_name,
    client_name: primary.client_name,
    booking_start: primary.booking_start_date,
    booking_end: primary.booking_end_date,
    next_available_date: baseRow.next_available_date,
    is_available_for_range: false,
    all_bookings: rows,
  };
}

function makeVacantSummary(assetId: string): AssetAvailabilitySummary {
  return {
    asset_id: assetId,
    media_asset_code: null,
    location: null,
    availability_status: 'AVAILABLE',
    booking_type: null,
    blocking_entity_id: null,
    blocking_entity_name: null,
    client_name: null,
    booking_start: null,
    booking_end: null,
    next_available_date: null,
    is_available_for_range: true,
    all_bookings: [],
  };
}

function formatDisplayDate(d: string): string {
  try {
    return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy');
  } catch {
    return d;
  }
}

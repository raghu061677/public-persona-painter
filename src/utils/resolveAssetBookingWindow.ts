/**
 * resolveAssetBookingWindow — Central helper for resolving the authoritative
 * booking window for a campaign asset row.
 *
 * RULE: Campaign-level dates are informational only after asset rows exist.
 *       Asset-wise dates are the authoritative source for:
 *       - availability / vacancy
 *       - conflict detection
 *       - booked status
 *       - per-asset revenue & proration
 *       - drop/removal logic
 *       - dashboard counts & reports
 *
 * Priority:
 *   1. effective_start_date / effective_end_date
 *   2. booking_start_date / booking_end_date
 *   3. start_date / end_date (asset-level)
 *   4. campaign start_date / end_date (fallback for initial creation only)
 */

import { toDateString } from "@/lib/availability/dateOverlap";

export interface BookingWindowInput {
  effective_start_date?: string | Date | null;
  effective_end_date?: string | Date | null;
  booking_start_date?: string | Date | null;
  booking_end_date?: string | Date | null;
  start_date?: string | Date | null;
  end_date?: string | Date | null;
}

export interface CampaignDates {
  start_date?: string | Date | null;
  end_date?: string | Date | null;
}

export interface BookingWindow {
  startDate: string;
  endDate: string;
}

/**
 * Resolve the authoritative booking window for a campaign asset row.
 * Returns normalized YYYY-MM-DD strings.
 */
export function resolveAssetBookingWindow(
  assetRow: BookingWindowInput,
  campaignDates?: CampaignDates | null
): BookingWindow {
  const start =
    toDateString(assetRow.effective_start_date as any) ||
    toDateString(assetRow.booking_start_date as any) ||
    toDateString(assetRow.start_date as any) ||
    (campaignDates ? toDateString(campaignDates.start_date as any) : '') ||
    toDateString(new Date());

  const end =
    toDateString(assetRow.effective_end_date as any) ||
    toDateString(assetRow.booking_end_date as any) ||
    toDateString(assetRow.end_date as any) ||
    (campaignDates ? toDateString(campaignDates.end_date as any) : '') ||
    toDateString(new Date());

  return { startDate: start, endDate: end };
}

/**
 * Given a list of existing bookings for an asset, compute the first available
 * date after all overlapping bookings end.
 *
 * Returns null if the asset is fully available for the requested range.
 */
export function computeFirstAvailableDate(
  existingBookings: Array<{ startDate: string; endDate: string }>,
  requestedStart: string,
  requestedEnd: string
): string | null {
  if (!existingBookings.length) return null;

  // Find bookings that overlap with the requested range
  const overlapping = existingBookings.filter(b => {
    return b.startDate <= requestedEnd && b.endDate >= requestedStart;
  });

  if (overlapping.length === 0) return null;

  // Find the latest end date among overlapping bookings
  const latestEnd = overlapping.reduce((max, b) => {
    return b.endDate > max ? b.endDate : max;
  }, overlapping[0].endDate);

  // First available = day after the latest overlapping end
  const endDate = new Date(latestEnd + 'T00:00:00');
  endDate.setDate(endDate.getDate() + 1);
  const firstAvailable = endDate.toISOString().split('T')[0];

  // If first available is after requested end, this is a true conflict
  if (firstAvailable > requestedEnd) return null;

  return firstAvailable;
}

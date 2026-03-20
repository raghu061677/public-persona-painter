/**
 * Date validation and normalization helpers.
 */

/** Parse a date string or Date to a valid Date, or null if invalid */
export function safeDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Returns true if start_date > end_date (i.e., the range is inverted) */
export function isInvertedDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): boolean {
  const s = safeDate(start);
  const e = safeDate(end);
  if (!s || !e) return false;
  return s > e;
}

/** Returns true if a booking range [bStart, bEnd] falls entirely outside campaign [cStart, cEnd] */
export function isBookingOutsideCampaign(
  bookingStart: string | Date | null | undefined,
  bookingEnd: string | Date | null | undefined,
  campaignStart: string | Date | null | undefined,
  campaignEnd: string | Date | null | undefined,
): boolean {
  const bS = safeDate(bookingStart);
  const bE = safeDate(bookingEnd);
  const cS = safeDate(campaignStart);
  const cE = safeDate(campaignEnd);
  if (!bS || !bE || !cS || !cE) return false;
  return bE < cS || bS > cE;
}

/** Format a date safely, returning fallback on failure */
export function safeDateString(value: string | Date | null | undefined, fallback = "—"): string {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toISOString().substring(0, 10);
}

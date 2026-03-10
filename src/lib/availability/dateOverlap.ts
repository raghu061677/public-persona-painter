/**
 * Date Overlap Utilities — Single source of truth for all date range overlap checks.
 *
 * Every module (plan builder, campaign conflict, vacant/booked reports, dashboard)
 * MUST use these helpers instead of inline overlap logic.
 */

/**
 * Canonical date overlap check.
 * Two ranges overlap when: start1 <= end2 AND end1 >= start2
 */
export function datesOverlap(
  start1: string | Date,
  end1: string | Date,
  start2: string | Date,
  end2: string | Date
): boolean {
  const s1 = toDateOnly(start1);
  const e1 = toDateOnly(end1);
  const s2 = toDateOnly(start2);
  const e2 = toDateOnly(end2);
  return s1 <= e2 && e1 >= s2;
}

/**
 * Check if a date falls within a range (inclusive).
 */
export function dateInRange(
  date: string | Date,
  rangeStart: string | Date,
  rangeEnd: string | Date
): boolean {
  const d = toDateOnly(date);
  const s = toDateOnly(rangeStart);
  const e = toDateOnly(rangeEnd);
  return d >= s && d <= e;
}

/**
 * Check if rangeA fully contains rangeB.
 */
export function rangeContains(
  outerStart: string | Date,
  outerEnd: string | Date,
  innerStart: string | Date,
  innerEnd: string | Date
): boolean {
  const os = toDateOnly(outerStart);
  const oe = toDateOnly(outerEnd);
  const is_ = toDateOnly(innerStart);
  const ie = toDateOnly(innerEnd);
  return os <= is_ && oe >= ie;
}

/**
 * Normalize a date value to a YYYY-MM-DD string for consistent comparison.
 */
export function toDateString(d: string | Date | null | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.split('T')[0];
  return d.toISOString().split('T')[0];
}

/**
 * Normalize to a midnight Date object for comparison.
 */
function toDateOnly(d: string | Date): Date {
  const date = typeof d === 'string' ? new Date(d.split('T')[0] + 'T00:00:00') : new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Campaign Duration Utility for Go-Ads 360°
 * 
 * Calculates actual day-based campaign duration instead of
 * approximating to "1 Month". OOH billing must be based on actual days.
 */

export interface CampaignDuration {
  totalDays: number;
  totalWeeks: number;
  approxMonths: number;
}

/**
 * Calculate campaign duration from start and end dates.
 * totalDays is inclusive (both start and end date count).
 */
export function calculateCampaignDuration(
  startDate: string | Date,
  endDate: string | Date
): CampaignDuration {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { totalDays: 0, totalWeeks: 0, approxMonths: 0 };
  }

  const diffMs = end.getTime() - start.getTime();
  const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const totalWeeks = Math.floor(totalDays / 7);
  const approxMonths = Math.round(totalDays / 30);

  return { totalDays, totalWeeks, approxMonths };
}

/**
 * Format duration for display in PDFs and exports.
 * Always shows actual days. Appends approximate month info for longer durations.
 * 
 * Examples:
 *   7 → "7 Days"
 *   30 → "30 Days"
 *   60 → "60 Days (≈ 2 Months)"
 */
export function getDurationDisplay(days: number): string {
  if (days <= 0) return '-';
  if (days === 1) return '1 Day';
  return `${days} Days`;
}

/**
 * Format duration with approximate month annotation for summary blocks.
 * 
 * Examples:
 *   30 → "30 Days (≈ 1 Month)"
 *   45 → "45 Days (≈ 2 Months)"
 *   7  → "7 Days"
 */
export function getDurationDisplayWithMonths(days: number): string {
  if (days <= 0) return '-';
  if (days === 1) return '1 Day';
  
  const approxMonths = Math.round(days / 30);
  if (approxMonths >= 1) {
    return `${days} Days (≈ ${approxMonths} Month${approxMonths > 1 ? 's' : ''})`;
  }
  return `${days} Days`;
}

/**
 * Shared Availability Timeline formatter for the Vacant Media report.
 *
 * Single source of truth used by:
 *  - On-screen table cell (Availability Timeline column)
 *  - Excel export (via valueOverrides)
 *  - PDF export (via valueOverrides)
 *  - Custom Fields Excel export
 *  - Proposal PPT export
 *
 * Does NOT recompute vacancy logic — only renders the already-resolved
 * availability_status, dates and reason fields into a consistent flat
 * text representation.
 */

/** Format a date string to Indian DD/MM/YYYY (returns '-' on invalid) */
export function formatDateIN(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

export interface TimelineLine {
  label?: string;
  value: string;
}

export interface AvailabilityTimelineRowLike {
  availability_status?: string | null;
  booked_till?: string | null;
  available_from?: string | null;
  hold_end_date?: string | null;
  deactivation_reason?: string | null;
  block_reason?: string | null;
}

/**
 * Build a structured 1–3 line timeline explanation from a row.
 * Reuses the row's already-resolved fields without re-deriving status.
 */
export function buildAvailabilityTimeline(
  row: AvailabilityTimelineRowLike,
): { lines: TimelineLine[] } {
  const lines: TimelineLine[] = [];
  const status = row?.availability_status;
  const bookedTill = formatDateIN(row?.booked_till);
  const availFrom = formatDateIN(row?.available_from);
  const holdEnd = formatDateIN(row?.hold_end_date);
  const reason = row?.deactivation_reason || row?.block_reason || null;

  switch (status) {
    case "VACANT_NOW":
      lines.push({ value: "Available now" });
      if (row?.booked_till) lines.push({ label: "Next booked till", value: bookedTill });
      break;
    case "AVAILABLE_SOON":
    case "BOOKED_THROUGH_RANGE":
      if (row?.booked_till) lines.push({ label: "Booked till", value: bookedTill });
      if (row?.available_from) lines.push({ label: "Available from", value: availFrom });
      if (lines.length === 0) lines.push({ value: "Booked" });
      break;
    case "HELD":
      if (row?.hold_end_date) lines.push({ label: "Held till", value: holdEnd });
      if (row?.available_from) lines.push({ label: "Available from", value: availFrom });
      if (lines.length === 0) lines.push({ value: "On hold" });
      break;
    case "MAINTENANCE":
      lines.push({ value: "Under maintenance" });
      if (reason) lines.push({ label: "Reason", value: reason });
      break;
    case "REMOVED":
      lines.push({ value: "Removed" });
      if (reason) lines.push({ label: "Reason", value: reason });
      break;
    case "INACTIVE":
      lines.push({ value: "Inactive" });
      if (reason) lines.push({ label: "Reason", value: reason });
      break;
    default:
      if (row?.booked_till) lines.push({ label: "Booked till", value: bookedTill });
      if (row?.available_from) lines.push({ label: "Available from", value: availFrom });
      if (lines.length === 0) lines.push({ value: "-" });
  }
  return { lines };
}

/**
 * Flat single-line text representation of the timeline.
 * Used identically across Excel / PDF / Custom / Proposal exports.
 * Example: "Booked till: 13/10/2026 | Available from: 14/10/2026"
 */
export function timelineAsText(row: AvailabilityTimelineRowLike): string {
  const { lines } = buildAvailabilityTimeline(row);
  return lines.map((l) => (l.label ? `${l.label}: ${l.value}` : l.value)).join(" | ");
}

/** Map operational_status enum to a readable label for exports/UI */
export function operationalStatusLabel(s: string | null | undefined): string {
  if (!s) return "-";
  switch (s) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "removed":
      return "Removed";
    case "maintenance":
      return "Under Maintenance";
    default:
      return s;
  }
}
/**
 * Booking Status Label Helper
 *
 * Produces a compact, business-friendly label for the Media Assets table
 * "Booking Status" column based on the row's `booking_hover_info` summary
 * already enriched in MediaAssetsControlCenter.
 *
 * Examples:
 *   - "Available"
 *   - "Booked till 13 Oct 2026"
 *   - "Held till 25 Apr 2026"
 *   - "Blocked till 30 Nov 2026"
 * Falls back safely to "Booked" / "Held" / "Blocked" when the end date
 * is missing or unparseable.
 */

export type BookingHoverInfoLite = {
  current_status?:
    | "Available"
    | "Booked"
    | "Held"
    | "Blocked"
    | "Removed"
    | "Under Maintenance"
    | "Inactive"
    | string
    | null;
  current_end_date?: string | null;
} | null | undefined;

function formatDDMMMYYYY(value: string | null | undefined): string | null {
  if (!value) return null;
  // Parse YYYY-MM-DD (or ISO) without timezone shifting the day.
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export interface BookingStatusLabel {
  /** Bucket used for badge styling: Available | Booked | Held | Blocked */
  bucket:
    | "Available"
    | "Booked"
    | "Held"
    | "Blocked"
    | "Removed"
    | "Under Maintenance"
    | "Inactive";
  /** Display text for the cell */
  text: string;
}

export function getBookingStatusLabel(
  info: BookingHoverInfoLite,
  fallbackStatus?: string | null,
): BookingStatusLabel {
  const status = (info?.current_status || fallbackStatus || "Available") as string;

  // Booked / Held render with end date when available.
  if (status === "Booked" || status === "Held") {
    const endLabel = formatDDMMMYYYY(info?.current_end_date);
    return {
      bucket: status,
      text: endLabel ? `${status} till ${endLabel}` : status,
    };
  }

  // Operational/manual statuses render as plain labels (no "till …" suffix,
  // since they have no scheduled end).
  if (status === "Removed") {
    return { bucket: "Removed", text: "Removed" };
  }
  if (status === "Under Maintenance") {
    return { bucket: "Under Maintenance", text: "Under Maintenance" };
  }
  if (status === "Inactive") {
    return { bucket: "Inactive", text: "Inactive" };
  }
  if (status === "Blocked") {
    return { bucket: "Blocked", text: "Blocked" };
  }

  return { bucket: "Available", text: "Available" };
}

/** Tailwind classes per bucket — consistent with existing Ops Status pill style. */
export const BOOKING_STATUS_BUCKET_CLASS: Record<
  BookingStatusLabel["bucket"],
  string
> = {
  Available: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Booked: "bg-blue-100 text-blue-700 border-blue-200",
  Held: "bg-amber-100 text-amber-700 border-amber-200",
  Blocked: "bg-red-100 text-red-700 border-red-200",
  Removed: "bg-red-100 text-red-700 border-red-200",
  "Under Maintenance": "bg-amber-100 text-amber-700 border-amber-200",
  Inactive: "bg-gray-100 text-gray-700 border-gray-200",
};
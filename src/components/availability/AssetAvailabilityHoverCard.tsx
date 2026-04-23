/**
 * AssetAvailabilityHoverCard — Shared, normalized hover popup for asset availability
 * across Plans (asset picker, selected asset table) and Campaigns (Add Assets dialog).
 *
 * Hover-only. Uses Radix HoverCard with `asChild` to preserve underlying click behavior.
 * Rendering only — no business logic. Callers map their domain data into NormalizedAvailability
 * via the provided adapter helpers (fromPlanSummary / fromCampaignConflict).
 */
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  User,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Shield,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import type { AssetAvailabilitySummary } from "@/lib/availability";

// ─── Normalized prop shape ──────────────────────────────────────────────

export type NormalizedAvailabilityState =
  | "AVAILABLE"
  | "RUNNING"
  | "FUTURE_BOOKED"
  | "HELD"
  | "AVAILABLE_ADJUSTED"
  | "CONFLICT";

export interface OverlappingBookingRef {
  name: string;
  client?: string | null;
  startDate: string;
  endDate: string;
}

export interface NormalizedAvailability {
  state: NormalizedAvailabilityState;
  /** Header title (e.g. "Available Now", "Currently Booked", "Available from 12 May"). */
  title: string;
  /** Optional secondary muted line under the title. */
  subtitle?: string | null;
  /** Current blocking entity (campaign / hold / plan). */
  current?: {
    label?: string;
    name?: string | null;
    client?: string | null;
    start?: string | null;
    end?: string | null;
  } | null;
  /** Next / upcoming booking after a free window. */
  next?: {
    label?: string;
    name?: string | null;
    client?: string | null;
    start?: string | null;
    end?: string | null;
  } | null;
  /** Suggested adjusted dates when planning/booking can shift. */
  suggestedStart?: string | null;
  suggestedEnd?: string | null;
  /** Next free date (when known). */
  nextAvailableDate?: string | null;
  /** Overlapping bookings/conflicts with the requested window. */
  overlappingBookings?: OverlappingBookingRef[];
}

// ─── Adapters ───────────────────────────────────────────────────────────

/** Map plans' AssetAvailabilitySummary → NormalizedAvailability */
export function fromPlanSummary(summary: AssetAvailabilitySummary): NormalizedAvailability {
  const status = summary.availability_status;
  const start = summary.booking_start;
  const end = summary.booking_end;
  const nextAvail = summary.next_available_date;

  if (status === "AVAILABLE") {
    // Look ahead — is there an upcoming booking in summary.all_bookings?
    const upcoming = (summary.all_bookings || []).find(
      (b) => b.is_future_booking && b.effective_booking_start
    );
    return {
      state: "AVAILABLE",
      title: "Available Now",
      subtitle: upcoming ? "Free until next booking" : "Ready for planning",
      next: upcoming
        ? {
            label: upcoming.booking_type === "HOLD" ? "Upcoming Hold" : "Upcoming Booking",
            name: upcoming.current_campaign_name || upcoming.current_plan_name,
            client: upcoming.client_name,
            start: upcoming.effective_booking_start,
            end: upcoming.effective_booking_end,
          }
        : null,
    };
  }

  const isHeld = status === "HELD";
  const isRunning = status === "RUNNING";
  const isFuture = status === "FUTURE_BOOKED";

  return {
    state: status === "HELD" ? "HELD" : isRunning ? "RUNNING" : isFuture ? "FUTURE_BOOKED" : "RUNNING",
    title: isHeld
      ? "Currently Held"
      : isRunning
        ? "Currently Booked"
        : isFuture
          ? "Future Booked"
          : "Unavailable",
    subtitle: nextAvail ? `Next available ${format(new Date(nextAvail + "T00:00:00"), "dd MMM yyyy")}` : null,
    current: {
      label: summary.booking_type === "HOLD" ? "Hold" : summary.booking_type === "CAMPAIGN" ? "Campaign" : "Booking",
      name: summary.blocking_entity_name || summary.blocking_entity_id,
      client: summary.client_name,
      start,
      end,
    },
    nextAvailableDate: nextAvail,
  };
}

/** Map campaigns' per-asset conflict info → NormalizedAvailability */
export function fromCampaignConflict(info: {
  status: "available" | "available_adjusted" | "conflict" | "upcoming" | string;
  suggestedStartDate: string | null;
  suggestedEndDate: string | null;
  overlappingBookings: Array<{ campaignName: string; startDate: string; endDate: string; clientName?: string | null }>;
}): NormalizedAvailability {
  if (info.status === "available") {
    return {
      state: "AVAILABLE",
      title: "Available for Selected Dates",
      subtitle: "No overlap with existing bookings",
    };
  }

  const overlap = (info.overlappingBookings || []).map((b) => ({
    name: b.campaignName,
    client: b.clientName ?? null,
    startDate: b.startDate,
    endDate: b.endDate,
  }));

  if (info.status === "available_adjusted" || info.status === "upcoming") {
    let title = "Available with Adjusted Dates";
    if (info.suggestedStartDate) {
      title = `Available from ${format(new Date(info.suggestedStartDate + "T00:00:00"), "dd MMM yyyy")}`;
    } else if (info.suggestedEndDate) {
      title = `Available until ${format(new Date(info.suggestedEndDate + "T00:00:00"), "dd MMM yyyy")}`;
    }
    return {
      state: "AVAILABLE_ADJUSTED",
      title,
      subtitle: "Booking dates will auto-adjust when added",
      suggestedStart: info.suggestedStartDate,
      suggestedEnd: info.suggestedEndDate,
      overlappingBookings: overlap,
    };
  }

  return {
    state: "CONFLICT",
    title: "Fully Booked for Selected Dates",
    subtitle: "Asset is blocked for the entire requested window",
    overlappingBookings: overlap,
  };
}

// ─── Visual helpers ─────────────────────────────────────────────────────

const STATE_HEADER: Record<NormalizedAvailabilityState, { className: string; Icon: typeof Calendar; label: string }> = {
  AVAILABLE: {
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    Icon: CheckCircle2,
    label: "Available",
  },
  RUNNING: {
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    Icon: Calendar,
    label: "Running",
  },
  FUTURE_BOOKED: {
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    Icon: CalendarClock,
    label: "Future Booked",
  },
  HELD: {
    className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    Icon: Shield,
    label: "Held",
  },
  AVAILABLE_ADJUSTED: {
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    Icon: Clock,
    label: "Adjusted",
  },
  CONFLICT: {
    className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    Icon: AlertTriangle,
    label: "Conflict",
  },
};

function safeFmt(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    const dt = d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return format(dt, "dd MMM yyyy");
  } catch {
    return null;
  }
}

// ─── Component ──────────────────────────────────────────────────────────

interface AssetAvailabilityHoverCardProps {
  data: NormalizedAvailability;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export function AssetAvailabilityHoverCard({
  data,
  children,
  side = "left",
  align = "start",
}: AssetAvailabilityHoverCardProps) {
  const header = STATE_HEADER[data.state];
  const HeaderIcon = header.Icon;

  const currentStart = safeFmt(data.current?.start);
  const currentEnd = safeFmt(data.current?.end);
  const nextStart = safeFmt(data.next?.start);
  const nextEnd = safeFmt(data.next?.end);
  const nextAvail = safeFmt(data.nextAvailableDate);
  const sStart = safeFmt(data.suggestedStart);
  const sEnd = safeFmt(data.suggestedEnd);

  const hasCurrent = data.current && (data.current.name || currentStart || currentEnd);
  const hasNext = data.next && (data.next.name || nextStart || nextEnd);
  const hasSuggested = sStart || sEnd;
  const overlaps = data.overlappingBookings || [];

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-80 p-0">
        {/* Header */}
        <div className="px-4 py-2.5 border-b flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Availability
            </p>
            <p className="text-sm font-semibold leading-snug line-clamp-2">{data.title}</p>
            {data.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-2">{data.subtitle}</p>
            )}
          </div>
          <Badge variant="outline" className={`${header.className} shrink-0 gap-1 text-[10px]`}>
            <HeaderIcon className="h-3 w-3" />
            {header.label}
          </Badge>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Current booking */}
          {hasCurrent && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {data.current?.label || "Current"}
              </p>
              {data.current?.name && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium line-clamp-2 min-w-0">{data.current.name}</p>
                </div>
              )}
              {data.current?.client && (
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm line-clamp-2 min-w-0">{data.current.client}</p>
                </div>
              )}
              {(currentStart || currentEnd) && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {currentStart || "—"} → {currentEnd || "—"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Next / upcoming */}
          {hasNext && (
            <div className="space-y-1 pt-1 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {data.next?.label || "Upcoming"}
              </p>
              {data.next?.name && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium line-clamp-2 min-w-0">{data.next.name}</p>
                </div>
              )}
              {data.next?.client && (
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm line-clamp-2 min-w-0">{data.next.client}</p>
                </div>
              )}
              {(nextStart || nextEnd) && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    {nextStart || "—"} → {nextEnd || "—"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Suggested availability */}
          {hasSuggested && (
            <div className="space-y-1 pt-1 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Suggested Window
              </p>
              <div className="flex items-start gap-2">
                <CalendarClock className="h-3.5 w-3.5 mt-0.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <p className="text-sm">
                  {sStart && <>From <span className="font-medium">{sStart}</span></>}
                  {sStart && sEnd && " · "}
                  {sEnd && <>Until <span className="font-medium">{sEnd}</span></>}
                </p>
              </div>
            </div>
          )}

          {/* Overlaps (campaigns flow) */}
          {overlaps.length > 0 && (
            <div className="space-y-1 pt-1 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Overlapping Bookings
              </p>
              <div className="space-y-1.5 max-h-32 overflow-auto">
                {overlaps.slice(0, 4).map((o, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-medium line-clamp-1">{o.name}</p>
                    <p className="text-muted-foreground">
                      {safeFmt(o.startDate) || o.startDate} → {safeFmt(o.endDate) || o.endDate}
                    </p>
                  </div>
                ))}
                {overlaps.length > 4 && (
                  <p className="text-[10px] text-muted-foreground">
                    + {overlaps.length - 4} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Next available footer */}
          {nextAvail && data.state !== "AVAILABLE" && (
            <div className="pt-1 border-t">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Next available: {nextAvail}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
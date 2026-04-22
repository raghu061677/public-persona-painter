/**
 * AssetBookingHoverCard — Rich hover popup for Media Assets list rows.
 *
 * Shows current vs next booking/hold and the next available date
 * using a lightweight `booking_hover_info` summary already attached to
 * each asset row by MediaAssetsControlCenter.
 *
 * Pure presentational. No data fetching here — keeps row hover instant.
 */
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Lock, CalendarCheck, CalendarClock, Wrench, Ban, PowerOff } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export type HoverBookingType = "campaign" | "hold" | null;
export type HoverStatus =
  | "Available"
  | "Booked"
  | "Held"
  | "Blocked"
  | "Removed"
  | "Under Maintenance"
  | "Inactive";

export interface AssetBookingHoverInfo {
  current_status: HoverStatus;
  current_booking_type: HoverBookingType;
  current_campaign_name?: string | null;
  current_client_name?: string | null;
  current_hold_type?: string | null;
  current_start_date?: string | null;
  current_end_date?: string | null;
  next_booking_type?: HoverBookingType;
  next_campaign_name?: string | null;
  next_client_name?: string | null;
  next_hold_type?: string | null;
  next_start_date?: string | null;
  next_end_date?: string | null;
  next_available_date?: string | null;
}

interface AssetBookingHoverCardProps {
  info?: AssetBookingHoverInfo | null;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Optional small descriptor under the header title (e.g. asset code). */
  subtitle?: string | null;
}

function safeDate(s?: string | null): Date | null {
  if (!s) return null;
  try {
    const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function fmt(d: Date | null): string {
  return d ? format(d, "dd MMM yyyy") : "—";
}

function statusBadge(status: HoverStatus) {
  switch (status) {
    case "Available":
      return (
        <Badge variant="outline" className="h-5 px-2 gap-1 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3" /> Available
        </Badge>
      );
    case "Booked":
      return (
        <Badge variant="outline" className="h-5 px-2 gap-1 rounded-full text-[10px] font-semibold tracking-wide bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          <CalendarCheck className="h-3 w-3" /> Booked
        </Badge>
      );
    case "Held":
    case "Blocked":
      return (
        <Badge variant="outline" className="h-5 px-2 gap-1 rounded-full text-[10px] font-semibold tracking-wide bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
          <Lock className="h-3 w-3" /> {status}
        </Badge>
      );
    case "Removed":
      return (
        <Badge variant="outline" className="h-5 px-2 gap-1 rounded-full text-[10px] font-semibold tracking-wide bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
          <Ban className="h-3 w-3" /> Removed
        </Badge>
      );
    case "Under Maintenance":
      return (
        <Badge variant="outline" className="h-5 px-2 gap-1 rounded-full text-[10px] font-semibold tracking-wide bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          <Wrench className="h-3 w-3" /> Maintenance
        </Badge>
      );
    case "Inactive":
      return (
        <Badge variant="outline" className="h-5 px-2 gap-1 rounded-full text-[10px] font-semibold tracking-wide bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700">
          <PowerOff className="h-3 w-3" /> Inactive
        </Badge>
      );
  }
}

export function AssetBookingHoverCard({
  info,
  children,
  side = "right",
  align = "start",
  subtitle,
}: AssetBookingHoverCardProps) {
  // Defensive: if no info at all, just render children with no hover overhead
  if (!info) {
    return <>{children}</>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const curStart = safeDate(info.current_start_date);
  const curEnd = safeDate(info.current_end_date);
  const nextStart = safeDate(info.next_start_date);
  const nextEnd = safeDate(info.next_end_date);
  const nextAvail = safeDate(info.next_available_date);

  const remainingDays = curEnd ? Math.max(0, differenceInDays(curEnd, today) + 1) : null;
  const daysUntilAvail = nextAvail ? Math.max(0, differenceInDays(nextAvail, today)) : null;

  const isAvailable = info.current_status === "Available";
  const hasNext = !!(nextStart || nextEnd || info.next_campaign_name || info.next_hold_type);
  const isNonBookable =
    info.current_status === "Removed" ||
    info.current_status === "Under Maintenance" ||
    info.current_status === "Inactive" ||
    info.current_status === "Blocked";

  // Header title reflects the asset's current state
  const headerTitle = isAvailable
    ? "Available Now"
    : info.current_status === "Held"
    ? "Currently Held"
    : info.current_status === "Blocked"
    ? "Currently Blocked"
    : info.current_status === "Removed"
    ? "Removed"
    : info.current_status === "Under Maintenance"
    ? "Under Maintenance"
    : info.current_status === "Inactive"
    ? "Inactive"
    : "Currently Booked";

  // Current section meta
  const currentTypeLabel =
    info.current_booking_type === "campaign"
      ? "Campaign"
      : info.current_booking_type === "hold"
      ? info.current_hold_type
        ? `Hold · ${info.current_hold_type}`
        : "Hold"
      : null;

  const currentName =
    info.current_campaign_name ||
    (info.current_booking_type === "hold"
      ? info.current_client_name || "Internal Hold"
      : null);

  // Next section meta
  const nextSectionLabel =
    info.next_booking_type === "hold" ? "Upcoming Hold" : "Next Booking";

  const nextName =
    info.next_campaign_name ||
    (info.next_booking_type === "hold"
      ? info.next_client_name || "Internal Hold"
      : null);

  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        className="w-[340px] p-0 rounded-xl border shadow-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2.5 border-b bg-muted/40">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight text-foreground">
                {headerTitle}
              </p>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="shrink-0">{statusBadge(info.current_status)}</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Current section */}
          <section className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current
            </p>

            {!isAvailable && currentName && (
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                  {currentName}
                </p>
                {currentTypeLabel && (
                  <p className="text-[11px] text-muted-foreground">
                    {currentTypeLabel}
                  </p>
                )}

                {info.current_client_name &&
                  info.current_booking_type === "campaign" && (
                    <div className="flex items-baseline justify-between gap-3 pt-0.5">
                      <span className="text-[11px] text-muted-foreground">Client</span>
                      <span className="text-[12px] text-foreground/80 truncate text-right line-clamp-1">
                        {info.current_client_name}
                      </span>
                    </div>
                  )}

                {(curStart || curEnd) && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] text-muted-foreground">Period</span>
                    <span className="text-[12px] tabular-nums text-foreground/80">
                      {fmt(curStart)} → {fmt(curEnd)}
                    </span>
                  </div>
                )}

                {remainingDays !== null && remainingDays > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {remainingDays} day{remainingDays === 1 ? "" : "s"} remaining
                  </p>
                )}
              </div>
            )}

            {isAvailable && (
              <p className="text-sm text-muted-foreground italic">
                {hasNext ? "No active booking" : "Ready for planning"}
              </p>
            )}

            {isNonBookable && !currentName && (
              <p className="text-sm text-muted-foreground italic">
                {info.current_status === "Removed"
                  ? "Asset removed from inventory"
                  : info.current_status === "Under Maintenance"
                  ? "Asset under maintenance"
                  : info.current_status === "Inactive"
                  ? "Asset is inactive"
                  : "Asset is blocked"}
              </p>
            )}
          </section>

          {/* Next section */}
          {hasNext && (
            <section className="space-y-1.5 pt-2.5 border-t border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {nextSectionLabel}
              </p>

              {nextName && (
                <p className="text-sm font-medium leading-snug text-foreground/90 line-clamp-2">
                  {nextName}
                </p>
              )}

              {info.next_client_name && info.next_booking_type === "campaign" && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">Client</span>
                  <span className="text-[12px] text-foreground/70 truncate text-right line-clamp-1">
                    {info.next_client_name}
                  </span>
                </div>
              )}

              {(nextStart || nextEnd) && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] text-muted-foreground">Period</span>
                  <span className="text-[12px] tabular-nums text-foreground/70">
                    {fmt(nextStart)} → {fmt(nextEnd)}
                  </span>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Footer: Next available */}
        {!isAvailable && !isNonBookable && nextAvail && (
          <div className="px-4 py-2 border-t bg-muted/40 flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-[11px] flex-1 leading-tight">
              <span className="text-muted-foreground">Next available from </span>
              <span className="font-semibold text-foreground tabular-nums">
                {fmt(nextAvail)}
              </span>
              {daysUntilAvail !== null && daysUntilAvail > 0 && (
                <span className="text-muted-foreground">
                  {" "}· in {daysUntilAvail} day{daysUntilAvail === 1 ? "" : "s"}
                </span>
              )}
            </p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

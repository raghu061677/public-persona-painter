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
import { CheckCircle2, Lock, CalendarCheck, CalendarClock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export type HoverBookingType = "campaign" | "hold" | null;
export type HoverStatus = "Available" | "Booked" | "Held" | "Blocked";

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
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Available
        </Badge>
      );
    case "Booked":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          <CalendarCheck className="h-3 w-3 mr-1" /> Booked
        </Badge>
      );
    case "Held":
    case "Blocked":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
          <Lock className="h-3 w-3 mr-1" /> {status}
        </Badge>
      );
  }
}

export function AssetBookingHoverCard({
  info,
  children,
  side = "right",
  align = "start",
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

  const currentTypeLabel =
    info.current_booking_type === "campaign"
      ? "Campaign"
      : info.current_booking_type === "hold"
      ? info.current_hold_type ? `Hold · ${info.current_hold_type}` : "Hold"
      : null;

  const currentName =
    info.current_campaign_name ||
    (info.current_booking_type === "hold" ? info.current_client_name || "Internal Hold" : null);

  const nextTypeLabel =
    info.next_booking_type === "campaign"
      ? "Next Booking"
      : info.next_booking_type === "hold"
      ? info.next_hold_type ? `Upcoming Hold · ${info.next_hold_type}` : "Upcoming Hold"
      : "Upcoming";

  const nextName =
    info.next_campaign_name ||
    (info.next_booking_type === "hold" ? info.next_client_name || "Internal Hold" : null);

  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side={side} align={align} className="w-[340px] p-0">
        {/* Header */}
        <div className="px-4 py-2.5 bg-muted/60 border-b flex items-center justify-between gap-2">
          {statusBadge(info.current_status)}
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {isAvailable ? "Available Now" : "Current Booking"}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Current section */}
          {!isAvailable && (
            <div className="space-y-2">
              {currentName && (
                <div className="flex items-start gap-2">
                  <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">
                      {currentTypeLabel || "Booking"}
                    </p>
                    <p className="text-sm font-medium break-words leading-snug">{currentName}</p>
                  </div>
                </div>
              )}

              {info.current_client_name && info.current_booking_type === "campaign" && (
                <div className="flex items-start gap-2">
                  <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Client</p>
                    <p className="text-sm break-words leading-snug">{info.current_client_name}</p>
                  </div>
                </div>
              )}

              {(curStart || curEnd) && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Period</p>
                    <p className="text-sm">
                      {fmt(curStart)} → {fmt(curEnd)}
                    </p>
                    {remainingDays !== null && remainingDays > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {remainingDays} day{remainingDays === 1 ? "" : "s"} remaining
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isAvailable && !hasNext && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>No upcoming bookings or holds.</span>
            </div>
          )}

          {/* Next section */}
          {hasNext && (
            <>
              {!isAvailable && <div className="border-t -mx-4" />}
              <div className="space-y-2 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {nextTypeLabel}
                </p>

                {nextName && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium break-words leading-snug min-w-0 flex-1">
                      {nextName}
                    </p>
                  </div>
                )}

                {info.next_client_name && info.next_booking_type === "campaign" && (
                  <div className="flex items-start gap-2">
                    <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm break-words leading-snug min-w-0 flex-1">
                      {info.next_client_name}
                    </p>
                  </div>
                )}

                {(nextStart || nextEnd) && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <p className="text-sm">
                      {fmt(nextStart)} → {fmt(nextEnd)}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer: next available */}
        {!isAvailable && nextAvail && (
          <div className="px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs">
                <span className="text-muted-foreground">Next Available:&nbsp;</span>
                <span className="font-semibold">{fmt(nextAvail)}</span>
                {daysUntilAvail !== null && daysUntilAvail > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    (in {daysUntilAvail} day{daysUntilAvail === 1 ? "" : "s"})
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

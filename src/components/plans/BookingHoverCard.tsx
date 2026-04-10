/**
 * BookingHoverCard — Rich hover tooltip for booked/held assets in Plan Builder.
 * Shows current blocking booking details, duration, remaining days, and next available date.
 */
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Briefcase, AlertTriangle } from "lucide-react";
import { format, differenceInDays, isAfter } from "date-fns";
import type { AssetAvailabilitySummary } from "@/lib/availability";

interface BookingHoverCardProps {
  summary: AssetAvailabilitySummary;
  children: React.ReactNode;
}

export function BookingHoverCard({ summary, children }: BookingHoverCardProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookingStart = summary.booking_start ? new Date(summary.booking_start + 'T00:00:00') : null;
  const bookingEnd = summary.booking_end ? new Date(summary.booking_end + 'T00:00:00') : null;
  const nextAvail = summary.next_available_date ? new Date(summary.next_available_date + 'T00:00:00') : null;

  const totalDuration = bookingStart && bookingEnd
    ? differenceInDays(bookingEnd, bookingStart) + 1
    : null;

  const remainingDays = bookingEnd
    ? Math.max(0, differenceInDays(bookingEnd, today) + 1)
    : null;

  const daysUntilAvailable = nextAvail
    ? Math.max(0, differenceInDays(nextAvail, today))
    : null;

  // Status text and color
  let statusText = "Unavailable";
  let statusColor = "text-red-600 dark:text-red-400";
  if (daysUntilAvailable !== null) {
    if (daysUntilAvailable === 0) {
      statusText = "Available Today";
      statusColor = "text-emerald-600 dark:text-emerald-400";
    } else if (daysUntilAvailable <= 7) {
      statusText = `Available in ${daysUntilAvailable} day${daysUntilAvailable > 1 ? 's' : ''}`;
      statusColor = "text-emerald-600 dark:text-emerald-400";
    } else if (daysUntilAvailable <= 30) {
      statusText = `Available in ${daysUntilAvailable} days`;
      statusColor = "text-amber-600 dark:text-amber-400";
    } else {
      statusText = `Available in ${daysUntilAvailable} days`;
      statusColor = "text-red-600 dark:text-red-400";
    }
  } else if (bookingEnd) {
    statusText = `Running until ${format(bookingEnd, "dd MMM yyyy")}`;
  }

  // Check for back-to-back bookings
  const hasFollowingBooking = summary.all_bookings.length > 1;

  const bookingTypeLabel = summary.booking_type === 'CAMPAIGN' ? 'Campaign'
    : summary.booking_type === 'HOLD' ? 'Hold' : 'Booking';

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent side="left" align="start" className="w-80 p-0">
        {/* Header */}
        <div className="px-4 py-2.5 bg-muted/60 border-b">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Asset Currently {summary.availability_status === 'HELD' ? 'Held' : 'Booked'}
          </p>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Campaign / Hold name */}
          <div className="flex items-start gap-2">
            <Briefcase className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase">{bookingTypeLabel}</p>
              <p className="text-sm font-medium truncate">
                {summary.blocking_entity_name || summary.blocking_entity_id || 'Unknown'}
              </p>
            </div>
          </div>

          {/* Client */}
          {summary.client_name && (
            <div className="flex items-start gap-2">
              <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase">Client</p>
                <p className="text-sm truncate">{summary.client_name}</p>
              </div>
            </div>
          )}

          {/* Date range */}
          {bookingStart && bookingEnd && (
            <div className="flex items-start gap-2">
              <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Running Period</p>
                <p className="text-sm">
                  {format(bookingStart, "dd MMM yyyy")} → {format(bookingEnd, "dd MMM yyyy")}
                </p>
                <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                  {totalDuration !== null && <span>Duration: {totalDuration} days</span>}
                  {remainingDays !== null && remainingDays > 0 && (
                    <span>Remaining: {remainingDays} days</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next available */}
          {nextAvail && (
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Next Available</p>
                <p className="text-sm font-medium">{format(nextAvail, "dd MMM yyyy")}</p>
              </div>
            </div>
          )}

          {/* Following booking warning */}
          {hasFollowingBooking && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>Another confirmed booking follows immediately</span>
            </div>
          )}
        </div>

        {/* Footer status */}
        <div className="px-4 py-2 border-t bg-muted/30">
          <p className={`text-xs font-semibold ${statusColor}`}>
            {statusText}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

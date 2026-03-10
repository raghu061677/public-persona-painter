/**
 * BookingStatusBadge — Display component for booking/availability status.
 *
 * This is SEPARATE from the execution status badge (AssetInstallationStatusBadge).
 * Booking statuses: Vacant | Upcoming | Running | Booked | Blocked
 * Execution statuses: Pending | Assigned | Installed | Completed | Verified
 *
 * Never mix these two domains.
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarCheck, Clock, Play, Lock, CheckCircle2 } from "lucide-react";
import type { BookingAvailability } from "@/lib/availability";
import type { LucideIcon } from "lucide-react";

interface BookingStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  description: string;
}

const BOOKING_STATUS_CONFIG: Record<BookingAvailability, BookingStatusConfig> = {
  Vacant: {
    label: 'Vacant',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    description: 'Asset is available for booking',
  },
  Upcoming: {
    label: 'Upcoming',
    icon: Clock,
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    description: 'Asset has a future booking',
  },
  Running: {
    label: 'Running',
    icon: Play,
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    description: 'Asset is currently in use',
  },
  Booked: {
    label: 'Booked',
    icon: CalendarCheck,
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    description: 'Asset is booked',
  },
  Blocked: {
    label: 'Blocked',
    icon: Lock,
    badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    description: 'Asset is held/blocked',
  },
};

interface BookingStatusBadgeProps {
  status: BookingAvailability;
  showIcon?: boolean;
  showTooltip?: boolean;
  tooltipExtra?: string;
  className?: string;
}

export function BookingStatusBadge({
  status,
  showIcon = true,
  showTooltip = false,
  tooltipExtra,
  className,
}: BookingStatusBadgeProps) {
  const config = BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.Vacant;
  const Icon = config.icon;

  const badge = (
    <Badge variant="outline" className={`${config.badgeClass} ${className || ''}`}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
            {tooltipExtra && <p className="text-xs text-muted-foreground mt-1">{tooltipExtra}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

export function getBookingStatusConfig(status: BookingAvailability) {
  return BOOKING_STATUS_CONFIG[status] || BOOKING_STATUS_CONFIG.Vacant;
}

export { BOOKING_STATUS_CONFIG };

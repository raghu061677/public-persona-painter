import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, IndianRupee, Ban, Info } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { format, startOfMonth, endOfMonth, subMonths, subQuarters, startOfQuarter, endOfQuarter } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { computeAssetBookingWindow } from "@/lib/availability/campaignAssetHelpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssetBookingHistoryTabProps {
  assetId: string;
}

type DateFilter = "all" | "this_month" | "last_month" | "last_quarter" | "this_fy" | "last_fy";

/**
 * Get Indian Financial Year date range.
 * Indian FY runs Apr 1 – Mar 31.
 */
function getIndianFYRange(offset: number = 0): { start: Date; end: Date } {
  const now = new Date();
  let fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  fyStartYear += offset;
  return {
    start: new Date(fyStartYear, 3, 1),    // Apr 1
    end: new Date(fyStartYear + 1, 2, 31), // Mar 31
  };
}

function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  const now = new Date();
  switch (filter) {
    case "all":
      return null;
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    case "last_quarter": {
      const lastQ = subQuarters(now, 1);
      return { start: startOfQuarter(lastQ), end: endOfQuarter(lastQ) };
    }
    case "this_fy":
      return getIndianFYRange(0);
    case "last_fy":
      return getIndianFYRange(-1);
  }
}

/**
 * Compute actual booked revenue for a campaign asset.
 * Priority: total_price > (rent_amount / 30 * activeDays) > (negotiated_rate / 30 * activeDays) > (card_rate / 30 * activeDays)
 * total_price is the pre-computed campaign-level total for this asset.
 */
function computeBookingRevenue(booking: any, activeDays: number): number {
  // total_price is the final computed amount for this asset in this campaign
  if (booking.total_price != null && Number(booking.total_price) > 0) {
    return Number(booking.total_price);
  }
  // Fall back to rate-based calculation
  const monthlyRate = Number(booking.rent_amount) || Number(booking.negotiated_rate) || Number(booking.card_rate) || 0;
  if (monthlyRate <= 0) return 0;
  return (monthlyRate / 30) * activeDays;
}

export function AssetBookingHistoryTab({ assetId }: AssetBookingHistoryTabProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookingHistory();
  }, [assetId]);

  const fetchBookingHistory = async () => {
    setLoading(true);

    const { data: campaignAssets, error: assetsError } = await supabase
      .from('campaign_assets')
      .select('*, campaigns(id, campaign_name, client_name, start_date, end_date, status)')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false });

    if (assetsError) {
      toast({
        title: "Error",
        description: "Failed to fetch booking history",
        variant: "destructive",
      });
    } else {
      setBookings(campaignAssets || []);
    }
    setLoading(false);
  };

  // Enrich bookings with computed window and revenue
  const enrichedBookings = useMemo(() => {
    return bookings.map((booking) => {
      const campaign = booking.campaigns;
      const window = computeAssetBookingWindow(
        booking,
        campaign?.start_date,
        campaign?.end_date
      );
      const revenue = computeBookingRevenue(booking, window.activeDays);
      return { ...booking, _window: window, _revenue: revenue };
    });
  }, [bookings]);

  // Apply date filter
  const filteredBookings = useMemo(() => {
    const range = getDateRange(dateFilter);
    if (!range) return enrichedBookings;

    const rangeStart = format(range.start, "yyyy-MM-dd");
    const rangeEnd = format(range.end, "yyyy-MM-dd");

    return enrichedBookings.filter((b) => {
      const start = b._window.effectiveStart;
      const end = b._window.effectiveEnd;
      // Booking overlaps with filter range
      return start <= rangeEnd && end >= rangeStart;
    });
  }, [enrichedBookings, dateFilter]);

  // Summary from filtered results
  const { totalRevenue, activeCount, droppedCount } = useMemo(() => {
    const active = filteredBookings.filter((b) => !b.is_removed);
    const dropped = filteredBookings.filter((b) => b.is_removed);
    const rev = active.reduce((sum, b) => sum + b._revenue, 0);
    return { totalRevenue: rev, activeCount: active.length, droppedCount: dropped.length };
  }, [filteredBookings]);

  const getBookingStatusBadge = (booking: any) => {
    if (booking.is_removed) {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
          Dropped
        </Badge>
      );
    }
    const campaignStatus = booking.campaigns?.status || 'Planned';
    switch (campaignStatus) {
      case 'Running':
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">Running</Badge>;
      case 'Completed':
        return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20">Completed</Badge>;
      case 'Upcoming':
      case 'Draft':
        return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">{campaignStatus}</Badge>;
      case 'Cancelled':
        return <Badge className="bg-red-500/10 text-red-700 border-red-500/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{campaignStatus}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading booking history...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Revenue Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[220px]">
                        Revenue based on negotiated/booked campaign amount, not card rate
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                From {activeCount} active {activeCount === 1 ? 'booking' : 'bookings'}
                {droppedCount > 0 && (
                  <span className="text-orange-600"> · {droppedCount} dropped</span>
                )}
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <IndianRupee className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter + Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Booking History</h3>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_quarter">Last Quarter</SelectItem>
            <SelectItem value="this_fy">This Financial Year</SelectItem>
            <SelectItem value="last_fy">Last Financial Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No bookings found for the selected period</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => {
            const campaign = booking.campaigns;
            const window = booking._window;
            const revenue = booking._revenue;
            const isDropped = booking.is_removed === true;

            return (
              <Card
                key={booking.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  isDropped ? 'opacity-70 border-l-4 border-l-orange-400' : ''
                }`}
                onClick={() => navigate(`/admin/campaigns/${booking.campaign_id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isDropped && <Ban className="h-4 w-4 text-orange-500" />}
                        <h4 className="font-semibold text-lg">
                          {campaign?.campaign_name || 'Unnamed Campaign'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{campaign?.client_name || 'Unknown Client'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getBookingStatusBadge(booking)}
                      {booking.status && !isDropped && (
                        <Badge variant="outline" className="text-xs">
                          {booking.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {window.effectiveStart
                          ? format(new Date(window.effectiveStart + 'T00:00:00'), 'dd MMM yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {isDropped ? 'Dropped On' : 'End Date'}
                      </p>
                      <p className={`font-medium ${isDropped ? 'text-orange-600' : ''}`}>
                        {window.effectiveEnd
                          ? format(new Date(window.effectiveEnd + 'T00:00:00'), 'dd MMM yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Days</p>
                      <p className="font-medium">
                        {window.activeDays} {window.activeDays === 1 ? 'day' : 'days'}
                        {isDropped && window.plannedDays > window.activeDays && (
                          <span className="text-xs text-muted-foreground ml-1">
                            / {window.plannedDays} planned
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="font-medium text-lg text-green-600">
                        {formatCurrency(revenue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Installation</p>
                      <Badge variant="outline">
                        {isDropped ? 'Dropped' : (booking.status || 'Pending')}
                      </Badge>
                    </div>
                  </div>

                  {isDropped && booking.drop_reason && (
                    <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                      <span className="font-medium text-orange-600">Drop reason:</span> {booking.drop_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

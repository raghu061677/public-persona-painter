import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, IndianRupee, Ban } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { format, differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { computeAssetBookingWindow } from "@/lib/availability/campaignAssetHelpers";

interface AssetBookingHistoryTabProps {
  assetId: string;
}

export function AssetBookingHistoryTab({ assetId }: AssetBookingHistoryTabProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBookingHistory();
  }, [assetId]);

  const fetchBookingHistory = async () => {
    setLoading(true);
    
    // Fetch campaign assets with campaign details — includes effective dates and dropped info
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
      
      // Calculate total revenue from active (non-dropped) bookings
      const revenue = (campaignAssets || [])
        .filter(b => !b.is_removed)
        .reduce((sum, booking) => {
          return sum + (Number(booking.rent_amount) || Number(booking.negotiated_rate) || Number(booking.card_rate) || 0);
        }, 0);
      setTotalRevenue(revenue);
    }
    setLoading(false);
  };

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

  const activeBookings = bookings.filter(b => !b.is_removed);
  const droppedBookings = bookings.filter(b => b.is_removed);

  return (
    <div className="space-y-6">
      {/* Revenue Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Revenue Generated</p>
              <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                From {activeBookings.length} active {activeBookings.length === 1 ? 'booking' : 'bookings'}
                {droppedBookings.length > 0 && (
                  <span className="text-orange-600"> · {droppedBookings.length} dropped</span>
                )}
              </p>
            </div>
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <IndianRupee className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Booking History</h3>
        
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bookings yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {bookings.map((booking) => {
              const campaign = booking.campaigns;
              const window = computeAssetBookingWindow(
                booking,
                campaign?.start_date,
                campaign?.end_date
              );
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
                          {formatCurrency(booking.rent_amount || booking.negotiated_rate || booking.card_rate)}
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
    </div>
  );
}

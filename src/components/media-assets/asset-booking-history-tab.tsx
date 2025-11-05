import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, IndianRupee } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
    
    // Fetch campaign assets with campaign details
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
      
      // Calculate total revenue
      const revenue = (campaignAssets || []).reduce((sum, booking) => {
        return sum + (Number(booking.card_rate) || 0);
      }, 0);
      setTotalRevenue(revenue);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'Completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'Planned':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      default:
        return 'bg-muted text-muted-foreground';
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
              <p className="text-sm text-muted-foreground mb-1">Total Revenue Generated</p>
              <p className="text-3xl font-bold">{formatCurrency(totalRevenue)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                From {bookings.length} {bookings.length === 1 ? 'campaign' : 'campaigns'}
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
            {bookings.map((booking) => (
              <Card 
                key={booking.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/campaigns/${booking.campaign_id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-lg">
                        {booking.campaigns?.campaign_name || 'Unnamed Campaign'}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>{booking.campaigns?.client_name || 'Unknown Client'}</span>
                      </div>
                    </div>
                    <Badge className={getStatusColor(booking.campaigns?.status || 'Planned')}>
                      {booking.campaigns?.status || 'Planned'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {booking.campaigns?.start_date 
                          ? format(new Date(booking.campaigns.start_date), 'dd MMM yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {booking.campaigns?.end_date 
                          ? format(new Date(booking.campaigns.end_date), 'dd MMM yyyy')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="font-medium text-lg text-green-600">
                        {formatCurrency(booking.card_rate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Installation Status</p>
                      <Badge variant="outline">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingPeriod {
  start_date: string;
  end_date: string;
  campaign_id: string;
  campaign_name: string;
  client_name: string;
}

interface AssetBookingCalendarProps {
  assetId: string;
}

export function AssetBookingCalendar({ assetId }: AssetBookingCalendarProps) {
  const [bookings, setBookings] = useState<BookingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchBookings();
  }, [assetId]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Fetch all campaign assets for this asset
      const { data: campaignAssets, error: assetsError } = await supabase
        .from('campaign_assets')
        .select('campaign_id')
        .eq('asset_id', assetId);

      if (assetsError) throw assetsError;

      if (!campaignAssets || campaignAssets.length === 0) {
        setBookings([]);
        return;
      }

      // Fetch campaign details
      const campaignIds = campaignAssets.map(ca => ca.campaign_id);
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, campaign_name, client_name, start_date, end_date, status')
        .in('id', campaignIds)
        .or('status.eq.Planned,status.eq.Completed');

      if (campaignsError) throw campaignsError;

      const bookingPeriods: BookingPeriod[] = (campaigns || []).map(c => ({
        start_date: c.start_date,
        end_date: c.end_date,
        campaign_id: c.id,
        campaign_name: c.campaign_name,
        client_name: c.client_name,
      }));

      setBookings(bookingPeriods);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load booking calendar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isDateBooked = (date: Date): boolean => {
    return bookings.some(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      return date >= start && date <= end;
    });
  };

  const getBookingForDate = (date: Date): BookingPeriod | undefined => {
    return bookings.find(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      return date >= start && date <= end;
    });
  };

  const selectedBooking = selectedDate ? getBookingForDate(selectedDate) : null;

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="h-5 w-5" />
          Booking Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading calendar...</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" />
                <span className="text-xs text-muted-foreground">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-background border-2 border-border" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
            </div>

            <div className="relative">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className={cn("rounded-md border pointer-events-auto")}
                modifiers={{
                  booked: (date) => isDateBooked(date),
                }}
                modifiersClassNames={{
                  booked: "bg-primary/20 text-primary font-bold border-primary hover:bg-primary/30",
                }}
              />
            </div>

            {selectedBooking && (
              <div className="p-3 rounded-lg bg-muted space-y-2">
                <p className="text-sm font-medium">Booked Period</p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Campaign: {selectedBooking.campaign_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Client: {selectedBooking.client_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedBooking.start_date).toLocaleDateString()} - {new Date(selectedBooking.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {bookings.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No bookings found</p>
              </div>
            )}

            {bookings.length > 0 && !selectedDate && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Upcoming Bookings</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bookings.slice(0, 3).map((booking, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted text-xs">
                      <p className="font-medium">{booking.campaign_name}</p>
                      <p className="text-muted-foreground">
                        {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientBooking {
  client_id: string;
  client_name: string;
  total_campaigns: number;
  total_revenue: number;
  last_booking_date: string;
}

export default function ReportClientBookings() {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadClientBookings();
  }, []);

  const loadClientBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("client_id, client_name, grand_total, start_date")
        .order("start_date", { ascending: false });

      if (error) throw error;

      const clientMap = new Map<string, ClientBooking>();
      data?.forEach((campaign) => {
        const existing = clientMap.get(campaign.client_id);
        if (existing) {
          existing.total_campaigns += 1;
          existing.total_revenue += campaign.grand_total;
          if (new Date(campaign.start_date) > new Date(existing.last_booking_date)) {
            existing.last_booking_date = campaign.start_date;
          }
        } else {
          clientMap.set(campaign.client_id, {
            client_id: campaign.client_id,
            client_name: campaign.client_name,
            total_campaigns: 1,
            total_revenue: campaign.grand_total,
            last_booking_date: campaign.start_date,
          });
        }
      });

      setBookings(Array.from(clientMap.values()).sort((a, b) => b.total_revenue - a.total_revenue));
    } catch (error: any) {
      console.error("Error loading client bookings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load client bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = bookings.reduce((sum, b) => sum + b.total_revenue, 0);
  const totalCampaigns = bookings.reduce((sum, b) => sum + b.total_campaigns, 0);

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client-wise Bookings</h1>
        <p className="text-muted-foreground">
          Analyze bookings by client
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Client Booking Analytics
          </CardTitle>
          <CardDescription>
            View booking patterns and revenue per client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Client booking reports will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Total Campaigns</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Avg Revenue/Campaign</TableHead>
                  <TableHead>Last Booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.client_id}>
                    <TableCell className="font-medium">{booking.client_name}</TableCell>
                    <TableCell>{booking.total_campaigns}</TableCell>
                    <TableCell>₹{booking.total_revenue.toLocaleString()}</TableCell>
                    <TableCell>
                      ₹{Math.round(booking.total_revenue / booking.total_campaigns).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {new Date(booking.last_booking_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

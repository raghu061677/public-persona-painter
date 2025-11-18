import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin } from "lucide-react";
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

interface AssetRevenue {
  asset_id: string;
  location: string;
  city: string;
  media_type: string;
  bookings_count: number;
  total_revenue: number;
}

export default function ReportAssetRevenue() {
  const [assetRevenues, setAssetRevenues] = useState<AssetRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAssetRevenue();
  }, []);

  const loadAssetRevenue = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("asset_id, location, city, media_type, card_rate");

      if (error) throw error;

      const assetMap = new Map<string, AssetRevenue>();
      data?.forEach((item) => {
        const existing = assetMap.get(item.asset_id);
        if (existing) {
          existing.bookings_count += 1;
          existing.total_revenue += item.card_rate;
        } else {
          assetMap.set(item.asset_id, {
            asset_id: item.asset_id,
            location: item.location,
            city: item.city,
            media_type: item.media_type,
            bookings_count: 1,
            total_revenue: item.card_rate,
          });
        }
      });

      setAssetRevenues(Array.from(assetMap.values()).sort((a, b) => b.total_revenue - a.total_revenue));
    } catch (error: any) {
      console.error("Error loading asset revenue:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load asset revenue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = assetRevenues.reduce((sum, a) => sum + a.total_revenue, 0);
  const totalBookings = assetRevenues.reduce((sum, a) => sum + a.bookings_count, 0);

  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset-wise Revenue</h1>
        <p className="text-muted-foreground">
          Analyze revenue generation by media asset
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetRevenues.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
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
            <TrendingUp className="h-5 w-5" />
            Asset Revenue Analytics
          </CardTitle>
          <CardDescription>
            View revenue performance for each media asset
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assetRevenues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Asset revenue reports will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Media Type</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Avg Revenue/Booking</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assetRevenues.map((asset) => (
                  <TableRow key={asset.asset_id}>
                    <TableCell className="font-medium">{asset.asset_id}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div className="text-sm">
                          <div>{asset.location}</div>
                          <div className="text-xs text-muted-foreground">{asset.city}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{asset.media_type}</TableCell>
                    <TableCell>{asset.bookings_count}</TableCell>
                    <TableCell>₹{asset.total_revenue.toLocaleString()}</TableCell>
                    <TableCell>
                      ₹{Math.round(asset.total_revenue / asset.bookings_count).toLocaleString()}
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

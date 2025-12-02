import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, PieChart, TrendingUp, Package, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UtilizationData {
  asset_id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  total_sqft: number;
  current_status: string;
  total_bookings: number;
  occupancy_percent: number;
  total_revenue: number;
  revenue_this_month: number;
}

export default function InventoryUtilization() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UtilizationData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUtilization();
  }, []);

  const fetchUtilization = async () => {
    try {
      setLoading(true);
      const { data: utilData, error } = await supabase
        .from('asset_utilization' as any)
        .select('*')
        .order('occupancy_percent', { ascending: false });

      if (error) throw error;
      setData((utilData as any) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate aggregate stats
  const totalAssets = data.length;
  const bookedAssets = data.filter(a => a.current_status === 'Booked').length;
  const availableAssets = data.filter(a => a.current_status === 'Available').length;
  const avgOccupancy = data.reduce((sum, a) => sum + (a.occupancy_percent || 0), 0) / Math.max(totalAssets, 1);
  const totalRevenue = data.reduce((sum, a) => sum + (a.total_revenue || 0), 0);
  const monthRevenue = data.reduce((sum, a) => sum + (a.revenue_this_month || 0), 0);

  // City-wise breakdown
  const cityStats = data.reduce((acc: any, asset) => {
    if (!acc[asset.city]) {
      acc[asset.city] = { total: 0, booked: 0, revenue: 0 };
    }
    acc[asset.city].total++;
    if (asset.current_status === 'Booked') acc[asset.city].booked++;
    acc[asset.city].revenue += asset.total_revenue || 0;
    return acc;
  }, {});

  // Media type breakdown
  const typeStats = data.reduce((acc: any, asset) => {
    if (!acc[asset.media_type]) {
      acc[asset.media_type] = { total: 0, avgOccupancy: 0, revenue: 0 };
    }
    acc[asset.media_type].total++;
    acc[asset.media_type].avgOccupancy += asset.occupancy_percent || 0;
    acc[asset.media_type].revenue += asset.total_revenue || 0;
    return acc;
  }, {});

  Object.keys(typeStats).forEach(type => {
    typeStats[type].avgOccupancy = typeStats[type].avgOccupancy / typeStats[type].total;
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Utilization Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time analytics of your OOH media inventory
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bookedAssets} booked • {availableAssets} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Occupancy</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOccupancy.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 365 days average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(2)}L</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(monthRevenue / 100000).toFixed(2)}L</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current month revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* City-wise Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle>City-wise Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(cityStats).map(([city, stats]: [string, any]) => (
              <div key={city} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{city}</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.booked}/{stats.total} ({((stats.booked / stats.total) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(stats.booked / stats.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Revenue: ₹{(stats.revenue / 100000).toFixed(2)}L
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Media Type Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Media Type Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(typeStats).map(([type, stats]: [string, any]) => (
              <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{type}</p>
                  <p className="text-sm text-muted-foreground">
                    {stats.total} assets • {stats.avgOccupancy.toFixed(1)}% avg occupancy
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{(stats.revenue / 100000).toFixed(2)}L</p>
                  <p className="text-xs text-muted-foreground">Total revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data
              .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
              .slice(0, 10)
              .map((asset) => (
                <div key={asset.asset_id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{asset.location}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.city} • {asset.media_type} • {asset.occupancy_percent.toFixed(1)}% occupied
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">₹{(asset.total_revenue / 100000).toFixed(2)}L</p>
                    <p className="text-xs text-muted-foreground">{asset.total_bookings} bookings</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
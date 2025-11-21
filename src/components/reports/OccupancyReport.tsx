import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PieChart, TrendingUp, Activity, Percent } from "lucide-react";

interface OccupancyData {
  totalAssets: number;
  availableAssets: number;
  bookedAssets: number;
  occupancyRate: number;
  occupancyByCity: Array<{ city: string; total: number; booked: number; rate: number }>;
  occupancyByType: Array<{ type: string; total: number; booked: number; rate: number }>;
}

export function OccupancyReport() {
  const { company } = useCompany();
  const [data, setData] = useState<OccupancyData>({
    totalAssets: 0,
    availableAssets: 0,
    bookedAssets: 0,
    occupancyRate: 0,
    occupancyByCity: [],
    occupancyByType: [],
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (company?.id) {
      loadOccupancyData();
    }
  }, [company]);

  const loadOccupancyData = async () => {
    if (!company?.id) return;
    
    try {
      const { data: assets, error } = await supabase
        .from("media_assets")
        .select("*")
        .eq("company_id", company.id);

      if (error) throw error;

      const totalAssets = assets?.length || 0;
      const availableAssets = assets?.filter((a) => a.status === "Available").length || 0;
      const bookedAssets = assets?.filter((a) => a.status === "Booked").length || 0;
      const occupancyRate = totalAssets > 0 ? (bookedAssets / totalAssets) * 100 : 0;

      // Occupancy by city
      const cityMap = new Map<string, { total: number; booked: number }>();
      assets?.forEach((asset) => {
        const city = asset.city;
        const current = cityMap.get(city) || { total: 0, booked: 0 };
        current.total += 1;
        if (asset.status === "Booked") current.booked += 1;
        cityMap.set(city, current);
      });

      const occupancyByCity = Array.from(cityMap.entries())
        .map(([city, stats]) => ({
          city,
          total: stats.total,
          booked: stats.booked,
          rate: (stats.booked / stats.total) * 100,
        }))
        .sort((a, b) => b.rate - a.rate);

      // Occupancy by type
      const typeMap = new Map<string, { total: number; booked: number }>();
      assets?.forEach((asset) => {
        const type = asset.media_type;
        const current = typeMap.get(type) || { total: 0, booked: 0 };
        current.total += 1;
        if (asset.status === "Booked") current.booked += 1;
        typeMap.set(type, current);
      });

      const occupancyByType = Array.from(typeMap.entries())
        .map(([type, stats]) => ({
          type,
          total: stats.total,
          booked: stats.booked,
          rate: (stats.booked / stats.total) * 100,
        }))
        .sort((a, b) => b.rate - a.rate);

      setData({
        totalAssets,
        availableAssets,
        bookedAssets,
        occupancyRate,
        occupancyByCity,
        occupancyByType,
      });
    } catch (error) {
      console.error("Error loading occupancy data:", error);
      toast({
        title: "Error",
        description: "Failed to load occupancy report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return "text-green-500";
    if (rate >= 60) return "text-yellow-500";
    if (rate >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getOccupancyBgColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-yellow-500";
    if (rate >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return <div className="text-center py-8">Loading occupancy data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAssets}</div>
            <p className="text-xs text-muted-foreground">Total inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booked</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.bookedAssets}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.availableAssets}</div>
            <p className="text-xs text-muted-foreground">Ready to book</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Percent className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getOccupancyColor(data.occupancyRate)}`}>
              {data.occupancyRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall utilization</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Occupancy by City</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.occupancyByCity.map((item) => (
              <div key={item.city} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.city}</span>
                    <Badge variant="outline">
                      {item.booked}/{item.total}
                    </Badge>
                  </div>
                  <span className={`text-lg font-bold ${getOccupancyColor(item.rate)}`}>
                    {item.rate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getOccupancyBgColor(item.rate)}`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Occupancy by Media Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.occupancyByType.map((item) => (
              <div key={item.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{item.type}</span>
                    <Badge variant="outline">
                      {item.booked}/{item.total}
                    </Badge>
                  </div>
                  <span className={`text-lg font-bold ${getOccupancyColor(item.rate)}`}>
                    {item.rate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getOccupancyBgColor(item.rate)}`}
                    style={{ width: `${item.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

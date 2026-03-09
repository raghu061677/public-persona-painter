import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Clock, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";

export function IntelligenceWidgets() {
  const navigate = useNavigate();
  const [highDemandLocations, setHighDemandLocations] = useState<any[]>([]);
  const [longVacant, setLongVacant] = useState<any[]>([]);
  const [topRevenue, setTopRevenue] = useState<any[]>([]);
  const [campaignCompletion, setCampaignCompletion] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    loadWidgetData();
  }, []);

  const loadWidgetData = async () => {
    // High-demand locations (cities with most booked assets)
    const { data: bookedByCity } = await supabase
      .from("media_assets")
      .select("city, status")
      .eq("status", "Booked");

    const cityMap = new Map<string, number>();
    (bookedByCity || []).forEach((a) => {
      cityMap.set(a.city, (cityMap.get(a.city) || 0) + 1);
    });
    const sorted = Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));
    setHighDemandLocations(sorted);

    // Vacant >30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: vacant } = await supabase
      .from("media_assets")
      .select("id, city, area, media_type, card_rate, updated_at")
      .eq("status", "Available")
      .lt("updated_at", thirtyDaysAgo.toISOString())
      .order("updated_at", { ascending: true })
      .limit(5);
    setLongVacant(vacant || []);

    // Top revenue assets
    const { data: revenue } = await supabase
      .from("campaign_assets")
      .select("asset_id, city, total_price")
      .order("total_price", { ascending: false })
      .limit(5);
    setTopRevenue(revenue || []);

    // Campaign completion rate
    const { count: completedCount } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "Completed");
    const { count: totalCount } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .not("status", "eq", "Draft");
    setCampaignCompletion({ completed: completedCount || 0, total: totalCount || 0 });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  const completionRate = campaignCompletion.total > 0
    ? Math.round((campaignCompletion.completed / campaignCompletion.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* High Demand Locations */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/admin/intelligence")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> High Demand Locations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {highDemandLocations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No data yet</p>
          ) : (
            highDemandLocations.map((loc) => (
              <div key={loc.city} className="flex items-center justify-between text-sm">
                <span>{loc.city}</span>
                <Badge variant="secondary">{loc.count} booked</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Vacant >30 Days */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/admin/intelligence")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" /> Vacant &gt;30 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {longVacant.length === 0 ? (
            <p className="text-xs text-muted-foreground">All assets actively utilized</p>
          ) : (
            longVacant.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[120px]">{a.id}</span>
                <span className="text-xs text-muted-foreground">{a.city}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top Revenue Assets */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/admin/intelligence")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Top Revenue Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {topRevenue.length === 0 ? (
            <p className="text-xs text-muted-foreground">No revenue data</p>
          ) : (
            topRevenue.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[100px]">{a.asset_id}</span>
                <span className="font-medium">{formatCurrency(a.total_price || 0)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Campaign Completion Rate */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/admin/intelligence")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" /> Campaign Completion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{completionRate}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {campaignCompletion.completed} of {campaignCompletion.total} campaigns
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

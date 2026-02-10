import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface HoldRow {
  id: string;
  asset_id: string;
  client_name: string | null;
  hold_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

export function BlockedAssetsWidget() {
  const { company } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeToday, setActiveToday] = useState(0);
  const [upcoming15, setUpcoming15] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [topHolds, setTopHolds] = useState<HoldRow[]>([]);

  useEffect(() => {
    if (!company?.id) return;
    fetchHoldStats();
  }, [company?.id]);

  const fetchHoldStats = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const in15 = format(addDays(new Date(), 15), "yyyy-MM-dd");

      // Active today
      const { count: todayCount } = await supabase
        .from("asset_holds")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "ACTIVE")
        .lte("start_date", today)
        .gte("end_date", today);

      // Upcoming (start in next 15 days, not yet started)
      const { count: upcomingCount } = await supabase
        .from("asset_holds")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "ACTIVE")
        .gt("start_date", today)
        .lte("start_date", in15);

      // Total active (end_date >= today)
      const { count: totalCount } = await supabase
        .from("asset_holds")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("status", "ACTIVE")
        .gte("end_date", today);

      // Top 5 holds
      const { data: top5 } = await supabase
        .from("asset_holds")
        .select("id, asset_id, client_name, hold_type, start_date, end_date, status")
        .eq("company_id", company.id)
        .eq("status", "ACTIVE")
        .gte("end_date", today)
        .order("start_date", { ascending: true })
        .limit(5);

      setActiveToday(todayCount || 0);
      setUpcoming15(upcomingCount || 0);
      setTotalActive(totalCount || 0);
      setTopHolds((top5 as HoldRow[]) || []);
    } catch (err) {
      console.error("Failed to fetch hold stats", err);
    } finally {
      setLoading(false);
    }
  };

  const holdTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      OPTION: "bg-blue-100 text-blue-700",
      SOFT_HOLD: "bg-amber-100 text-amber-700",
      HARD_BLOCK: "bg-red-100 text-red-700",
    };
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors[type] || ""}`}>
        {type.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" /> Blocked / Held Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-600" /> Blocked / Held Assets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Counts */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-purple-50 p-2">
            <p className="text-xl font-bold text-purple-700">{activeToday}</p>
            <p className="text-[10px] text-muted-foreground">Active Today</p>
          </div>
          <div className="rounded-md bg-amber-50 p-2">
            <p className="text-xl font-bold text-amber-700">{upcoming15}</p>
            <p className="text-[10px] text-muted-foreground">Upcoming 15d</p>
          </div>
          <div className="rounded-md bg-muted p-2">
            <p className="text-xl font-bold">{totalActive}</p>
            <p className="text-[10px] text-muted-foreground">Total Active</p>
          </div>
        </div>

        {/* Top 5 preview */}
        {topHolds.length > 0 && (
          <div className="space-y-1.5">
            {topHolds.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs border-b last:border-0 pb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-medium truncate max-w-[100px]">{h.asset_id}</span>
                  {holdTypeBadge(h.hold_type)}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  {h.client_name || "Internal"} · {h.start_date} → {h.end_date}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalActive === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No active holds</p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => navigate("/admin/reports/vacant-media")}
        >
          View Blocked Assets <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
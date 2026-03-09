import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { SectionHeader } from "@/components/ui/section-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Brain,
  TrendingUp,
  MapPin,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Target,
  Clock,
  DollarSign,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

interface AssetDemand {
  asset_id: string;
  demand_score: number;
  bookings_last_12_months: number;
  vacancy_days: number;
  revenue_generated: number;
}

interface Recommendation {
  id: string;
  recommendation_type: string;
  entity_type: string;
  entity_id: string | null;
  recommendation_text: string;
  confidence_score: number;
  is_dismissed: boolean;
  created_at: string;
}

interface CampaignEnding {
  id: string;
  name: string;
  client_name: string;
  end_date: string;
  total_amount: number;
  days_remaining: number;
}

export default function IntelligenceDashboard() {
  const { currentCompany } = useCompany();
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [topAssets, setTopAssets] = useState<any[]>([]);
  const [vacantAssets, setVacantAssets] = useState<any[]>([]);
  const [endingCampaigns, setEndingCampaigns] = useState<CampaignEnding[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [demandScores, setDemandScores] = useState<AssetDemand[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeAssets: 0,
    vacantCount: 0,
    avgOccupancy: 0,
    campaignsEnding: 0,
    completionRate: 0,
  });

  useEffect(() => {
    if (currentCompany?.id) {
      loadAllData();
    }
  }, [currentCompany?.id]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadTopAssets(),
      loadVacantAssets(),
      loadEndingCampaigns(),
      loadRecommendations(),
      loadDemandScores(),
      loadStats(),
    ]);
    setLoading(false);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadTopAssets = async () => {
    const { data } = await supabase
      .from("campaign_assets")
      .select("asset_id, city, area, media_type, card_rate, total_price")
      .order("total_price", { ascending: false })
      .limit(10);
    setTopAssets(data || []);
  };

  const loadVacantAssets = async () => {
    const { data } = await supabase
      .from("media_assets")
      .select("id, city, area, media_type, card_rate, status, next_available_from")
      .eq("status", "Available")
      .order("card_rate", { ascending: false })
      .limit(20);
    setVacantAssets(data || []);
  };

  const loadEndingCampaigns = async () => {
    const thirtyDaysOut = format(addDays(new Date(), 30), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    
    const { data } = await supabase
      .from("campaigns")
      .select("id, name, client_name, end_date, total_amount")
      .gte("end_date", today)
      .lte("end_date", thirtyDaysOut)
      .in("status", ["Running", "Upcoming"])
      .order("end_date", { ascending: true });

    setEndingCampaigns(
      (data || []).map((c) => ({
        ...c,
        days_remaining: differenceInDays(new Date(c.end_date), new Date()),
      }))
    );
  };

  const loadRecommendations = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("ai_recommendations")
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("is_dismissed", false)
      .order("confidence_score", { ascending: false })
      .limit(20);
    setRecommendations((data || []) as Recommendation[]);
  };

  const loadDemandScores = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("asset_demand_scores")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("demand_score", { ascending: false })
      .limit(20);
    setDemandScores((data || []) as AssetDemand[]);
  };

  const loadStats = async () => {
    const [
      { count: activeCount },
      { count: vacantCount },
      { count: campaignsEndingCount },
      { data: revenueData },
    ] = await Promise.all([
      supabase.from("media_assets").select("*", { count: "exact", head: true }).eq("status", "Booked"),
      supabase.from("media_assets").select("*", { count: "exact", head: true }).eq("status", "Available"),
      supabase.from("campaigns").select("*", { count: "exact", head: true }).in("status", ["Running", "Upcoming"]),
      supabase.from("invoices").select("total_amount").eq("status", "Paid"),
    ]);

    const totalRevenue = (revenueData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const total = (activeCount || 0) + (vacantCount || 0);
    const avgOccupancy = total > 0 ? Math.round(((activeCount || 0) / total) * 100) : 0;

    setStats({
      totalRevenue,
      activeAssets: activeCount || 0,
      vacantCount: vacantCount || 0,
      avgOccupancy,
      campaignsEnding: campaignsEndingCount || 0,
      completionRate: 0,
    });
  };

  const dismissRecommendation = async (id: string) => {
    await supabase.from("ai_recommendations").update({ is_dismissed: true }).eq("id", id);
    setRecommendations(recommendations.filter((r) => r.id !== id));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <SectionHeader
        title="Campaign Intelligence"
        description="AI-powered insights, demand analysis, and smart recommendations"
        actions={
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} color="text-emerald-600" />
        <KPICard title="Active Assets" value={String(stats.activeAssets)} icon={Target} color="text-blue-600" />
        <KPICard title="Vacant Assets" value={String(stats.vacantCount)} icon={AlertTriangle} color="text-amber-600" />
        <KPICard title="Occupancy" value={`${stats.avgOccupancy}%`} icon={BarChart3} color="text-purple-600" />
        <KPICard title="Campaigns Ending" value={String(stats.campaignsEnding)} icon={Clock} color="text-orange-600" />
        <KPICard title="AI Insights" value={String(recommendations.length)} icon={Brain} color="text-pink-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales"><TrendingUp className="h-4 w-4 mr-1" /> Sales Intelligence</TabsTrigger>
          <TabsTrigger value="demand"><MapPin className="h-4 w-4 mr-1" /> Media Demand</TabsTrigger>
          <TabsTrigger value="campaigns"><BarChart3 className="h-4 w-4 mr-1" /> Campaign Analytics</TabsTrigger>
          <TabsTrigger value="renewals"><Calendar className="h-4 w-4 mr-1" /> Renewal Opportunities</TabsTrigger>
          <TabsTrigger value="recommendations"><Sparkles className="h-4 w-4 mr-1" /> AI Recommendations</TabsTrigger>
        </TabsList>

        {/* Sales Intelligence */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Top Revenue Assets</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAssets.slice(0, 8).map((asset, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{asset.asset_id}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{asset.city}, {asset.area}</TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.total_price || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Vacant Media Alerts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Card Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vacantAssets.slice(0, 8).map((asset, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{asset.id}</span>
                            <p className="text-xs text-muted-foreground">{asset.city}, {asset.area}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{asset.media_type}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(asset.card_rate || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Media Demand Heatmap */}
        <TabsContent value="demand" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Asset Demand Scores</CardTitle></CardHeader>
            <CardContent>
              {demandScores.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No demand data computed yet. Run the intelligence engine to populate scores.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Bookings (12mo)</TableHead>
                      <TableHead>Vacancy Days</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Demand Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandScores.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.asset_id}</TableCell>
                        <TableCell>{s.bookings_last_12_months}</TableCell>
                        <TableCell>{s.vacancy_days}</TableCell>
                        <TableCell>{formatCurrency(s.revenue_generated)}</TableCell>
                        <TableCell>
                          <Badge variant={s.demand_score >= 7 ? "default" : s.demand_score >= 4 ? "secondary" : "outline"}>
                            {s.demand_score.toFixed(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Analytics */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">{stats.activeAssets}</div>
                <p className="text-sm text-muted-foreground mt-1">Currently Booked Assets</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.vacantCount}</div>
                <p className="text-sm text-muted-foreground mt-1">Available Assets</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-emerald-600">{stats.avgOccupancy}%</div>
                <p className="text-sm text-muted-foreground mt-1">Occupancy Rate</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Renewal Opportunities */}
        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Campaigns Ending in 30 Days</CardTitle></CardHeader>
            <CardContent>
              {endingCampaigns.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No campaigns ending in the next 30 days</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endingCampaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name || c.id}</TableCell>
                        <TableCell>{c.client_name}</TableCell>
                        <TableCell>{format(new Date(c.end_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={c.days_remaining <= 7 ? "destructive" : c.days_remaining <= 14 ? "secondary" : "outline"}>
                            {c.days_remaining} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(c.total_amount || 0)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ArrowUpRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No active recommendations</h3>
                <p className="text-muted-foreground">AI insights will appear here as data accumulates</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{rec.recommendation_type}</Badge>
                          <Badge variant="secondary">{rec.entity_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm">{rec.recommendation_text}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => dismissRecommendation(rec.id)}>
                      Dismiss
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

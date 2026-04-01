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
  Brain, TrendingUp, MapPin, BarChart3, RefreshCw, AlertTriangle, Sparkles,
  Target, Clock, DollarSign, ArrowUpRight, Calendar,
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

export default function IntelligenceDashboard() {
  const { company } = useCompany();
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [topAssets, setTopAssets] = useState<any[]>([]);
  const [vacantAssets, setVacantAssets] = useState<any[]>([]);
  const [endingCampaigns, setEndingCampaigns] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [demandScores, setDemandScores] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0, activeAssets: 0, vacantCount: 0, avgOccupancy: 0, campaignsEnding: 0, recommendationsCount: 0,
  });

  useEffect(() => {
    if (company?.id) loadAllData();
  }, [company?.id]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadTopAssets(), loadVacantAssets(), loadEndingCampaigns(), loadRecommendations(), loadDemandScores(), loadStats()]);
    setLoading(false);
  };

  const refreshData = async () => { setRefreshing(true); await loadAllData(); setRefreshing(false); };

  const loadTopAssets = async () => {
    const { data } = await supabase.from("campaign_assets").select("asset_id, city, area, media_type, card_rate, total_price").order("total_price", { ascending: false }).limit(10);
    setTopAssets(data || []);
  };

  const loadVacantAssets = async () => {
    // Unified availability engine — query asset_availability_view for AVAILABLE assets
    const { data } = await supabase
      .from('media_assets')
      .select('id, city, area, media_type, card_rate, status')
      .order('card_rate', { ascending: false })
      .limit(100);

    const allIds = (data || []).map(a => a.id);
    if (allIds.length === 0) { setVacantAssets([]); return; }

    // Use RPC or campaign_assets view to filter — kept as lightweight overlap check
    // since asset_availability_view types aren't in generated types yet
    const today = new Date().toISOString().split('T')[0];
    const [{ data: booked }, { data: held }] = await Promise.all([
      supabase.from("campaign_assets").select("asset_id")
        .in("asset_id", allIds.slice(0, 200)).eq("is_removed", false)
        .lte("effective_start_date", today).gte("effective_end_date", today),
      supabase.from("asset_holds").select("asset_id")
        .in("asset_id", allIds.slice(0, 200)).eq("status", "ACTIVE")
        .lte("start_date", today).gte("end_date", today),
    ]);
    const blockedSet = new Set([
      ...(booked || []).map(b => b.asset_id),
      ...(held || []).map(h => h.asset_id),
    ]);
    setVacantAssets((data || []).filter(a => !blockedSet.has(a.id)).slice(0, 20));
  };

  const loadEndingCampaigns = async () => {
    const thirtyDaysOut = format(addDays(new Date(), 30), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    const { data } = await supabase.from("campaigns").select("id, campaign_name, client_name, end_date, grand_total").gte("end_date", today).lte("end_date", thirtyDaysOut).in("status", ["Running", "Upcoming"]).order("end_date", { ascending: true });
    setEndingCampaigns((data || []).map((c) => ({ ...c, days_remaining: differenceInDays(new Date(c.end_date), new Date()) })));
  };

  const loadRecommendations = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from("ai_recommendations").select("*").eq("company_id", company.id).eq("is_dismissed", false).order("confidence_score", { ascending: false }).limit(20);
    setRecommendations(data || []);
  };

  const loadDemandScores = async () => {
    if (!company?.id) return;
    const { data } = await supabase.from("asset_demand_scores").select("*").eq("company_id", company.id).order("demand_score", { ascending: false }).limit(20);
    setDemandScores(data || []);
  };

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    // Total assets
    const { count: totalCount } = await supabase.from("media_assets").select("*", { count: "exact", head: true });
    // Unified availability: campaign_assets + asset_holds overlap for today
    const [{ data: activeBookings }, { data: activeHolds }] = await Promise.all([
      supabase.from("campaign_assets").select("asset_id")
        .eq("is_removed", false).lte("effective_start_date", today).gte("effective_end_date", today),
      supabase.from("asset_holds").select("asset_id")
        .eq("status", "ACTIVE").lte("start_date", today).gte("end_date", today),
    ]);
    const blockedIds = new Set([
      ...(activeBookings || []).map(b => b.asset_id),
      ...(activeHolds || []).map(h => h.asset_id),
    ]);
    const bookedCount = blockedIds.size;
    const vacantCount = (totalCount || 0) - bookedCount;
    const [{ count: campaignsEndingCount }, { data: revenueData }] = await Promise.all([
      supabase.from("campaigns").select("*", { count: "exact", head: true }).in("status", ["Running", "Upcoming"]),
      supabase.from("invoices").select("total_amount").eq("status", "Paid").eq("is_draft", false),
    ]);
    const totalRevenue = (revenueData || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const total = totalCount || 0;
    const avgOccupancy = total > 0 ? Math.round((bookedCount / total) * 100) : 0;
    setStats({ totalRevenue, activeAssets: bookedCount, vacantCount, avgOccupancy, campaignsEnding: campaignsEndingCount || 0, recommendationsCount: recommendations.length });
  };

  const dismissRecommendation = async (id: string) => {
    await supabase.from("ai_recommendations").update({ is_dismissed: true }).eq("id", id);
    setRecommendations(recommendations.filter((r) => r.id !== id));
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6 p-6">
      <SectionHeader title="Campaign Intelligence" description="AI-powered insights, demand analysis, and smart recommendations"
        actions={<Button variant="outline" onClick={refreshData} disabled={refreshing}><RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={DollarSign} />
        <KPICard title="Active Assets" value={String(stats.activeAssets)} icon={Target} />
        <KPICard title="Vacant Assets" value={String(stats.vacantCount)} icon={AlertTriangle} />
        <KPICard title="Occupancy" value={`${stats.avgOccupancy}%`} icon={BarChart3} />
        <KPICard title="Campaigns Ending" value={String(stats.campaignsEnding)} icon={Clock} />
        <KPICard title="AI Insights" value={String(recommendations.length)} icon={Brain} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="sales"><TrendingUp className="h-4 w-4 mr-1" /> Sales Intelligence</TabsTrigger>
          <TabsTrigger value="demand"><MapPin className="h-4 w-4 mr-1" /> Media Demand</TabsTrigger>
          <TabsTrigger value="campaigns"><BarChart3 className="h-4 w-4 mr-1" /> Campaign Analytics</TabsTrigger>
          <TabsTrigger value="renewals"><Calendar className="h-4 w-4 mr-1" /> Renewal Opportunities</TabsTrigger>
          <TabsTrigger value="recommendations"><Sparkles className="h-4 w-4 mr-1" /> AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Top Revenue Assets</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>{topAssets.slice(0, 8).map((asset, i) => (
                    <TableRow key={i}><TableCell className="font-medium">{asset.asset_id}</TableCell><TableCell className="text-sm text-muted-foreground">{asset.city}, {asset.area}</TableCell><TableCell className="text-right">{formatCurrency(asset.total_price || 0)}</TableCell></TableRow>
                  ))}</TableBody></Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Vacant Media Alerts</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Card Rate</TableHead></TableRow></TableHeader>
                  <TableBody>{vacantAssets.slice(0, 8).map((asset, i) => (
                    <TableRow key={i}><TableCell><div><span className="font-medium">{asset.id}</span><p className="text-xs text-muted-foreground">{asset.city}, {asset.area}</p></div></TableCell><TableCell><Badge variant="secondary">{asset.media_type}</Badge></TableCell><TableCell className="text-right">{formatCurrency(asset.card_rate || 0)}</TableCell></TableRow>
                  ))}</TableBody></Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demand" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Asset Demand Scores</CardTitle></CardHeader>
            <CardContent>{demandScores.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No demand data computed yet. Run the intelligence engine to populate scores.</p></div>
            ) : (
              <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Bookings (12mo)</TableHead><TableHead>Vacancy Days</TableHead><TableHead>Revenue</TableHead><TableHead>Demand Score</TableHead></TableRow></TableHeader>
                <TableBody>{demandScores.map((s: any, i: number) => (
                  <TableRow key={i}><TableCell className="font-medium">{s.asset_id}</TableCell><TableCell>{s.bookings_last_12_months}</TableCell><TableCell>{s.vacancy_days}</TableCell><TableCell>{formatCurrency(s.revenue_generated)}</TableCell><TableCell><Badge variant={s.demand_score >= 7 ? "default" : s.demand_score >= 4 ? "secondary" : "outline"}>{Number(s.demand_score).toFixed(1)}</Badge></TableCell></TableRow>
                ))}</TableBody></Table>
            )}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-primary">{stats.activeAssets}</div><p className="text-sm text-muted-foreground mt-1">Currently Booked Assets</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-primary">{stats.vacantCount}</div><p className="text-sm text-muted-foreground mt-1">Available Assets</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-primary">{stats.avgOccupancy}%</div><p className="text-sm text-muted-foreground mt-1">Occupancy Rate</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-4">
          <Card><CardHeader><CardTitle className="text-base">Campaigns Ending in 30 Days</CardTitle></CardHeader>
            <CardContent>{endingCampaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No campaigns ending in the next 30 days</p></div>
            ) : (
              <Table><TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Client</TableHead><TableHead>End Date</TableHead><TableHead>Days Left</TableHead><TableHead className="text-right">Value</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{endingCampaigns.map((c: any) => (
                  <TableRow key={c.id}><TableCell className="font-medium">{c.campaign_name || c.id}</TableCell><TableCell>{c.client_name}</TableCell><TableCell>{format(new Date(c.end_date), "MMM dd, yyyy")}</TableCell><TableCell><Badge variant={c.days_remaining <= 7 ? "destructive" : c.days_remaining <= 14 ? "secondary" : "outline"}>{c.days_remaining} days</Badge></TableCell><TableCell className="text-right">{formatCurrency(c.grand_total || 0)}</TableCell><TableCell><Button variant="ghost" size="sm"><ArrowUpRight className="h-4 w-4" /></Button></TableCell></TableRow>
                ))}</TableBody></Table>
            )}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="text-lg font-medium mb-2">No active recommendations</h3><p className="text-muted-foreground">AI insights will appear here as data accumulates</p></CardContent></Card>
          ) : (
            <div className="grid gap-4">{recommendations.map((rec: any) => (
              <Card key={rec.id}><CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div><div className="flex items-center gap-2 mb-1"><Badge variant="outline">{rec.recommendation_type}</Badge><Badge variant="secondary">{rec.entity_type}</Badge><span className="text-xs text-muted-foreground">Confidence: {(Number(rec.confidence_score) * 100).toFixed(0)}%</span></div><p className="text-sm">{rec.recommendation_text}</p></div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => dismissRecommendation(rec.id)}>Dismiss</Button>
              </CardContent></Card>
            ))}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ title, value, icon: Icon }: { title: string; value: string; icon: any }) {
  return (
    <Card><CardContent className="pt-4 pb-4 px-4">
      <div className="flex items-center gap-2 mb-1"><Icon className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">{title}</span></div>
      <div className="text-xl font-bold">{value}</div>
    </CardContent></Card>
  );
}

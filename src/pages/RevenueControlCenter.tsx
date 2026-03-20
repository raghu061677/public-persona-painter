import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, TrendingDown, Target, MapPin, BarChart3, Building2, Lightbulb, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/mediaAssets";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Lazy load heavy tab content
const ReportAssetRevenueV2 = lazy(() => import("./ReportAssetRevenueV2"));
const RevenueForecast = lazy(() => import("./RevenueForecast"));

interface RevenueOverview {
  totalRevenue: number;
  collected: number;
  outstanding: number;
  revenueGrowth: number;
  topCity: string;
  avgRevenuePerCampaign: number;
  revenueByClient: Array<{ client: string; amount: number }>;
  revenueByMonth: Array<{ month: string; amount: number }>;
  revenueByCampaign: Array<{ campaign: string; client: string; amount: number; status: string }>;
}

export default function RevenueControlCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "overview";
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [data, setData] = useState<RevenueOverview>({
    totalRevenue: 0,
    collected: 0,
    outstanding: 0,
    revenueGrowth: 0,
    topCity: "-",
    avgRevenuePerCampaign: 0,
    revenueByClient: [],
    revenueByMonth: [],
    revenueByCampaign: [],
  });

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (activeTab === "overview") loadOverview();
  }, [company?.id]);

  const loadOverview = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      
      // Fetch invoices for revenue data
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("id, client_name, invoice_date, total_amount, balance_due, status, campaign_id")
        .eq("company_id", company.id);

      if (invError) throw invError;

      // Fetch payment records for collected amounts
      const { data: payments } = await supabase
        .from("payment_records")
        .select("amount")
        .eq("company_id", company.id);

      // Fetch campaign assets for city-level breakdown
      const { data: campaignAssets } = await supabase
        .from("campaign_assets")
        .select("city, total_price, negotiated_rate, card_rate, campaign_id")
        .eq("campaign_id", company.id ? undefined : "");

      // Fetch campaigns to filter campaign_assets by company
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("company_id", company.id);
      const campaignIds = new Set((campaigns || []).map(c => c.id));

      // Re-fetch campaign assets filtered by company campaigns
      const { data: filteredCampaignAssets } = await supabase
        .from("campaign_assets")
        .select("city, total_price, negotiated_rate, card_rate, campaign_id");

      const companyCampaignAssets = (filteredCampaignAssets || []).filter(a => campaignIds.has(a.campaign_id));

      // Fetch total expenses for expense impact
      const { data: expensesData } = await supabase
        .from("expenses")
        .select("total_amount")
        .eq("company_id", company.id);
      setTotalExpenses((expensesData || []).reduce((s, e) => s + (e.total_amount || 0), 0));

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const collected = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const outstanding = totalRevenue - collected;

      // Revenue by client
      const clientMap = new Map<string, number>();
      invoices?.forEach((inv) => {
        const current = clientMap.get(inv.client_name) || 0;
        clientMap.set(inv.client_name, current + (inv.total_amount || 0));
      });
      const revenueByClient = Array.from(clientMap.entries())
        .map(([client, amount]) => ({ client, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Revenue by month
      const monthMap = new Map<string, number>();
      invoices?.forEach((inv) => {
        if (!inv.invoice_date) return;
        const month = format(new Date(inv.invoice_date), "MMM yyyy");
        monthMap.set(month, (monthMap.get(month) || 0) + (inv.total_amount || 0));
      });
      const revenueByMonth = Array.from(monthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      // Revenue by campaign
      const campaignMap = new Map<string, { client: string; amount: number; status: string }>();
      invoices?.forEach((inv) => {
        if (!inv.campaign_id) return;
        const existing = campaignMap.get(inv.campaign_id);
        if (existing) {
          existing.amount += inv.total_amount || 0;
        } else {
          campaignMap.set(inv.campaign_id, {
            client: inv.client_name,
            amount: inv.total_amount || 0,
            status: inv.status,
          });
        }
      });
      const revenueByCampaign = Array.from(campaignMap.entries())
        .map(([campaign, data]) => ({ campaign, ...data }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 15);

      // Top city
      const cityMap = new Map<string, number>();
      companyCampaignAssets.forEach((a) => {
        if (!a.city) return;
        const val = a.total_price || a.negotiated_rate || a.card_rate || 0;
        cityMap.set(a.city, (cityMap.get(a.city) || 0) + val);
      });
      const topCity = [...cityMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

      // Growth
      const currentMonth = revenueByMonth[revenueByMonth.length - 1]?.amount || 0;
      const previousMonth = revenueByMonth[revenueByMonth.length - 2]?.amount || 0;
      const revenueGrowth = previousMonth > 0
        ? ((currentMonth - previousMonth) / previousMonth) * 100
        : 0;

      // Avg revenue per campaign
      const campaignCount = campaignMap.size || 1;
      const avgRevenuePerCampaign = totalRevenue / campaignCount;

      setData({
        totalRevenue,
        collected,
        outstanding,
        revenueGrowth,
        topCity,
        avgRevenuePerCampaign,
        revenueByClient,
        revenueByMonth,
        revenueByCampaign,
      });
    } catch (error: any) {
      console.error("Error loading revenue overview:", error);
      toast({ title: "Error", description: "Failed to load revenue data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const collectionRate = data.totalRevenue > 0
    ? ((data.collected / data.totalRevenue) * 100).toFixed(1)
    : "0";

  const expenseImpact = data.totalRevenue > 0 ? (totalExpenses / data.totalRevenue) * 100 : 0;
  return (
    <div className="h-full flex flex-col space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revenue Control Center</h1>
        <p className="text-muted-foreground">
          Unified revenue analytics — Campaign, Asset, City, Client & Forecast
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(data.collected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.outstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue / Campaign</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.avgRevenuePerCampaign)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth (MoM)</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.revenueGrowth > 0 ? "+" : ""}
              {data.revenueGrowth.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/reports/expense-allocation")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expense Impact</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", expenseImpact > 50 ? "text-red-500" : expenseImpact > 30 ? "text-orange-500" : "text-emerald-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", expenseImpact > 50 ? "text-red-600" : expenseImpact > 30 ? "text-orange-600" : "text-emerald-600")}>
              {expenseImpact.toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">of revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top City</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.topCity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="asset">Asset Revenue</TabsTrigger>
          <TabsTrigger value="forecast">AI Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Collection Efficiency */}
              <Card>
                <CardHeader>
                  <CardTitle>Collection Efficiency</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Collection Rate</span>
                      <span className="text-2xl font-bold">{collectionRate}%</span>
                    </div>
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(100, parseFloat(collectionRate))}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(data.collected)} collected out of {formatCurrency(data.totalRevenue)} invoiced
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Top Clients */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Clients by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.revenueByClient.map((item, index) => (
                        <div key={item.client} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                              {index + 1}
                            </div>
                            <span className="font-medium truncate max-w-[200px]">{item.client}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      {data.revenueByClient.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No client revenue data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.revenueByMonth.map((item) => {
                        const maxAmount = Math.max(...data.revenueByMonth.map((m) => m.amount), 1);
                        return (
                          <div key={item.month} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>{item.month}</span>
                              <span className="font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${(item.amount / maxAmount) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {data.revenueByMonth.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No monthly data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Campaign Revenue */}
              {data.revenueByCampaign.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Campaigns by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.revenueByCampaign.slice(0, 10).map((item, idx) => (
                        <div key={item.campaign} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <span className="text-sm text-muted-foreground mr-2">#{idx + 1}</span>
                            <span className="font-medium">{item.campaign}</span>
                            <span className="text-sm text-muted-foreground ml-2">• {item.client}</span>
                          </div>
                          <span className="font-bold">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="asset" className="mt-0">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ReportAssetRevenueV2 />
          </Suspense>
        </TabsContent>

        <TabsContent value="forecast" className="mt-0">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <RevenueForecast />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

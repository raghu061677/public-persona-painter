import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, MapPin, Activity } from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";

interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalClients: number;
  newClients: number;
  occupancyRate: number;
  averageAssetValue: number;
}

export function AdvancedDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalClients: 0,
    newClients: 0,
    occupancyRate: 0,
    averageAssetValue: 0,
  });
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [campaignsByStatus, setCampaignsByStatus] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [assetsByCity, setAssetsByCity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      const companyId = companyUser?.company_id;

      // Fetch all data in parallel
      const [
        invoicesResult,
        campaignsResult,
        clientsResult,
        assetsResult,
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select("total_amount, invoice_date, status, client_name")
          .eq("company_id", companyId),
        supabase
          .from("campaigns")
          .select("id, status, grand_total, created_at")
          .eq("company_id", companyId),
        supabase
          .from("clients")
          .select("id, name, created_at")
          .eq("company_id", companyId),
        supabase
          .from("media_assets")
          .select("id, status, city, card_rate")
          .eq("company_id", companyId),
      ]);

      // Calculate metrics
      const invoices = invoicesResult.data || [];
      const campaigns = campaignsResult.data || [];
      const clients = clientsResult.data || [];
      const assets = assetsResult.data || [];

      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const lastMonthRevenue = invoices
        .filter(inv => new Date(inv.invoice_date) >= lastMonth && new Date(inv.invoice_date) < thisMonth)
        .reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const thisMonthRevenue = invoices
        .filter(inv => new Date(inv.invoice_date) >= thisMonth)
        .reduce((sum, inv) => sum + Number(inv.total_amount), 0);

      const revenueGrowth = lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      const activeCampaigns = campaigns.filter(c => 
        c.status === "InProgress" || c.status === "Assigned"
      ).length;

      const newClients = clients.filter(c => 
        new Date(c.created_at) >= lastMonth
      ).length;

      const bookedAssets = assets.filter(a => a.status === "Booked").length;
      const occupancyRate = assets.length > 0 ? (bookedAssets / assets.length) * 100 : 0;

      const averageAssetValue = assets.length > 0
        ? assets.reduce((sum, a) => sum + Number(a.card_rate), 0) / assets.length
        : 0;

      setMetrics({
        totalRevenue,
        revenueGrowth,
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalClients: clients.length,
        newClients,
        occupancyRate,
        averageAssetValue,
      });

      // Revenue by month (last 6 months)
      const monthlyRevenue = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = date.toLocaleString("default", { month: "short", year: "numeric" });
        monthlyRevenue.set(key, 0);
      }

      invoices.forEach(inv => {
        const date = new Date(inv.invoice_date);
        const key = date.toLocaleString("default", { month: "short", year: "numeric" });
        if (monthlyRevenue.has(key)) {
          monthlyRevenue.set(key, monthlyRevenue.get(key)! + Number(inv.total_amount));
        }
      });

      setRevenueByMonth(
        Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
          month,
          revenue,
        }))
      );

      // Campaigns by status
      const statusCount = new Map<string, number>();
      campaigns.forEach(c => {
        statusCount.set(c.status, (statusCount.get(c.status) || 0) + 1);
      });

      setCampaignsByStatus(
        Array.from(statusCount.entries()).map(([status, count]) => ({
          name: status,
          value: count,
        }))
      );

      // Top clients by revenue
      const clientRevenue = new Map<string, number>();
      invoices.forEach(inv => {
        const client = inv.client_name || "Unknown";
        clientRevenue.set(client, (clientRevenue.get(client) || 0) + Number(inv.total_amount));
      });

      setTopClients(
        Array.from(clientRevenue.entries())
          .map(([client, revenue]) => ({ client, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );

      // Assets by city
      const cityCount = new Map<string, number>();
      assets.forEach(a => {
        cityCount.set(a.city, (cityCount.get(a.city) || 0) + 1);
      });

      setAssetsByCity(
        Array.from(cityCount.entries()).map(([city, count]) => ({
          city,
          count,
        }))
      );

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#1e40af", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (loading) {
    return <div className="flex items-center justify-center h-[400px]">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              {metrics.revenueGrowth >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{metrics.revenueGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{metrics.revenueGrowth.toFixed(1)}%</span>
                </>
              )}
              {" "}from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {metrics.totalCampaigns} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics.newClients} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg. asset value: {formatCurrency(metrics.averageAssetValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Status</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
          <TabsTrigger value="assets">Assets by City</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
              <CardDescription>Monthly revenue analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1e40af"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Distribution</CardTitle>
              <CardDescription>Campaigns by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={campaignsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {campaignsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Clients by Revenue</CardTitle>
              <CardDescription>Highest revenue generating clients</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClients}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="client" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets Distribution by City</CardTitle>
              <CardDescription>Number of assets per city</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assetsByCity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="city" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#1e40af" name="Assets" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Activity, TrendingUp, Users, MessageSquare } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [marketplaceMetrics, setMarketplaceMetrics] = useState({
    totalRequests: 0,
    approvedRequests: 0,
    conversionRate: 0,
    avgBookingValue: 0,
    topAssets: [] as any[]
  });
  const [aiMetrics, setAiMetrics] = useState({
    totalQueries: 0,
    intentDistribution: [] as any[],
    queryVolume: [] as any[]
  });
  const [portalMetrics, setPortalMetrics] = useState({
    totalLogins: 0,
    activeUsers: 0,
    proofDownloads: 0,
    invoiceDownloads: 0,
    activityTimeline: [] as any[]
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    await Promise.all([
      fetchMarketplaceMetrics(),
      fetchAIMetrics(),
      fetchPortalMetrics()
    ]);
    setLoading(false);
  };

  const fetchMarketplaceMetrics = async () => {
    // Fetch booking requests
    const { data: requests } = await supabase
      .from('booking_requests' as any)
      .select('*, media_assets!inner(location, area, city)') as any;

    const total = requests?.length || 0;
    const approved = requests?.filter((r: any) => r.status === 'approved').length || 0;
    const conversionRate = total > 0 ? (approved / total) * 100 : 0;

    // Calculate average booking value
    const avgValue = requests?.reduce((sum: number, r: any) => sum + (r.proposed_rate || 0), 0) / (total || 1);

    // Top performing assets
    const assetCounts: Record<string, any> = {};
    requests?.forEach((r: any) => {
      const key = r.asset_id;
      if (!assetCounts[key]) {
        assetCounts[key] = {
          asset_id: r.asset_id,
          location: r.media_assets?.location || 'Unknown',
          count: 0,
          totalValue: 0
        };
      }
      assetCounts[key].count++;
      assetCounts[key].totalValue += r.proposed_rate || 0;
    });

    const topAssets = Object.values(assetCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    setMarketplaceMetrics({
      totalRequests: total,
      approvedRequests: approved,
      conversionRate,
      avgBookingValue: avgValue,
      topAssets
    });
  };

  const fetchAIMetrics = async () => {
    // Fetch AI assistant logs
    const { data: logs } = await supabase
      .from('ai_assistant_logs' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any;

    const total = logs?.length || 0;

    // Intent distribution
    const intentCounts: Record<string, number> = {};
    logs?.forEach((log: any) => {
      const intent = log.intent || 'unknown';
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    });

    const intentDistribution = Object.entries(intentCounts).map(([intent, count]) => ({
      intent,
      count,
      percentage: ((count / total) * 100).toFixed(1)
    }));

    // Query volume by day (last 7 days)
    const queryVolume: Record<string, number> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => {
      queryVolume[date] = 0;
    });

    logs?.forEach((log: any) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (queryVolume[date] !== undefined) {
        queryVolume[date]++;
      }
    });

    const volumeData = Object.entries(queryVolume).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      queries: count
    }));

    setAiMetrics({
      totalQueries: total,
      intentDistribution,
      queryVolume: volumeData
    });
  };

  const fetchPortalMetrics = async () => {
    // Fetch client portal access logs
    const { data: logs } = await supabase
      .from('client_portal_access_logs' as any)
      .select('*')
      .order('created_at', { ascending: false }) as any;

    const totalLogins = logs?.filter((l: any) => l.action === 'login').length || 0;
    const uniqueClients = new Set(logs?.map((l: any) => l.client_id)).size;
    const proofDownloads = logs?.filter((l: any) => l.action === 'download_proof').length || 0;
    const invoiceDownloads = logs?.filter((l: any) => l.action === 'download_invoice').length || 0;

    // Activity timeline (last 7 days)
    const activityByDay: Record<string, any> = {};
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => {
      activityByDay[date] = { date, logins: 0, downloads: 0 };
    });

    logs?.forEach((log: any) => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (activityByDay[date]) {
        if (log.action === 'login') activityByDay[date].logins++;
        if (log.action.includes('download')) activityByDay[date].downloads++;
      }
    });

    const activityTimeline = Object.values(activityByDay).map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    setPortalMetrics({
      totalLogins,
      activeUsers: uniqueClients,
      proofDownloads,
      invoiceDownloads,
      activityTimeline
    });
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <SectionHeader title="Analytics Dashboard" description="Loading metrics..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SectionHeader 
        title="Analytics Dashboard" 
        description="Comprehensive insights into marketplace, AI assistant, and client portal performance"
      />

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
          <TabsTrigger value="portal">Client Portal</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketplaceMetrics.totalRequests}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketplaceMetrics.approvedRequests}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{marketplaceMetrics.conversionRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Booking Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{marketplaceMetrics.avgBookingValue.toFixed(0)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Assets */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Assets</CardTitle>
              <CardDescription>Assets with the most booking requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={marketplaceMetrics.topAssets}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Booking Requests" />
                  <Bar dataKey="totalValue" fill="hsl(var(--secondary))" name="Total Value (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiMetrics.totalQueries}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Intent Types</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aiMetrics.intentDistribution.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Intent Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Intent Distribution</CardTitle>
                <CardDescription>Breakdown of query types</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={aiMetrics.intentDistribution}
                      dataKey="count"
                      nameKey="intent"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.intent} (${entry.percentage}%)`}
                    >
                      {aiMetrics.intentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Query Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Query Volume (Last 7 Days)</CardTitle>
                <CardDescription>Daily query trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={aiMetrics.queryVolume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="queries" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portal" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portalMetrics.totalLogins}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portalMetrics.activeUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proof Downloads</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portalMetrics.proofDownloads}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoice Downloads</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portalMetrics.invoiceDownloads}</div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline (Last 7 Days)</CardTitle>
              <CardDescription>Client portal engagement trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={portalMetrics.activityTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="logins" stroke="hsl(var(--primary))" strokeWidth={2} name="Logins" />
                  <Line type="monotone" dataKey="downloads" stroke="hsl(var(--secondary))" strokeWidth={2} name="Downloads" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

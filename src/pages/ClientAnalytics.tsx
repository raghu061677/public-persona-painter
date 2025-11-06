import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Activity } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientData {
  id: string;
  name: string;
  company: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  invoices: number;
}

interface PaymentData {
  id: string;
  invoice_date: string;
  total_amount: number;
  balance_due: number;
  status: string;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  invoices: {
    label: "Invoices",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function ClientAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientData | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeCampaigns: 0,
    totalInvoices: 0,
    pendingAmount: 0,
    totalPlans: 0,
    growthRate: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentData[]>([]);

  useEffect(() => {
    if (id) {
      fetchClientAnalytics();
    }
  }, [id]);

  const fetchClientAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, company")
        .eq("id", id)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch invoices for revenue calculation
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("total_amount, balance_due, status, invoice_date")
        .eq("client_id", id);

      if (invoicesError) throw invoicesError;

      // Calculate stats
      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
      const pendingAmount = invoices?.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0) || 0;

      // Fetch active campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("id")
        .eq("client_id", id)
        .in("status", ["Planned", "Assigned", "InProgress"]);

      if (campaignsError) throw campaignsError;

      // Fetch plans
      const { data: plans, error: plansError } = await supabase
        .from("plans")
        .select("id, created_at")
        .eq("client_id", id);

      if (plansError) throw plansError;

      // Calculate growth rate (comparing last 6 months vs previous 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const recentRevenue = invoices?.filter(inv => 
        new Date(inv.invoice_date) >= sixMonthsAgo
      ).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

      const previousRevenue = invoices?.filter(inv => 
        new Date(inv.invoice_date) >= twelveMonthsAgo && 
        new Date(inv.invoice_date) < sixMonthsAgo
      ).reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

      const growthRate = previousRevenue > 0 
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      setStats({
        totalRevenue,
        activeCampaigns: campaigns?.length || 0,
        totalInvoices: invoices?.length || 0,
        pendingAmount,
        totalPlans: plans?.length || 0,
        growthRate: Math.round(growthRate * 10) / 10,
      });

      // Process revenue by month for chart
      const monthlyRevenue: { [key: string]: { revenue: number; count: number } } = {};
      
      invoices?.forEach(inv => {
        const date = new Date(inv.invoice_date);
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = { revenue: 0, count: 0 };
        }
        monthlyRevenue[monthKey].revenue += Number(inv.total_amount || 0);
        monthlyRevenue[monthKey].count += 1;
      });

      const chartData = Object.entries(monthlyRevenue)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-12) // Last 12 months
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          invoices: data.count,
        }));

      setRevenueData(chartData);

      // Recent payments
      const recent = invoices
        ?.sort((a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime())
        .slice(0, 5) || [];

      setRecentPayments(recent as PaymentData[]);

    } catch (error) {
      console.error("Error fetching client analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => navigate("/admin/clients")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/clients")}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground">{client.company}</p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalInvoices} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalPlans} total plans created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Outstanding balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.growthRate >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 6 months vs previous
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-80">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => formatINR(Number(value))}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-revenue)" 
                    strokeWidth={2}
                    dot={{ fill: "var(--color-revenue)" }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No revenue data available</p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Count by Month */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Activity</CardTitle>
            <CardDescription>Number of invoices per month</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-80">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="invoices" 
                    fill="var(--color-invoices)" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No invoice data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Latest payment history</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length > 0 ? (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <p className="font-medium">
                      {new Date(payment.invoice_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className={
                        payment.status === 'Paid' ? 'text-primary' : 
                        payment.status === 'Pending' ? 'text-yellow-600' : 
                        'text-destructive'
                      }>{payment.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatINR(payment.total_amount)}</p>
                    {payment.balance_due > 0 && (
                      <p className="text-sm text-destructive">
                        Due: {formatINR(payment.balance_due)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No payment history available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

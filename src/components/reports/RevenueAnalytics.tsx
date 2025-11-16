import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface RevenueData {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  revenueByClient: Array<{ client: string; amount: number }>;
  revenueByMonth: Array<{ month: string; amount: number }>;
  revenueGrowth: number;
}

export function RevenueAnalytics() {
  const [data, setData] = useState<RevenueData>({
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    revenueByClient: [],
    revenueByMonth: [],
    revenueGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      // Fetch invoices
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("*");

      if (invError) throw invError;

      const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      const paidRevenue = invoices
        ?.filter((inv) => inv.status === "Paid")
        .reduce((sum, inv) => sum + inv.total_amount, 0) || 0;
      const pendingRevenue = totalRevenue - paidRevenue;

      // Revenue by client
      const clientMap = new Map<string, number>();
      invoices?.forEach((inv) => {
        const current = clientMap.get(inv.client_name) || 0;
        clientMap.set(inv.client_name, current + inv.total_amount);
      });

      const revenueByClient = Array.from(clientMap.entries())
        .map(([client, amount]) => ({ client, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Revenue by month (last 6 months)
      const monthMap = new Map<string, number>();
      invoices?.forEach((inv) => {
        const month = format(new Date(inv.invoice_date), "MMM yyyy");
        const current = monthMap.get(month) || 0;
        monthMap.set(month, current + inv.total_amount);
      });

      const revenueByMonth = Array.from(monthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      // Calculate growth
      const currentMonth = revenueByMonth[revenueByMonth.length - 1]?.amount || 0;
      const previousMonth = revenueByMonth[revenueByMonth.length - 2]?.amount || 0;
      const revenueGrowth =
        previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;

      setData({
        totalRevenue,
        paidRevenue,
        pendingRevenue,
        revenueByClient,
        revenueByMonth,
        revenueGrowth,
      });
    } catch (error) {
      console.error("Error loading revenue data:", error);
      toast({
        title: "Error",
        description: "Failed to load revenue analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading revenue analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All-time invoiced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{data.paidRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ₹{data.pendingRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Pending collection</p>
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
            <p className="text-xs text-muted-foreground">Month over month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
                    <span className="font-medium">{item.client}</span>
                  </div>
                  <span className="font-bold">₹{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.revenueByMonth.map((item) => (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.month}</span>
                    <span className="font-medium">₹{item.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(item.amount / Math.max(...data.revenueByMonth.map((m) => m.amount))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Collection Efficiency</CardTitle>
            <Button size="sm" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Collection Rate</span>
              <span className="text-2xl font-bold">
                {((data.paidRevenue / data.totalRevenue) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${(data.paidRevenue / data.totalRevenue) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              ₹{data.paidRevenue.toLocaleString()} collected out of ₹
              {data.totalRevenue.toLocaleString()} invoiced
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

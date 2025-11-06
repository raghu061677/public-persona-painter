import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatINR } from "@/utils/finance";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts";
import { IndianRupee, TrendingUp, AlertCircle, Building2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PowerBillStats {
  totalBills: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

interface MonthlyTrend {
  month: string;
  amount: number;
  count: number;
}

interface AssetExpense {
  asset_id: string;
  location: string;
  total_amount: number;
  bill_count: number;
}

interface PendingBill {
  id: string;
  asset_id: string;
  location: string;
  bill_month: string;
  bill_amount: number;
}

export default function PowerBillsAnalytics() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<PowerBillStats>({ 
    totalBills: 0, 
    totalAmount: 0, 
    pendingAmount: 0, 
    paidAmount: 0 
  });
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [assetExpenses, setAssetExpenses] = useState<AssetExpense[]>([]);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all power bills with asset location
      const { data: bills, error } = await supabase
        .from("asset_power_bills")
        .select(`
          id,
          asset_id,
          bill_month,
          bill_amount,
          paid_amount,
          payment_status,
          media_assets!inner (
            location
          )
        `)
        .order("bill_month", { ascending: false });

      if (error) throw error;

      // Calculate stats
      const totalBills = bills?.length || 0;
      const totalAmount = bills?.reduce((sum, b) => sum + Number(b.bill_amount || 0), 0) || 0;
      const paidAmount = bills?.filter(b => b.payment_status === "Paid")
        .reduce((sum, b) => sum + Number(b.paid_amount || 0), 0) || 0;
      const pendingAmount = bills?.filter(b => b.payment_status === "Pending")
        .reduce((sum, b) => sum + Number(b.bill_amount || 0), 0) || 0;

      setStats({ totalBills, totalAmount, pendingAmount, paidAmount });

      // Calculate monthly trends (last 12 months)
      const monthlyData: { [key: string]: { amount: number; count: number } } = {};
      bills?.forEach(bill => {
        const month = new Date(bill.bill_month).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
        if (!monthlyData[month]) {
          monthlyData[month] = { amount: 0, count: 0 };
        }
        monthlyData[month].amount += Number(bill.bill_amount || 0);
        monthlyData[month].count += 1;
      });

      const trends = Object.entries(monthlyData)
        .map(([month, data]) => ({ 
          month, 
          amount: data.amount, 
          count: data.count 
        }))
        .slice(0, 12)
        .reverse();

      setMonthlyTrends(trends);

      // Calculate asset-wise expenses (top 10)
      const assetData: { [key: string]: { location: string; amount: number; count: number } } = {};
      bills?.forEach(bill => {
        const assetId = bill.asset_id;
        const location = (bill.media_assets as any)?.location || assetId;
        if (!assetData[assetId]) {
          assetData[assetId] = { location, amount: 0, count: 0 };
        }
        assetData[assetId].amount += Number(bill.bill_amount || 0);
        assetData[assetId].count += 1;
      });

      const expenses = Object.entries(assetData)
        .map(([asset_id, data]) => ({
          asset_id,
          location: data.location,
          total_amount: data.amount,
          bill_count: data.count
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10);

      setAssetExpenses(expenses);

      // Get pending bills (top 10)
      const pending = bills
        ?.filter(b => b.payment_status === "Pending")
        .map(b => ({
          id: b.id,
          asset_id: b.asset_id,
          location: (b.media_assets as any)?.location || b.asset_id,
          bill_month: b.bill_month,
          bill_amount: Number(b.bill_amount || 0)
        }))
        .slice(0, 10) || [];

      setPendingBills(pending);

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--chart-1))",
    },
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Only administrators can access the Power Bills Analytics Dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="text-lg font-medium">Loading analytics...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Power Bills Analytics</h2>
          <p className="text-muted-foreground">Monthly trends, pending payments, and asset expenses</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
            <p className="text-xs text-muted-foreground">All power bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Overall expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatINR(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">Outstanding dues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatINR(stats.paidAmount)}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Bill Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyTrends.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2} 
                    name="Amount"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No monthly data available</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Assets by Expense */}
        <Card>
          <CardHeader>
            <CardTitle>Top Assets by Expense</CardTitle>
          </CardHeader>
          <CardContent>
            {assetExpenses.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetExpenses} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      dataKey="asset_id" 
                      type="category" 
                      width={100} 
                      stroke="hsl(var(--muted-foreground))" 
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_amount" fill="hsl(var(--chart-2))" name="Total Amount" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No asset data available</div>
            )}
          </CardContent>
        </Card>

        {/* Pending Bills List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Pending Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingBills.length > 0 ? (
              <div className="space-y-2">
                {pendingBills.map((bill) => (
                  <div 
                    key={bill.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{bill.asset_id}</p>
                      <p className="text-xs text-muted-foreground">{bill.location}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(bill.bill_month).toLocaleDateString('en-US', { 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatINR(bill.bill_amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No pending bills</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

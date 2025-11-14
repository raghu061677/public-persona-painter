import { useEffect, useState } from "react";
import { db } from "@/lib/supabase-wrapper";
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

export default function PowerBillsAnalyticsTab() {
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
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const { data: bills, error } = await db
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

      const totalBills = bills?.length || 0;
      const totalAmount = bills?.reduce((sum, b: any) => sum + Number(b.bill_amount || 0), 0) || 0;
      const paidAmount = bills?.filter((b: any) => b.payment_status === "Paid")
        .reduce((sum, b: any) => sum + Number(b.paid_amount || 0), 0) || 0;
      const pendingAmount = bills?.filter((b: any) => b.payment_status === "Pending")
        .reduce((sum, b: any) => sum + Number(b.bill_amount || 0), 0) || 0;

      setStats({ totalBills, totalAmount, pendingAmount, paidAmount });

      // Monthly trends
      const monthlyData: { [key: string]: { amount: number; count: number } } = {};
      bills?.forEach((bill: any) => {
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
        .map(([month, data]) => ({ month, amount: data.amount, count: data.count }))
        .slice(0, 12)
        .reverse();

      setMonthlyTrends(trends);

      // Asset-wise expenses
      const assetData: { [key: string]: { location: string; amount: number; count: number } } = {};
      bills?.forEach((bill: any) => {
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

      // Pending bills
      const pending = bills?.filter((b: any) => b.payment_status === "Pending")
        .map((b: any) => ({
          id: b.id,
          asset_id: b.asset_id,
          location: (b.media_assets as any)?.location || b.asset_id,
          bill_month: b.bill_month,
          bill_amount: Number(b.bill_amount)
        }))
        .slice(0, 10);

      setPendingBills(pending || []);

    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(stats.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatINR(stats.pendingAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatINR(stats.paidAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                amount: { label: "Amount", color: "hsl(var(--chart-1))" }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="amount" stroke="var(--color-amount)" />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Assets by Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total_amount: { label: "Total", color: "hsl(var(--chart-2))" }
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetExpenses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total_amount" fill="var(--color-total_amount)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

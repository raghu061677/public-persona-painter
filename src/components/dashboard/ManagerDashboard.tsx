import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ManagerMetrics {
  totalRevenue: number;
  activeClients: number;
  teamUtilization: number;
  targetAchievement: number;
  pendingApprovals: number;
  completedTasks: number;
  revenueByMonth: Array<{ month: string; revenue: number }>;
}

export function ManagerDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<ManagerMetrics>({
    totalRevenue: 0,
    activeClients: 0,
    teamUtilization: 0,
    targetAchievement: 0,
    pendingApprovals: 0,
    completedTasks: 0,
    revenueByMonth: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManagerMetrics();
  }, []);

  const fetchManagerMetrics = async () => {
    try {
      // Fetch revenue data
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, invoice_date, status");

      const totalRevenue = invoices?.reduce(
        (sum, inv) => sum + Number(inv.total_amount || 0),
        0
      ) || 0;

      // Fetch active clients
      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });

      // Fetch pending approvals
      const { count: approvalsCount } = await supabase
        .from("plan_approvals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Fetch completed campaigns this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: completedCount } = await supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("status", "Completed")
        .gte("updated_at", startOfMonth.toISOString());

      // Calculate revenue by month (last 6 months)
      const revenueByMonth = calculateRevenueByMonth(invoices || []);

      setMetrics({
        totalRevenue,
        activeClients: clientsCount || 0,
        teamUtilization: 78, // Mock data
        targetAchievement: 92, // Mock data
        pendingApprovals: approvalsCount || 0,
        completedTasks: completedCount || 0,
        revenueByMonth,
      });
    } catch (error) {
      console.error("Error fetching manager metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenueByMonth = (invoices: any[]) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'short' });
    }).reverse();

    return last6Months.map(month => ({
      month,
      revenue: Math.random() * 500000 + 200000, // Mock data
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeClients}</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Growing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.teamUtilization}%</div>
            <p className="text-xs text-muted-foreground mt-1">Current month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Target Achievement</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.targetAchievement}%</div>
            <p className="text-xs text-muted-foreground mt-1">On track</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/admin/plans?status=Sent")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{metrics.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires your attention</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/admin/campaigns")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{metrics.completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.revenueByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

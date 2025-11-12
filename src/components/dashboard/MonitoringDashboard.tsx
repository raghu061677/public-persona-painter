import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Eye, 
  AlertCircle,
  Zap,
  TrendingUp,
  CheckCircle2,
  Clock
} from "lucide-react";
import { formatCurrency } from "@/utils/mediaAssets";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface MonitoringMetrics {
  totalAssets: number;
  activeAssets: number;
  maintenanceRequired: number;
  powerBillsPending: number;
  assetUtilization: number;
  overduePayments: number;
  assetsByStatus: Array<{ name: string; value: number; color: string }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

const COLORS = {
  Available: "hsl(var(--chart-1))",
  Booked: "hsl(var(--chart-2))",
  Maintenance: "hsl(var(--chart-3))",
  Blocked: "hsl(var(--chart-4))",
};

export function MonitoringDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    totalAssets: 0,
    activeAssets: 0,
    maintenanceRequired: 0,
    powerBillsPending: 0,
    assetUtilization: 0,
    overduePayments: 0,
    assetsByStatus: [],
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonitoringMetrics();
  }, []);

  const fetchMonitoringMetrics = async () => {
    try {
      // Fetch assets by status
      const { data: assets } = await supabase
        .from("media_assets")
        .select("status");

      const statusCounts = assets?.reduce((acc: any, asset) => {
        acc[asset.status] = (acc[asset.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const assetsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value: value as number,
        color: COLORS[name as keyof typeof COLORS] || "hsl(var(--muted))",
      }));

      // Fetch pending power bills
      const { count: billsCount } = await supabase
        .from("asset_power_bills")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "Pending");

      // Fetch maintenance count
      const { data: maintenance } = await supabase
        .from("asset_maintenance")
        .select("*")
        .eq("status", "Pending");

      // Fetch overdue payments
      const today = new Date().toISOString().split('T')[0];
      const { count: overdueCount } = await supabase
        .from("asset_power_bills")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "Pending")
        .lt("bill_month", today);

      const totalAssets = assets?.length || 0;
      const bookedAssets = statusCounts["Booked"] || 0;
      const utilization = totalAssets > 0 ? Math.round((bookedAssets / totalAssets) * 100) : 0;

      setMetrics({
        totalAssets,
        activeAssets: bookedAssets,
        maintenanceRequired: maintenance?.length || 0,
        powerBillsPending: billsCount || 0,
        assetUtilization: utilization,
        overduePayments: overdueCount || 0,
        assetsByStatus,
        recentActivities: [], // Mock data
      });
    } catch (error) {
      console.error("Error fetching monitoring metrics:", error);
    } finally {
      setLoading(false);
    }
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
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground mt-1">Under monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Asset Utilization</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.assetUtilization}%</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activeAssets} booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Required</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.maintenanceRequired}</div>
            <p className="text-xs text-muted-foreground mt-1">Assets need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Power Bills Pending</CardTitle>
            <Zap className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.powerBillsPending}</div>
            <p className="text-xs text-red-600 mt-1">{metrics.overduePayments} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Asset Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.assetsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {metrics.assetsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.overduePayments > 0 && (
              <div 
                className="p-3 rounded-lg border-l-4 border-red-600 bg-red-50 dark:bg-red-950/20 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                onClick={() => navigate("/admin/power-bills")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-sm">Overdue Power Bills</span>
                  </div>
                  <Badge variant="destructive">{metrics.overduePayments}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Immediate payment required
                </p>
              </div>
            )}

            {metrics.maintenanceRequired > 0 && (
              <div 
                className="p-3 rounded-lg border-l-4 border-amber-600 bg-amber-50 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                onClick={() => navigate("/admin/media-assets")}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-sm">Maintenance Pending</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    {metrics.maintenanceRequired}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Assets require maintenance
                </p>
              </div>
            )}

            {metrics.overduePayments === 0 && metrics.maintenanceRequired === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-600 opacity-20" />
                <p className="text-sm">No critical alerts at this time</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/admin/media-assets")}>
            <Eye className="mr-2 h-4 w-4" />
            View All Assets
          </Button>
          <Button onClick={() => navigate("/admin/power-bills")} variant="outline">
            <Zap className="mr-2 h-4 w-4" />
            Power Bills
          </Button>
          <Button onClick={() => navigate("/reports/vacant-media")} variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Availability Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Clock, TrendingUp, XCircle, AlertTriangle } from "lucide-react";

interface ApprovalMetrics {
  totalApprovals: number;
  averageTimeByLevel: { level: string; avgHours: number }[];
  rejectionRate: number;
  bottlenecks: { level: string; avgHours: number; count: number }[];
  statusBreakdown: { status: string; count: number }[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export default function ApprovalAnalytics() {
  const [metrics, setMetrics] = useState<ApprovalMetrics>({
    totalApprovals: 0,
    averageTimeByLevel: [],
    rejectionRate: 0,
    bottlenecks: [],
    statusBreakdown: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: approvals, error } = await supabase
        .from("plan_approvals")
        .select("*");

      if (error) throw error;

      if (approvals) {
        // Calculate metrics
        const totalApprovals = approvals.length;
        
        // Average time by level
        const levelGroups = approvals.reduce((acc, app) => {
          if (!acc[app.approval_level]) {
            acc[app.approval_level] = [];
          }
          if (app.approved_at) {
            const created = new Date(app.created_at);
            const approved = new Date(app.approved_at);
            const hours = (approved.getTime() - created.getTime()) / (1000 * 60 * 60);
            acc[app.approval_level].push(hours);
          }
          return acc;
        }, {} as Record<string, number[]>);

        const averageTimeByLevel = Object.entries(levelGroups).map(([level, times]) => ({
          level,
          avgHours: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
        })).sort((a, b) => a.level.localeCompare(b.level));

        // Rejection rate
        const rejectedCount = approvals.filter(a => a.status === 'rejected').length;
        const rejectionRate = totalApprovals > 0 ? (rejectedCount / totalApprovals) * 100 : 0;

        // Bottlenecks (levels with longest average times)
        const bottlenecks = averageTimeByLevel
          .sort((a, b) => b.avgHours - a.avgHours)
          .slice(0, 3)
          .map(item => ({
            ...item,
            count: levelGroups[item.level]?.length || 0
          }));

        // Status breakdown
        const statusCounts = approvals.reduce((acc, app) => {
          acc[app.status] = (acc[app.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count
        }));

        setMetrics({
          totalApprovals,
          averageTimeByLevel,
          rejectionRate,
          bottlenecks,
          statusBreakdown
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${hours.toFixed(1)} hrs`;
    return `${(hours / 24).toFixed(1)} days`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track approval performance, identify bottlenecks, and optimize workflows
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approvals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalApprovals}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Approval Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageTimeByLevel.length > 0
                ? formatHours(
                    metrics.averageTimeByLevel.reduce((sum, item) => sum + item.avgHours, 0) /
                      metrics.averageTimeByLevel.length
                  )
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Across all levels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rejectionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Of all approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Bottleneck</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.bottlenecks[0]?.level || "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.bottlenecks[0] ? formatHours(metrics.bottlenecks[0].avgHours) : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Approval Time by Level</CardTitle>
            <CardDescription>How long each approval level takes on average</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.averageTimeByLevel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => formatHours(value)}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="avgHours" fill="hsl(var(--primary))" name="Avg Hours" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval Status Distribution</CardTitle>
            <CardDescription>Breakdown of approval statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.statusBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.status}: ${entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Bottlenecks</CardTitle>
          <CardDescription>Levels with the longest average approval times</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.bottlenecks.map((bottleneck, idx) => (
              <div
                key={bottleneck.level}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Badge variant={idx === 0 ? "destructive" : "outline"}>
                    #{idx + 1}
                  </Badge>
                  <div>
                    <p className="font-semibold">{bottleneck.level}</p>
                    <p className="text-sm text-muted-foreground">
                      {bottleneck.count} approvals processed
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatHours(bottleneck.avgHours)}</p>
                  <p className="text-xs text-muted-foreground">Average time</p>
                </div>
              </div>
            ))}
            {metrics.bottlenecks.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No bottlenecks detected</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

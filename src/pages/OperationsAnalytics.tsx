import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, Clock, Users, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TeamPerformance {
  mounter_name: string;
  total_assignments: number;
  completed: number;
  avg_completion_days: number;
  completion_rate: number;
}

interface Bottleneck {
  campaign_id: string;
  campaign_name: string;
  total_assets: number;
  pending: number;
  stuck_days: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function OperationsAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);
  const [avgCompletionTime, setAvgCompletionTime] = useState(0);
  const [completionTrend, setCompletionTrend] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all campaign assets for analysis
      const { data: assets, error } = await supabase
        .from("campaign_assets")
        .select(`
          *,
          campaigns!inner(campaign_name, start_date, end_date)
        `);

      if (error) throw error;

      // Calculate team performance
      const performanceMap = new Map<string, any>();
      assets?.forEach((asset: any) => {
        const mounter = asset.mounter_name || "Unassigned";
        if (!performanceMap.has(mounter)) {
          performanceMap.set(mounter, {
            mounter_name: mounter,
            total_assignments: 0,
            completed: 0,
            total_days: 0,
            count_with_completion: 0,
          });
        }
        const data = performanceMap.get(mounter);
        data.total_assignments++;
        if (asset.status === "Verified") {
          data.completed++;
          if (asset.assigned_at && asset.completed_at) {
            const days = Math.ceil(
              (new Date(asset.completed_at).getTime() - new Date(asset.assigned_at).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            data.total_days += days;
            data.count_with_completion++;
          }
        }
      });

      const performance: TeamPerformance[] = Array.from(performanceMap.values())
        .map((data) => ({
          mounter_name: data.mounter_name,
          total_assignments: data.total_assignments,
          completed: data.completed,
          avg_completion_days: data.count_with_completion > 0 
            ? Math.round(data.total_days / data.count_with_completion) 
            : 0,
          completion_rate: Math.round((data.completed / data.total_assignments) * 100),
        }))
        .filter((p) => p.mounter_name !== "Unassigned")
        .sort((a, b) => b.completion_rate - a.completion_rate);

      setTeamPerformance(performance);

      // Calculate overall average completion time
      const totalDays = performance.reduce((sum, p) => sum + (p.avg_completion_days * p.completed), 0);
      const totalCompleted = performance.reduce((sum, p) => sum + p.completed, 0);
      setAvgCompletionTime(totalCompleted > 0 ? Math.round(totalDays / totalCompleted) : 0);

      // Calculate status distribution
      const statusMap = new Map();
      assets?.forEach((asset: any) => {
        const count = statusMap.get(asset.status) || 0;
        statusMap.set(asset.status, count + 1);
      });
      const distribution = Array.from(statusMap.entries()).map(([name, value]) => ({
        name,
        value,
      }));
      setStatusDistribution(distribution);

      // Identify bottlenecks (campaigns with high pending rates)
      const campaignMap = new Map();
      assets?.forEach((asset: any) => {
        const campaignId = asset.campaign_id;
        if (!campaignMap.has(campaignId)) {
          campaignMap.set(campaignId, {
            campaign_id: campaignId,
            campaign_name: asset.campaigns?.campaign_name || "Unknown",
            total_assets: 0,
            pending: 0,
            oldest_assignment: null,
          });
        }
        const data = campaignMap.get(campaignId);
        data.total_assets++;
        if (asset.status === "Pending" || asset.status === "Assigned") {
          data.pending++;
          if (asset.assigned_at) {
            const assignDate = new Date(asset.assigned_at);
            if (!data.oldest_assignment || assignDate < data.oldest_assignment) {
              data.oldest_assignment = assignDate;
            }
          }
        }
      });

      const bottleneckList: Bottleneck[] = Array.from(campaignMap.values())
        .map((data) => ({
          campaign_id: data.campaign_id,
          campaign_name: data.campaign_name,
          total_assets: data.total_assets,
          pending: data.pending,
          stuck_days: data.oldest_assignment
            ? Math.ceil((Date.now() - data.oldest_assignment.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        }))
        .filter((b) => b.pending > 0 && b.stuck_days > 3)
        .sort((a, b) => b.stuck_days - a.stuck_days)
        .slice(0, 5);

      setBottlenecks(bottleneckList);

      // Mock completion trend (last 30 days)
      const trend = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const completed = assets?.filter((a: any) => {
          if (!a.completed_at) return false;
          const completedDate = new Date(a.completed_at);
          return completedDate.toDateString() === date.toDateString();
        }).length || 0;
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          completed,
        };
      });
      setCompletionTrend(trend);

    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/operations")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Operations Analytics</h2>
            <p className="text-muted-foreground">
              Performance metrics and bottleneck identification
            </p>
          </div>
        </div>
        <Button onClick={fetchAnalytics}>Refresh Data</Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgCompletionTime} days</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamPerformance.length}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bottlenecks</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bottlenecks.length}</div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Completion</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {teamPerformance.length > 0
                    ? Math.round(
                        teamPerformance.reduce((sum, p) => sum + p.completion_rate, 0) /
                          teamPerformance.length
                      )
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="team" className="space-y-4">
            <TabsList>
              <TabsTrigger value="team">Team Performance</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
              <TabsTrigger value="status">Status Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Team Member Performance</CardTitle>
                  <CardDescription>
                    Completion rates and average time by team member
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teamPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mounter_name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="completion_rate" fill="hsl(var(--primary))" name="Completion Rate %" />
                      <Bar yAxisId="right" dataKey="avg_completion_days" fill="hsl(var(--secondary))" name="Avg Days" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Team Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamPerformance.map((member) => (
                      <div key={member.mounter_name} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <p className="font-medium">{member.mounter_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {member.completed} of {member.total_assignments} completed
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{member.completion_rate}%</p>
                          <p className="text-sm text-muted-foreground">
                            {member.avg_completion_days} days avg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Completion Trend (Last 30 Days)</CardTitle>
                  <CardDescription>
                    Daily completion rate over the past month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={completionTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" name="Completed Assets" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bottlenecks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Bottlenecks</CardTitle>
                  <CardDescription>
                    Campaigns with high pending rates and long delays
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bottlenecks.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No bottlenecks detected. Great job!
                      </p>
                    ) : (
                      bottlenecks.map((bottleneck) => (
                        <div
                          key={bottleneck.campaign_id}
                          className="flex items-center justify-between border-b pb-4 cursor-pointer hover:bg-accent/50 p-2 rounded"
                          onClick={() => navigate(`/admin/campaigns/${bottleneck.campaign_id}`)}
                        >
                          <div>
                            <p className="font-medium">{bottleneck.campaign_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {bottleneck.pending} of {bottleneck.total_assets} assets pending
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-destructive">{bottleneck.stuck_days} days</p>
                            <p className="text-sm text-muted-foreground">stuck</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>
                    Current distribution of asset installation statuses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={120}
                        fill="hsl(var(--primary))"
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

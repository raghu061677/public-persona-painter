import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Target, DollarSign } from "lucide-react";

interface AnalyticsData {
  totalLeads: number;
  qualifiedLeads: number;
  conversionRate: number;
  avgResponseTime: number;
  leadsBySource: Record<string, number>;
  leadsByStatus: Record<string, number>;
}

export function LeadAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalLeads: 0,
    qualifiedLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    leadsBySource: {},
    leadsByStatus: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: leads, error } = await supabase.from("leads").select("*");

      if (error) throw error;

      const totalLeads = leads?.length || 0;
      const qualifiedLeads = leads?.filter((l) => l.status === "qualified").length || 0;
      const wonLeads = leads?.filter((l) => l.status === "won").length || 0;

      const leadsBySource = leads?.reduce((acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const leadsByStatus = leads?.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setAnalytics({
        totalLeads,
        qualifiedLeads,
        conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
        avgResponseTime: 2.5, // Placeholder
        leadsBySource,
        leadsByStatus,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  const metricCards = [
    {
      title: "Total Leads",
      value: analytics.totalLeads,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Qualified Leads",
      value: analytics.qualifiedLeads,
      icon: Target,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Conversion Rate",
      value: `${analytics.conversionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Avg Response Time",
      value: `${analytics.avgResponseTime}h`,
      icon: DollarSign,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.leadsBySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize">{source}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.leadsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  FileText,
} from "lucide-react";
import { formatINR, getFYRange } from "@/utils/finance";
import { RevenueChart } from "@/components/charts/RevenueChart";
import { OccupancyChart } from "@/components/charts/OccupancyChart";
import { ClientRevenueChart } from "@/components/charts/ClientRevenueChart";
import { CampaignTimelineChart } from "@/components/charts/CampaignTimelineChart";
import { AssetHeatMap } from "@/components/charts/AssetHeatMap";

export default function ReportsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAssets: 0,
    bookedAssets: 0,
    occupancyPercent: 0,
    revenue: 0,
    activeCampaigns: 0,
    totalClients: 0,
  });

  const fyRange = getFYRange();

  useEffect(() => {
    fetchReportStats();
  }, []);

  const fetchReportStats = async () => {
    setLoading(true);

    // Get asset counts
    const { count: totalAssets } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true });

    const { count: bookedAssets } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Booked');

    const occupancyPercent = totalAssets ? Math.round((bookedAssets || 0) / totalAssets * 100) : 0;

    // Get revenue
    const { data: revenueData } = await supabase
      .from('invoices')
      .select('total_amount')
      .in('status', ['Sent', 'Paid'])
      .gte('invoice_date', fyRange.start.toISOString().split('T')[0])
      .lte('invoice_date', fyRange.end.toISOString().split('T')[0]);

    const revenue = revenueData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;

    // Get active campaigns
    const { count: activeCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Assigned', 'InProgress', 'PhotoUploaded']);

    // Get total clients
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    setStats({
      totalAssets: totalAssets || 0,
      bookedAssets: bookedAssets || 0,
      occupancyPercent,
      revenue,
      activeCampaigns: activeCampaigns || 0,
      totalClients: totalClients || 0,
    });

    setLoading(false);
  };

  const reportCards = [
    {
      title: "Vacant Media",
      description: "View available inventory by location and type",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      route: "/reports/vacant-media",
      stat: `${stats.totalAssets - stats.bookedAssets} Available`,
    },
    {
      title: "Occupancy",
      description: "Track asset utilization and booking trends",
      icon: BarChart3,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
      route: "/reports/occupancy",
      stat: `${stats.occupancyPercent}% Occupied`,
    },
    {
      title: "Revenue",
      description: "Analyze revenue by client, city, and time period",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      route: "/reports/revenue",
      stat: formatINR(stats.revenue),
    },
    {
      title: "Client Performance",
      description: "Review client account health and payment history",
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      route: "/reports/client-performance",
      stat: `${stats.totalClients} Clients`,
    },
    {
      title: "Campaign Performance",
      description: "Monitor active campaigns and proof completion",
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950",
      route: "/reports/campaign-performance",
      stat: `${stats.activeCampaigns} Active`,
    },
    {
      title: "Finance Reports",
      description: "Invoice aging, GST tracking, and profitability",
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      route: "/reports/finance",
      stat: "Aging & GST",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Real-time insights and performance metrics powered by Highcharts
            </p>
          </div>

          {/* Revenue & Expenses */}
          <RevenueChart />

          {/* Two columns */}
          <div className="grid gap-6 md:grid-cols-2">
            <OccupancyChart />
            <ClientRevenueChart />
          </div>

          {/* Campaign Timeline */}
          <CampaignTimelineChart />

          {/* Asset Heatmap */}
          <AssetHeatMap />

          {/* Report Cards */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Detailed Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reportCards.map((report) => {
                const Icon = report.icon;
                return (
                  <Card
                    key={report.title}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(report.route)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-3 rounded-lg ${report.bgColor}`}>
                          <Icon className={`h-6 w-6 ${report.color}`} />
                        </div>
                        <span className={`text-sm font-semibold ${report.color}`}>
                          {report.stat}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {report.description}
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        View Report
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

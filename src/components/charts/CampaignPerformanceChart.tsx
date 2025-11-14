import { useEffect, useRef, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

interface CampaignPerformanceChartProps {
  campaignId: string;
}

export function CampaignPerformanceChart({ campaignId }: CampaignPerformanceChartProps) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [chartData, setChartData] = useState<any>({
    total: 0,
    pending: 0,
    installed: 0,
    verified: 0,
    rejected: 0,
  });

  const fetchData = async () => {
    const { data } = await supabase
      .from("campaign_assets")
      .select("status")
      .eq("campaign_id", campaignId);

    if (data) {
      const stats = {
        total: data.length,
        pending: data.filter((a) => a.status === "Pending" || a.status === "Assigned").length,
        installed: data.filter((a) => a.status === "Mounted" || a.status === "PhotoUploaded").length,
        verified: data.filter((a) => a.status === "Verified").length,
        rejected: 0, // Not in current schema, keeping for future use
      };
      setChartData(stats);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`campaign-${campaignId}-performance`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_assets",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "operations_photos",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const options: Highcharts.Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      height: 350,
    },
    title: {
      text: "Installation Progress",
      style: {
        color: "hsl(var(--foreground))",
        fontSize: "18px",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: "60%",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b><br>{point.percentage:.1f}%",
          style: {
            color: "hsl(var(--foreground))",
            textOutline: "none",
          },
        },
        showInLegend: true,
      },
    },
    legend: {
      itemStyle: {
        color: "hsl(var(--foreground))",
      },
      itemHoverStyle: {
        color: "hsl(var(--primary))",
      },
    },
    tooltip: {
      pointFormat: "<b>{point.y}</b> assets ({point.percentage:.1f}%)",
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      style: {
        color: "hsl(var(--foreground))",
      },
    },
    series: [
      {
        type: "pie",
        name: "Status",
        data: [
          { name: "Verified", y: chartData.verified, color: "#10b981" },
          { name: "Installed", y: chartData.installed, color: "#3b82f6" },
          { name: "Pending", y: chartData.pending, color: "#f59e0b" },
          { name: "Rejected", y: chartData.rejected, color: "#ef4444" },
        ],
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Real-time Progress</CardTitle>
        <RefreshCw className="h-4 w-4 text-muted-foreground animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{chartData.total}</div>
            <div className="text-xs text-muted-foreground">Total Assets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{chartData.verified}</div>
            <div className="text-xs text-muted-foreground">Verified</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{chartData.installed}</div>
            <div className="text-xs text-muted-foreground">Installed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{chartData.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
        <HighchartsReact ref={chartRef} highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}

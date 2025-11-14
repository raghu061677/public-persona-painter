import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CampaignTimelineChart() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  const fetchData = async () => {
    const { data } = await supabase
      .from("campaigns")
      .select("id, campaign_name, start_date, end_date, status")
      .order("start_date", { ascending: false })
      .limit(10);

    if (data) {
      setCampaigns(data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      height: 400,
    },
    title: {
      text: "Campaign Timeline (Recent 10)",
      style: {
        color: "hsl(var(--foreground))",
        fontSize: "18px",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    xAxis: {
      type: "datetime",
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
      },
    },
    yAxis: {
      categories: campaigns.map((c) => c.campaign_name),
      reversed: true,
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
      },
    },
    legend: {
      enabled: true,
      itemStyle: {
        color: "hsl(var(--foreground))",
      },
    },
    tooltip: {
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      style: {
        color: "hsl(var(--foreground))",
      },
      formatter: function () {
        const start = new Date(this.x as number);
        const end = new Date((this as any).high);
        return `<b>${this.series.name}</b><br>${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      },
    },
    series: [
      {
        type: "columnrange",
        name: "Campaigns",
        data: campaigns.map((campaign, index) => ({
          x: index,
          low: new Date(campaign.start_date).getTime(),
          high: new Date(campaign.end_date).getTime(),
          color:
            campaign.status === "Running"
              ? "#10b981"
              : campaign.status === "Completed"
              ? "#3b82f6"
              : "#f59e0b",
        })),
      },
    ],
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}

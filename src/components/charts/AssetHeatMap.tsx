import React, { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AssetHeatMapProps {
  className?: string;
}

export function AssetHeatMap({ className }: AssetHeatMapProps) {
  const [metric, setMetric] = useState<"total" | "available" | "booked">("total");
  const [areaData, setAreaData] = useState<{ [key: string]: number }>({});

  const fetchData = async () => {
    const { data: assets } = await supabase
      .from("media_assets")
      .select("area, status");

    if (assets) {
      const grouped: { [key: string]: { total: number; available: number; booked: number } } = {};

      assets.forEach((asset) => {
        const area = asset.area || "Unknown";
        if (!grouped[area]) {
          grouped[area] = { total: 0, available: 0, booked: 0 };
        }
        grouped[area].total++;
        if (asset.status === "Available") grouped[area].available++;
        if (asset.status === "Booked") grouped[area].booked++;
      });

      const metricData: { [key: string]: number } = {};
      Object.entries(grouped).forEach(([area, stats]) => {
        metricData[area] = stats[metric];
      });

      setAreaData(metricData);
    }
  };

  useEffect(() => {
    fetchData();
  }, [metric]);

  const chartData = Object.entries(areaData).map(([area, value]) => ({
    name: area,
    value,
  }));

  const options: Highcharts.Options = {
    chart: {
      type: "tilemap",
      backgroundColor: "transparent",
      height: 400,
    },
    title: {
      text: `Asset Distribution by Area - ${metric.charAt(0).toUpperCase() + metric.slice(1)}`,
      style: {
        color: "hsl(var(--foreground))",
        fontSize: "16px",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    xAxis: {
      visible: false,
    },
    yAxis: {
      visible: false,
    },
    colorAxis: {
      min: 0,
      minColor: "#FFFFFF",
      maxColor: "#1e40af",
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
      },
    },
    legend: {
      itemStyle: {
        color: "hsl(var(--foreground))",
      },
    },
    tooltip: {
      headerFormat: "",
      pointFormat: "<b>{point.name}</b><br>{point.value} assets",
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      style: {
        color: "hsl(var(--foreground))",
      },
    },
    plotOptions: {
      series: {
        dataLabels: {
          enabled: true,
          format: "{point.name}<br>{point.value}",
          color: "hsl(var(--foreground))",
          style: {
            textOutline: "none",
            fontSize: "11px",
          },
        },
      },
    },
    series: [
      {
        type: "tilemap",
        name: "Assets",
        data: chartData.map((item, index) => ({
          name: item.name,
          value: item.value,
          x: index % 5,
          y: Math.floor(index / 5),
        })),
      },
    ],
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Geographic Distribution</CardTitle>
        <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total">Total</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <HighchartsReact highcharts={Highcharts} options={options} />
      </CardContent>
    </Card>
  );
}

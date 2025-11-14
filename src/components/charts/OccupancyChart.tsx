import React, { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OccupancyChart() {
  const [chartData, setChartData] = useState<{ city: string; occupancy: number }[]>([]);

  const fetchData = async () => {
    const { data: assets } = await supabase
      .from("media_assets")
      .select("city, status");

    if (assets) {
      const cityStats: { [key: string]: { total: number; booked: number } } = {};

      assets.forEach((asset) => {
        const city = asset.city || "Unknown";
        if (!cityStats[city]) {
          cityStats[city] = { total: 0, booked: 0 };
        }
        cityStats[city].total++;
        if (asset.status === "Booked") {
          cityStats[city].booked++;
        }
      });

      const data = Object.entries(cityStats).map(([city, stats]) => ({
        city,
        occupancy: stats.total > 0 ? (stats.booked / stats.total) * 100 : 0,
      }));

      setChartData(data.sort((a, b) => b.occupancy - a.occupancy));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const options: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      height: 350,
    },
    title: {
      text: "Occupancy Rate by City",
      style: {
        color: "hsl(var(--foreground))",
        fontSize: "18px",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    xAxis: {
      categories: chartData.map((d) => d.city),
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
      },
    },
    yAxis: {
      min: 0,
      max: 100,
      title: {
        text: "Occupancy (%)",
        style: {
          color: "hsl(var(--foreground))",
        },
      },
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
        format: "{value}%",
      },
      plotLines: [
        {
          value: 75,
          color: "#10b981",
          dashStyle: "Dash",
          width: 2,
          label: {
            text: "Target 75%",
            style: {
              color: "#10b981",
            },
          },
        },
      ],
    },
    legend: {
      enabled: false,
    },
    tooltip: {
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      style: {
        color: "hsl(var(--foreground))",
      },
      pointFormat: "<b>{point.y:.1f}%</b> occupied",
    },
    plotOptions: {
      bar: {
        borderRadius: 5,
        dataLabels: {
          enabled: true,
          format: "{point.y:.1f}%",
          style: {
            color: "hsl(var(--foreground))",
            textOutline: "none",
          },
        },
        colorByPoint: false,
      },
    },
    series: [
      {
        type: "bar",
        name: "Occupancy",
        data: chartData.map((d) => ({
          y: d.occupancy,
          color: d.occupancy >= 75 ? "#10b981" : d.occupancy >= 50 ? "#f59e0b" : "#ef4444",
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

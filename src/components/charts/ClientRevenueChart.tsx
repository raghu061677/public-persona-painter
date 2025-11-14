import { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ClientRevenueChart() {
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);

  const fetchData = async () => {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("client_name, total_amount")
      .eq("status", "Paid");

    if (invoices) {
      const clientRevenue: { [key: string]: number } = {};

      invoices.forEach((invoice) => {
        const client = invoice.client_name || "Unknown";
        if (!clientRevenue[client]) {
          clientRevenue[client] = 0;
        }
        clientRevenue[client] += Number(invoice.total_amount);
      });

      const data = Object.entries(clientRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setChartData(data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const options: Highcharts.Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      height: 400,
    },
    title: {
      text: "Revenue by Top 10 Clients",
      style: {
        color: "hsl(var(--foreground))",
        fontSize: "18px",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    plotOptions: {
      pie: {
        innerSize: "50%",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b><br>₹{point.y:,.0f}",
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
    },
    tooltip: {
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      style: {
        color: "hsl(var(--foreground))",
      },
      pointFormat: "<b>₹{point.y:,.0f}</b> ({point.percentage:.1f}%)",
    },
    series: [
      {
        type: "pie",
        name: "Revenue",
        data: chartData.map((item) => ({
          name: item.name,
          y: item.value,
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

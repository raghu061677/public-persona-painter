import React, { useEffect, useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

export function RevenueChart() {
  const { company } = useCompany();
  const [chartData, setChartData] = useState<{ month: string; revenue: number; expenses: number }[]>([]);

  const fetchData = async () => {
    if (!company?.id) return;
    
    const sixMonthsAgo = subMonths(new Date(), 6);

    const [invoicesResult, expensesResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("invoice_date, total_amount")
        .eq("company_id", company.id)
        .gte("invoice_date", format(sixMonthsAgo, "yyyy-MM-dd"))
        .eq("status", "Paid"),
      supabase
        .from("expenses")
        .select("created_at, total_amount")
        .eq("company_id", company.id)
        .gte("created_at", sixMonthsAgo.toISOString()),
    ]);

    const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const month = format(date, "MMM yyyy");
      monthlyData[month] = { revenue: 0, expenses: 0 };
    }

    // Aggregate invoices
    invoicesResult.data?.forEach((invoice) => {
      const month = format(new Date(invoice.invoice_date), "MMM yyyy");
      if (monthlyData[month]) {
        monthlyData[month].revenue += Number(invoice.total_amount);
      }
    });

    // Aggregate expenses
    expensesResult.data?.forEach((expense) => {
      const month = format(new Date(expense.created_at), "MMM yyyy");
      if (monthlyData[month]) {
        monthlyData[month].expenses += Number(expense.total_amount);
      }
    });

    const data = Object.entries(monthlyData).map(([month, values]) => ({
      month,
      revenue: values.revenue,
      expenses: values.expenses,
    }));

    setChartData(data);
  };

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company]);

  const options: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      height: 400,
    },
    title: {
      text: "Revenue vs Expenses (Last 6 Months)",
      style: {
        color: "hsl(var(--foreground))",
        fontSize: "18px",
        fontWeight: "600",
      },
    },
    credits: { enabled: false },
    xAxis: {
      categories: chartData.map((d) => d.month),
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: "Amount (₹)",
        style: {
          color: "hsl(var(--foreground))",
        },
      },
      labels: {
        style: {
          color: "hsl(var(--foreground))",
        },
        formatter: function () {
          return "₹" + (this.value as number).toLocaleString("en-IN");
        },
      },
    },
    legend: {
      itemStyle: {
        color: "hsl(var(--foreground))",
      },
    },
    tooltip: {
      shared: true,
      backgroundColor: "hsl(var(--background))",
      borderColor: "hsl(var(--border))",
      style: {
        color: "hsl(var(--foreground))",
      },
      formatter: function () {
        let s = "<b>" + this.x + "</b>";
        this.points?.forEach((point) => {
          s += "<br/>" + point.series.name + ": ₹" + point.y?.toLocaleString("en-IN");
        });
        return s;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 5,
      },
    },
    series: [
      {
        type: "column",
        name: "Revenue",
        data: chartData.map((d) => d.revenue),
        color: "#10b981",
      },
      {
        type: "column",
        name: "Expenses",
        data: chartData.map((d) => d.expenses),
        color: "#ef4444",
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

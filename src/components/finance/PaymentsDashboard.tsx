import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Clock } from "lucide-react";

interface PaymentMetrics {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  avgPaymentTime: number;
}

export function PaymentsDashboard() {
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
    avgPaymentTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("status, total_amount, balance_due");

      if (error) throw error;

      const received = invoices
        ?.filter((i) => i.status === "Paid")
        .reduce((sum, i) => sum + i.total_amount, 0) || 0;

      const pending = invoices
        ?.filter((i) => i.status === "Sent")
        .reduce((sum, i) => sum + i.balance_due, 0) || 0;

      const overdue = invoices
        ?.filter((i) => i.status === "Overdue")
        .reduce((sum, i) => sum + i.balance_due, 0) || 0;

      setMetrics({
        totalReceived: received,
        totalPending: pending,
        totalOverdue: overdue,
        avgPaymentTime: 15, // Placeholder
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: "Total Received",
      value: `₹${metrics.totalReceived.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Payments",
      value: `₹${metrics.totalPending.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Overdue Payments",
      value: `₹${metrics.totalOverdue.toLocaleString()}`,
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Avg Payment Time",
      value: `${metrics.avgPaymentTime} days`,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  if (loading) {
    return <div className="text-center py-8">Loading payment data...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metricCards.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
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
  );
}

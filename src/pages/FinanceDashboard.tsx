import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Receipt, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatINR, getFYRange } from "@/utils/finance";

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    estimations: 0,
    invoices: 0,
    expenses: 0,
    revenue: 0,
    paid: 0,
    outstanding: 0,
    expenses_total: 0,
    profit: 0,
  });

  const fyRange = getFYRange();

  useEffect(() => {
    fetchFinanceStats();
  }, []);

  const fetchFinanceStats = async () => {
    setLoading(true);

    // Count estimations
    const { count: estimationsCount } = await supabase
      .from('estimations')
      .select('*', { count: 'exact', head: true });

    // Count invoices
    const { count: invoicesCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    // Count expenses
    const { count: expensesCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });

    // Calculate revenue (sent and paid invoices in FY)
    const { data: revenueData } = await supabase
      .from('invoices')
      .select('total_amount, balance_due')
      .in('status', ['Sent', 'Paid'])
      .gte('invoice_date', fyRange.start.toISOString().split('T')[0])
      .lte('invoice_date', fyRange.end.toISOString().split('T')[0]);

    const revenue = revenueData?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0;
    const outstanding = revenueData?.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0) || 0;
    const paid = revenue - outstanding;

    // Calculate expenses in FY
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('total_amount')
      .gte('created_at', fyRange.start.toISOString())
      .lte('created_at', fyRange.end.toISOString());

    const expensesTotal = expensesData?.reduce((sum, exp) => sum + Number(exp.total_amount || 0), 0) || 0;

    setStats({
      estimations: estimationsCount || 0,
      invoices: invoicesCount || 0,
      expenses: expensesCount || 0,
      revenue,
      paid,
      outstanding,
      expenses_total: expensesTotal,
      profit: revenue - expensesTotal,
    });

    setLoading(false);
  };

  const kpiCards = [
    {
      title: "Revenue (FY)",
      value: formatINR(stats.revenue),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Paid",
      value: formatINR(stats.paid),
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Outstanding",
      value: formatINR(stats.outstanding),
      icon: Receipt,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "Expenses",
      value: formatINR(stats.expenses_total),
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Profit",
      value: formatINR(stats.profit),
      icon: Wallet,
      color: stats.profit >= 0 ? "text-green-600" : "text-red-600",
      bgColor: stats.profit >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Finance Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Financial Year {fyRange.label}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.title} className={kpi.bgColor}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Access Tabs */}
        <Tabs defaultValue="estimations" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="estimations">
              <FileText className="mr-2 h-4 w-4" />
              Estimations ({stats.estimations})
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="mr-2 h-4 w-4" />
              Invoices ({stats.invoices})
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <Wallet className="mr-2 h-4 w-4" />
              Expenses ({stats.expenses})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estimations">
            <Card>
              <CardHeader>
                <CardTitle>Estimations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Manage quotations and estimations for clients
                </p>
                <Button variant="gradient" onClick={() => navigate('/finance/estimations')}>
                  View All Estimations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Track invoices, payments, and outstanding amounts
                </p>
                <Button variant="gradient" onClick={() => navigate('/finance/invoices')}>
                  View All Invoices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Record and track all campaign and operational expenses
                </p>
                <Button variant="gradient" onClick={() => navigate('/finance/expenses')}>
                  View All Expenses
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

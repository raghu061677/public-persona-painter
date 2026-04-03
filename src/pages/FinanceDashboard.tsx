import { useEffect, useState, useMemo } from "react";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Receipt, Wallet, BarChart3, Users, Megaphone, Download } from "lucide-react";
import { formatINR, getFYRange, getDaysOverdue } from "@/utils/finance";
import { useCompany } from "@/contexts/CompanyContext";
import { FinanceKPICards } from "@/components/finance/FinanceKPICards";
import { AgingBucketsCard, type AgingBucket } from "@/components/finance/AgingBucketsCard";
import { InvoiceStatusSummary } from "@/components/finance/InvoiceStatusSummary";
import { ClientOutstandingTable, type ClientOutstanding } from "@/components/finance/ClientOutstandingTable";
import { CampaignOutstandingTable, type CampaignOutstanding } from "@/components/finance/CampaignOutstandingTable";
import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);

  const fyRange = getFYRange();

  useEffect(() => {
    fetchInvoices();
  }, [company?.id]);

  const fetchInvoices = async () => {
    setLoading(true);
    const query = supabase
      .from("invoices")
      .select("id, client_id, client_name, campaign_id, invoice_date, due_date, status, total_amount, paid_amount, credited_amount, balance_due, sub_total, gst_amount, clients:client_id(gst_number), campaigns:campaign_id(campaign_name)")
      .not("status", "in", '("Draft","Cancelled")');

    const { data } = await query;
    setInvoices(data || []);
    setLoading(false);
  };

  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // KPI calculations
  const kpis = useMemo(() => {
    const receivable = invoices.filter(i => ["Sent", "Partial", "Overdue"].includes(i.status));
    const totalReceivables = receivable.reduce((s, i) => s + Number(i.balance_due || 0), 0);

    const overdueInvoices = receivable.filter(i => {
      if (!i.due_date) return false;
      return new Date(i.due_date) < today && Number(i.balance_due || 0) > 0;
    });
    const overdueAmount = overdueInvoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);

    const collectedThisMonth = invoices
      .filter(i => i.status === "Paid")
      .reduce((s, i) => s + Number(i.paid_amount || 0), 0);

    return {
      totalReceivables,
      overdueAmount,
      collectedThisMonth,
      outstandingCount: receivable.length,
    };
  }, [invoices]);

  // Aging buckets
  const agingBuckets = useMemo((): AgingBucket[] => {
    const receivable = invoices.filter(i => ["Sent", "Partial", "Overdue"].includes(i.status) && Number(i.balance_due || 0) > 0);
    const buckets = [
      { label: "Not Yet Due", count: 0, amount: 0, color: "bg-green-500" },
      { label: "0–30 Days", count: 0, amount: 0, color: "bg-yellow-500" },
      { label: "31–60 Days", count: 0, amount: 0, color: "bg-orange-500" },
      { label: "61–90 Days", count: 0, amount: 0, color: "bg-red-400" },
      { label: "90+ Days", count: 0, amount: 0, color: "bg-red-600" },
    ];

    receivable.forEach((inv) => {
      const days = inv.due_date ? getDaysOverdue(inv.due_date) : 0;
      const amt = Number(inv.balance_due || 0);
      let idx = 0;
      if (days <= 0) idx = 0;
      else if (days <= 30) idx = 1;
      else if (days <= 60) idx = 2;
      else if (days <= 90) idx = 3;
      else idx = 4;
      buckets[idx].count++;
      buckets[idx].amount += amt;
    });

    return buckets;
  }, [invoices]);

  const agingTotal = agingBuckets.reduce((s, b) => s + b.amount, 0);

  // Status summary
  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1; });
    return [
      { status: "Sent", count: counts["Sent"] || 0, color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
      { status: "Partial", count: counts["Partial"] || 0, color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
      { status: "Paid", count: counts["Paid"] || 0, color: "bg-green-500/10 text-green-700 border-green-500/30" },
      { status: "Overdue", count: counts["Overdue"] || 0, color: "bg-red-500/10 text-red-700 border-red-500/30" },
    ];
  }, [invoices]);

  // Client-wise outstanding
  const clientOutstanding = useMemo((): ClientOutstanding[] => {
    const receivable = invoices.filter(i => ["Sent", "Partial", "Overdue"].includes(i.status));
    const map: Record<string, ClientOutstanding> = {};

    receivable.forEach((inv) => {
      const key = inv.client_id || inv.client_name || "Unknown";
      if (!map[key]) {
        map[key] = {
          client_name: inv.client_name || "Unknown",
          gst_no: (inv as any).clients?.gst_number || "",
          invoice_count: 0,
          total_invoiced: 0,
          paid_amount: 0,
          balance_due: 0,
          overdue_amount: 0,
          oldest_due_date: null,
        };
      }
      const c = map[key];
      c.invoice_count++;
      c.total_invoiced += Number(inv.total_amount || 0);
      c.paid_amount += Number(inv.paid_amount || 0) + Number(inv.credited_amount || 0);
      c.balance_due += Number(inv.balance_due || 0);
      if (inv.due_date && new Date(inv.due_date) < today && Number(inv.balance_due || 0) > 0) {
        c.overdue_amount += Number(inv.balance_due || 0);
      }
      if (inv.due_date && (!c.oldest_due_date || inv.due_date < c.oldest_due_date)) {
        c.oldest_due_date = inv.due_date;
      }
    });

    return Object.values(map).sort((a, b) => b.balance_due - a.balance_due);
  }, [invoices]);

  // Campaign-wise outstanding
  const campaignOutstanding = useMemo((): CampaignOutstanding[] => {
    const receivable = invoices.filter(i => ["Sent", "Partial", "Overdue"].includes(i.status) && i.campaign_id);
    const map: Record<string, CampaignOutstanding> = {};

    receivable.forEach((inv) => {
      const key = inv.campaign_id;
      if (!map[key]) {
        map[key] = {
          campaign_name: (inv as any).campaigns?.campaign_name || "",
          campaign_id: inv.campaign_id,
          invoice_count: 0,
          total_invoiced: 0,
          paid_amount: 0,
          balance_due: 0,
          overdue_amount: 0,
        };
      }
      const c = map[key];
      c.invoice_count++;
      c.total_invoiced += Number(inv.total_amount || 0);
      c.paid_amount += Number(inv.paid_amount || 0) + Number(inv.credited_amount || 0);
      c.balance_due += Number(inv.balance_due || 0);
      if (inv.due_date && new Date(inv.due_date) < today && Number(inv.balance_due || 0) > 0) {
        c.overdue_amount += Number(inv.balance_due || 0);
      }
    });

    return Object.values(map).sort((a, b) => b.balance_due - a.balance_due);
  }, [invoices]);

  return (
    <ModuleGuard module="finance">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Finance Control Center</h1>
              <p className="text-muted-foreground mt-1">
                Receivables, Aging & Collections — FY {fyRange.label}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/admin/invoices")}>
                <FileText className="mr-2 h-4 w-4" /> View Invoices
              </Button>
              <Button variant="outline" onClick={() => navigate("/finance/expenses")}>
                <Wallet className="mr-2 h-4 w-4" /> Expenses
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="mb-6">
              <FinanceKPICards {...kpis} />
            </div>
          )}

          {/* Main content tabs */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">
                <BarChart3 className="mr-2 h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="clients">
                <Users className="mr-2 h-4 w-4" /> Client Receivables
              </TabsTrigger>
              <TabsTrigger value="campaigns">
                <Megaphone className="mr-2 h-4 w-4" /> Campaign Receivables
              </TabsTrigger>
              <TabsTrigger value="quick">
                <Receipt className="mr-2 h-4 w-4" /> Quick Access
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Skeleton className="h-72 rounded-xl" />
                  <Skeleton className="h-72 rounded-xl" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AgingBucketsCard buckets={agingBuckets} total={agingTotal} />
                  <InvoiceStatusSummary statuses={statusSummary} />
                </div>
              )}
            </TabsContent>

            {/* Client Receivables Tab */}
            <TabsContent value="clients">
              {loading ? (
                <Skeleton className="h-96 rounded-xl" />
              ) : (
                <ClientOutstandingTable data={clientOutstanding} />
              )}
            </TabsContent>

            {/* Campaign Receivables Tab */}
            <TabsContent value="campaigns">
              {loading ? (
                <Skeleton className="h-96 rounded-xl" />
              ) : (
                <CampaignOutstandingTable data={campaignOutstanding} />
              )}
            </TabsContent>

            {/* Quick Access Tab */}
            <TabsContent value="quick">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle>Estimations</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">Manage quotations and estimations</p>
                    <Button variant="gradient" onClick={() => navigate("/finance/estimations")}>View Estimations</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">Track invoices and payments</p>
                    <Button variant="gradient" onClick={() => navigate("/admin/invoices")}>View Invoices</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Expenses</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">Record and track expenses</p>
                    <Button variant="gradient" onClick={() => navigate("/finance/expenses")}>View Expenses</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ModuleGuard>
  );
}

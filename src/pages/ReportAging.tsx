import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/navigation/PageHeader";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { ROUTES } from "@/lib/routes";
import { Download, AlertCircle, Clock, TrendingDown, Users, ExternalLink, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

interface AgingRow {
  client_id: string;
  client_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
  total: number;
  invoice_count: number;
}

interface InvoiceAgingDetail {
  invoice_id: string;
  client_id: string;
  client_name: string;
  campaign_id: string | null;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  days_overdue: number;
  aging_bucket: string;
}

export default function ReportAging() {
  const navigate = useNavigate();
  const [agingData, setAgingData] = useState<AgingRow[]>([]);
  const [detailedData, setDetailedData] = useState<InvoiceAgingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary");
  const [bucketFilter, setBucketFilter] = useState<string>("all");

  const [totals, setTotals] = useState({
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
    total: 0,
  });

  useEffect(() => {
    fetchAgingData();
  }, []);

  const fetchAgingData = async () => {
    setLoading(true);
    try {
      // Use the invoice_aging_report view
      const { data, error } = await supabase
        .from("invoice_aging_report" as any)
        .select("*")
        .order("days_overdue", { ascending: false }) as any;

      if (error) throw error;

      const invoices = (data || []) as unknown as InvoiceAgingDetail[];
      setDetailedData(invoices);

      // Group by client for summary view
      const clientMap = new Map<string, AgingRow>();

      invoices.forEach((inv) => {
        if (!clientMap.has(inv.client_id)) {
          clientMap.set(inv.client_id, {
            client_id: inv.client_id,
            client_name: inv.client_name || "Unknown",
            current: 0,
            days_1_30: 0,
            days_31_60: 0,
            days_61_90: 0,
            days_90_plus: 0,
            total: 0,
            invoice_count: 0,
          });
        }

        const row = clientMap.get(inv.client_id)!;
        const balance = Number(inv.balance_due || 0);
        row.invoice_count++;
        row.total += balance;

        switch (inv.aging_bucket) {
          case "Current":
            row.current += balance;
            break;
          case "1-30 Days":
            row.days_1_30 += balance;
            break;
          case "31-60 Days":
            row.days_31_60 += balance;
            break;
          case "61-90 Days":
            row.days_61_90 += balance;
            break;
          case "90+ Days":
            row.days_90_plus += balance;
            break;
        }
      });

      const summaryData = Array.from(clientMap.values())
        .filter(row => row.total > 0)
        .sort((a, b) => b.total - a.total);

      setAgingData(summaryData);

      // Calculate totals
      const totalsCalc = summaryData.reduce(
        (acc, row) => ({
          current: acc.current + row.current,
          days_1_30: acc.days_1_30 + row.days_1_30,
          days_31_60: acc.days_31_60 + row.days_31_60,
          days_61_90: acc.days_61_90 + row.days_61_90,
          days_90_plus: acc.days_90_plus + row.days_90_plus,
          total: acc.total + row.total,
        }),
        { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0, total: 0 }
      );

      setTotals(totalsCalc);
    } catch (error) {
      console.error("Error fetching aging data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDetailedData = bucketFilter === "all"
    ? detailedData.filter(d => d.aging_bucket !== "Paid")
    : detailedData.filter(d => d.aging_bucket === bucketFilter);

  const exportToExcel = () => {
    const exportData = viewMode === "summary"
      ? agingData.map(row => ({
          "Client Name": row.client_name,
          "Current": row.current,
          "1-30 Days": row.days_1_30,
          "31-60 Days": row.days_31_60,
          "61-90 Days": row.days_61_90,
          "90+ Days": row.days_90_plus,
          "Total Outstanding": row.total,
          "Invoice Count": row.invoice_count,
        }))
      : filteredDetailedData.map(inv => ({
          "Invoice ID": inv.invoice_id,
          "Client Name": inv.client_name,
          "Invoice Date": inv.invoice_date,
          "Due Date": inv.due_date,
          "Total Amount": inv.total_amount,
          "Paid Amount": inv.paid_amount,
          "Balance Due": inv.balance_due,
          "Days Overdue": inv.days_overdue,
          "Aging Bucket": inv.aging_bucket,
          "Status": inv.status,
        }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, viewMode === "summary" ? "Aging Summary" : "Aging Details");
    XLSX.writeFile(wb, `aging-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getBucketBadgeColor = (bucket: string) => {
    switch (bucket) {
      case "Current":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "1-30 Days":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "31-60 Days":
        return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      case "61-90 Days":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "90+ Days":
        return "bg-red-700/10 text-red-800 border-red-700/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader title="Aging Report" description="Loading..." showBackButton />
        <div className="text-center py-12 text-muted-foreground">Loading aging data...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Accounts Receivable Aging Report"
        description="Outstanding invoices grouped by age since due date"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Reports", path: ROUTES.REPORTS },
          { label: "Aging Report" },
        ]}
        showBackButton
        backPath={ROUTES.REPORTS}
        actions={
          <>
            <Button variant="outline" onClick={fetchAgingData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatINR(totals.current)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">1-30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">{formatINR(totals.days_1_30)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">31-60 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatINR(totals.days_31_60)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">61-90 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatINR(totals.days_61_90)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-700">{formatINR(totals.days_90_plus)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatINR(totals.total)}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex items-center gap-4">
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as "summary" | "detailed")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="summary">Summary by Client</SelectItem>
            <SelectItem value="detailed">Detailed by Invoice</SelectItem>
          </SelectContent>
        </Select>

        {viewMode === "detailed" && (
          <Select value={bucketFilter} onValueChange={setBucketFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Aging bucket" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buckets</SelectItem>
              <SelectItem value="Current">Current</SelectItem>
              <SelectItem value="1-30 Days">1-30 Days</SelectItem>
              <SelectItem value="31-60 Days">31-60 Days</SelectItem>
              <SelectItem value="61-90 Days">61-90 Days</SelectItem>
              <SelectItem value="90+ Days">90+ Days</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {viewMode === "summary" ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right text-green-700">Current</TableHead>
                  <TableHead className="text-right text-yellow-700">1-30 Days</TableHead>
                  <TableHead className="text-right text-orange-700">31-60 Days</TableHead>
                  <TableHead className="text-right text-red-700">61-90 Days</TableHead>
                  <TableHead className="text-right text-red-800">90+ Days</TableHead>
                  <TableHead className="text-right font-bold">Total</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.map((row) => (
                  <TableRow key={row.client_id} className="hover:bg-muted/30">
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/clients/${row.client_id}`)}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.client_name}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{formatINR(row.current)}</TableCell>
                    <TableCell className="text-right text-yellow-600">{formatINR(row.days_1_30)}</TableCell>
                    <TableCell className="text-right text-orange-600">{formatINR(row.days_31_60)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatINR(row.days_61_90)}</TableCell>
                    <TableCell className="text-right text-red-700 font-medium">{formatINR(row.days_90_plus)}</TableCell>
                    <TableCell className="text-right font-bold">{formatINR(row.total)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.invoice_count}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/clients/${row.client_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatINR(totals.current)}</TableCell>
                  <TableCell className="text-right text-yellow-600">{formatINR(totals.days_1_30)}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatINR(totals.days_31_60)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatINR(totals.days_61_90)}</TableCell>
                  <TableCell className="text-right text-red-700">{formatINR(totals.days_90_plus)}</TableCell>
                  <TableCell className="text-right">{formatINR(totals.total)}</TableCell>
                  <TableCell className="text-right">{agingData.reduce((sum, r) => sum + r.invoice_count, 0)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Days Over</TableHead>
                  <TableHead>Bucket</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDetailedData.map((inv) => (
                  <TableRow key={inv.invoice_id} className="hover:bg-muted/30">
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/invoices/${inv.invoice_id}`)}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoice_id}
                      </button>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/clients/${inv.client_id}`)}
                        className="hover:underline"
                      >
                        {inv.client_name}
                      </button>
                    </TableCell>
                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                    <TableCell className="text-right">{formatINR(inv.total_amount)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatINR(inv.paid_amount)}</TableCell>
                    <TableCell className="text-right font-medium text-orange-600">{formatINR(inv.balance_due)}</TableCell>
                    <TableCell>
                      {inv.days_overdue > 0 ? (
                        <span className="text-red-600 font-medium">{inv.days_overdue}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getBucketBadgeColor(inv.aging_bucket)}>
                        {inv.aging_bucket}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/admin/invoices/${inv.invoice_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

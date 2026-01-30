import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/navigation/PageHeader";
import { formatINR } from "@/utils/finance";
import { ROUTES } from "@/lib/routes";
import { Download, Users, Briefcase, Calendar, RefreshCw, ExternalLink } from "lucide-react";
import * as XLSX from "xlsx";

interface ClientOutstanding {
  client_id: string;
  client_name: string;
  invoice_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
}

interface CampaignOutstanding {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  invoice_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
}

interface MonthOutstanding {
  month: string;
  invoice_count: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
}

export default function ReportOutstanding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientOutstanding[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignOutstanding[]>([]);
  const [monthData, setMonthData] = useState<MonthOutstanding[]>([]);
  const [activeTab, setActiveTab] = useState("clients");

  const [totals, setTotals] = useState({
    invoiced: 0,
    paid: 0,
    outstanding: 0,
    invoiceCount: 0,
  });

  useEffect(() => {
    fetchOutstandingData();
  }, []);

  const fetchOutstandingData = async () => {
    setLoading(true);
    try {
      // Fetch client outstanding using the view
      const { data: clientSummary, error: clientError } = await supabase
        .from("client_outstanding_summary" as any)
        .select("*")
        .order("total_outstanding", { ascending: false }) as any;

      if (clientError) throw clientError;
      const clientRows = (clientSummary || []) as unknown as ClientOutstanding[];
      setClientData(clientRows);

      // Calculate totals from client data
      const totalCalc = clientRows.reduce(
        (acc, row) => ({
          invoiced: acc.invoiced + Number(row.total_invoiced || 0),
          paid: acc.paid + Number(row.total_paid || 0),
          outstanding: acc.outstanding + Number(row.total_outstanding || 0),
          invoiceCount: acc.invoiceCount + Number(row.invoice_count || 0),
        }),
        { invoiced: 0, paid: 0, outstanding: 0, invoiceCount: 0 }
      );
      setTotals(totalCalc);

      // Fetch invoices for campaign grouping
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("campaign_id, client_name, total_amount, paid_amount, balance_due")
        .not("status", "in", '("Draft","Cancelled")')
        .not("campaign_id", "is", null);

      if (invoicesError) throw invoicesError;

      // Group by campaign
      const campaignMap = new Map<string, CampaignOutstanding>();
      (invoices || []).forEach((inv) => {
        const key = inv.campaign_id!;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            campaign_id: key,
            campaign_name: key,
            client_name: inv.client_name || "Unknown",
            invoice_count: 0,
            total_invoiced: 0,
            total_paid: 0,
            total_outstanding: 0,
          });
        }
        const row = campaignMap.get(key)!;
        row.invoice_count++;
        row.total_invoiced += Number(inv.total_amount || 0);
        row.total_paid += Number(inv.paid_amount || 0);
        row.total_outstanding += Number(inv.balance_due || 0);
      });

      setCampaignData(
        Array.from(campaignMap.values())
          .filter(r => r.total_outstanding > 0)
          .sort((a, b) => b.total_outstanding - a.total_outstanding)
      );

      // Group by billing month
      const { data: monthlyInvoices, error: monthlyError } = await supabase
        .from("invoices")
        .select("billing_month, total_amount, paid_amount, balance_due")
        .not("status", "in", '("Draft","Cancelled")');

      if (monthlyError) throw monthlyError;

      const monthMap = new Map<string, MonthOutstanding>();
      (monthlyInvoices || []).forEach((inv) => {
        const month = inv.billing_month || "Unknown";
        if (!monthMap.has(month)) {
          monthMap.set(month, {
            month,
            invoice_count: 0,
            total_invoiced: 0,
            total_paid: 0,
            total_outstanding: 0,
          });
        }
        const row = monthMap.get(month)!;
        row.invoice_count++;
        row.total_invoiced += Number(inv.total_amount || 0);
        row.total_paid += Number(inv.paid_amount || 0);
        row.total_outstanding += Number(inv.balance_due || 0);
      });

      setMonthData(
        Array.from(monthMap.values())
          .sort((a, b) => b.month.localeCompare(a.month))
      );

    } catch (error) {
      console.error("Error fetching outstanding data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    let exportData: any[] = [];
    let sheetName = "";

    switch (activeTab) {
      case "clients":
        exportData = clientData.map(row => ({
          "Client Name": row.client_name,
          "Invoice Count": row.invoice_count,
          "Total Invoiced": row.total_invoiced,
          "Total Paid": row.total_paid,
          "Outstanding": row.total_outstanding,
          "Overdue Count": row.overdue_count,
          "Overdue Amount": row.overdue_amount,
        }));
        sheetName = "By Client";
        break;
      case "campaigns":
        exportData = campaignData.map(row => ({
          "Campaign ID": row.campaign_id,
          "Client Name": row.client_name,
          "Invoice Count": row.invoice_count,
          "Total Invoiced": row.total_invoiced,
          "Total Paid": row.total_paid,
          "Outstanding": row.total_outstanding,
        }));
        sheetName = "By Campaign";
        break;
      case "months":
        exportData = monthData.map(row => ({
          "Billing Month": row.month,
          "Invoice Count": row.invoice_count,
          "Total Invoiced": row.total_invoiced,
          "Total Paid": row.total_paid,
          "Outstanding": row.total_outstanding,
        }));
        sheetName = "By Month";
        break;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `outstanding-report-${activeTab}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const collectionRate = totals.invoiced > 0 
    ? ((totals.paid / totals.invoiced) * 100).toFixed(1) 
    : "0";

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader title="Outstanding Report" description="Loading..." showBackButton />
        <div className="text-center py-12 text-muted-foreground">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        title="Outstanding Report"
        description="View outstanding amounts by client, campaign, or billing month"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Reports", path: ROUTES.REPORTS },
          { label: "Outstanding" },
        ]}
        showBackButton
        backPath={ROUTES.REPORTS}
        actions={
          <>
            <Button variant="outline" onClick={fetchOutstandingData}>
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatINR(totals.invoiced)}</div>
            <p className="text-xs text-muted-foreground">{totals.invoiceCount} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatINR(totals.paid)}</div>
            <p className="text-xs text-muted-foreground">{collectionRate}% collection rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatINR(totals.outstanding)}</div>
            <p className="text-xs text-muted-foreground">
              {clientData.filter(c => c.total_outstanding > 0).length} clients with dues
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatINR(clientData.reduce((sum, c) => sum + Number(c.overdue_amount || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {clientData.reduce((sum, c) => sum + Number(c.overdue_count || 0), 0)} overdue invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            By Client
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            By Campaign
          </TabsTrigger>
          <TabsTrigger value="months" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            By Month
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientData.filter(c => c.total_outstanding > 0).map((row) => (
                    <TableRow key={row.client_id}>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/admin/clients/${row.client_id}`)}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.client_name}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">{row.invoice_count}</TableCell>
                      <TableCell className="text-right">{formatINR(row.total_invoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatINR(row.total_paid)}</TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatINR(row.total_outstanding)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(row.overdue_count || 0) > 0 ? (
                          <Badge variant="destructive">{row.overdue_count}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Campaign</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignData.map((row) => (
                    <TableRow key={row.campaign_id}>
                      <TableCell>
                        <button
                          onClick={() => navigate(`/admin/campaigns/${row.campaign_id}`)}
                          className="font-medium text-primary hover:underline"
                        >
                          {row.campaign_name}
                        </button>
                      </TableCell>
                      <TableCell>{row.client_name}</TableCell>
                      <TableCell className="text-right">{row.invoice_count}</TableCell>
                      <TableCell className="text-right">{formatINR(row.total_invoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatINR(row.total_paid)}</TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatINR(row.total_outstanding)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/campaigns/${row.campaign_id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="months" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Billing Month</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Collection %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthData.map((row) => {
                    const collectionPct = row.total_invoiced > 0 
                      ? ((row.total_paid / row.total_invoiced) * 100).toFixed(0) 
                      : 0;
                    return (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">{row.month}</TableCell>
                        <TableCell className="text-right">{row.invoice_count}</TableCell>
                        <TableCell className="text-right">{formatINR(row.total_invoiced)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatINR(row.total_paid)}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatINR(row.total_outstanding)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Number(collectionPct) >= 80 ? "default" : "secondary"}>
                            {collectionPct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/navigation/PageHeader";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { ROUTES } from "@/lib/routes";
import { Download, Clock, ExternalLink, RefreshCw, Search, RotateCcw, ArrowUpDown, Columns, ChevronUp, ChevronDown } from "lucide-react";
import { DateRangeFilter } from "@/components/common/date-range-filter";
import { DateRange } from "react-day-picker";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import { getInvoiceDetailPath } from "@/utils/invoiceNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Column config for detailed view
const DETAIL_COLUMNS = [
  { key: "invoice_id", label: "Invoice ID", default: true },
  { key: "client_name", label: "Client Name", default: true },
  { key: "invoice_date", label: "Invoice Date", default: true },
  { key: "due_date", label: "Due Date", default: true },
  { key: "days_overdue", label: "Days Overdue", default: true },
  { key: "total_amount", label: "Invoice Total", default: true },
  { key: "paid_amount", label: "Paid Amount", default: true },
  { key: "balance_due", label: "Outstanding", default: true },
  { key: "aging_bucket", label: "Aging Bucket", default: true },
  { key: "status", label: "Status", default: false },
];

type SortField = "client_name" | "due_date" | "days_overdue" | "balance_due" | "invoice_date" | "total_amount";

export default function ReportAging() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [detailedData, setDetailedData] = useState<InvoiceAgingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"summary" | "detailed">(
    (searchParams.get("view") as any) || "summary"
  );

  // Filters from URL
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from && to) return { from: new Date(from), to: new Date(to) };
    return undefined;
  });
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [bucketFilter, setBucketFilter] = useState<string>(searchParams.get("bucket") || "all");

  // Sort
  const [sortField, setSortField] = useState<SortField>("days_overdue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Column visibility
  const [visibleCols, setVisibleCols] = useState<string[]>(
    DETAIL_COLUMNS.filter(c => c.default).map(c => c.key)
  );

  useEffect(() => {
    fetchData();
  }, [company?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_aging_report" as any)
        .select("*")
        .order("days_overdue", { ascending: false }) as any;
      if (error) throw error;
      setDetailedData((data || []) as unknown as InvoiceAgingDetail[]);
    } catch (error: any) {
      console.error("Error fetching aging data:", error);
      toast({ title: "Error", description: "Failed to load aging data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filtered detailed data
  const filteredDetailed = useMemo(() => {
    let result = detailedData.filter(d => d.aging_bucket !== "Paid");

    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(d =>
        d.invoice_id?.toLowerCase().includes(q) ||
        d.client_name?.toLowerCase().includes(q)
      );
    }

    if (dateRange?.from && dateRange?.to) {
      result = result.filter(d => {
        const invDate = new Date(d.invoice_date);
        return invDate >= dateRange.from! && invDate <= dateRange.to!;
      });
    }

    if (statusFilter !== "all") {
      result = result.filter(d => {
        if (statusFilter === "Unpaid") return d.status !== "Paid" && d.status !== "Partial";
        return d.status === statusFilter;
      });
    }

    if (bucketFilter !== "all") {
      result = result.filter(d => d.aging_bucket === bucketFilter);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "client_name": aVal = a.client_name; bVal = b.client_name; break;
        case "due_date": aVal = new Date(a.due_date).getTime(); bVal = new Date(b.due_date).getTime(); break;
        case "invoice_date": aVal = new Date(a.invoice_date).getTime(); bVal = new Date(b.invoice_date).getTime(); break;
        case "days_overdue": aVal = a.days_overdue; bVal = b.days_overdue; break;
        case "balance_due": aVal = a.balance_due; bVal = b.balance_due; break;
        case "total_amount": aVal = a.total_amount; bVal = b.total_amount; break;
        default: return 0;
      }
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [detailedData, searchValue, dateRange, statusFilter, bucketFilter, sortField, sortDir]);

  // Summary data from filtered detailed
  const { agingData, totals } = useMemo(() => {
    const clientMap = new Map<string, AgingRow>();
    filteredDetailed.forEach((inv) => {
      if (!clientMap.has(inv.client_id)) {
        clientMap.set(inv.client_id, {
          client_id: inv.client_id,
          client_name: inv.client_name || "Unknown",
          current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0,
          total: 0, invoice_count: 0,
        });
      }
      const row = clientMap.get(inv.client_id)!;
      const balance = Number(inv.balance_due || 0);
      row.invoice_count++;
      row.total += balance;
      switch (inv.aging_bucket) {
        case "Current": row.current += balance; break;
        case "1-30 Days": row.days_1_30 += balance; break;
        case "31-60 Days": row.days_31_60 += balance; break;
        case "61-90 Days": row.days_61_90 += balance; break;
        case "90+ Days": row.days_90_plus += balance; break;
      }
    });

    const summaryData = Array.from(clientMap.values()).filter(r => r.total > 0);

    // Sort summary
    if (sortField === "client_name") {
      summaryData.sort((a, b) => sortDir === "asc" ? a.client_name.localeCompare(b.client_name) : b.client_name.localeCompare(a.client_name));
    } else {
      summaryData.sort((a, b) => sortDir === "asc" ? a.total - b.total : b.total - a.total);
    }

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

    return { agingData: summaryData, totals: totalsCalc };
  }, [filteredDetailed, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const resetFilters = () => {
    setSearchValue("");
    setDateRange(undefined);
    setStatusFilter("all");
    setBucketFilter("all");
    setSortField("days_overdue");
    setSortDir("desc");
    setSearchParams({});
  };

  const getBucketBadgeColor = (bucket: string) => {
    switch (bucket) {
      case "Current": return "bg-green-500/10 text-green-700 border-green-500/20";
      case "1-30 Days": return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "31-60 Days": return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      case "61-90 Days": return "bg-red-500/10 text-red-700 border-red-500/20";
      case "90+ Days": return "bg-red-700/10 text-red-800 border-red-700/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    if (viewMode === "summary") {
      const sheet = workbook.addWorksheet("Aging Summary");
      const headers = ["Client Name", "Current", "1-30 Days", "31-60 Days", "61-90 Days", "90+ Days", "Total Outstanding", "Invoices"];
      sheet.addRow(headers);
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
      agingData.forEach(row => {
        sheet.addRow([row.client_name, row.current, row.days_1_30, row.days_31_60, row.days_61_90, row.days_90_plus, row.total, row.invoice_count]);
      });
      sheet.columns.forEach(c => { c.width = 18; });
    } else {
      const sheet = workbook.addWorksheet("Aging Details");
      const cols = DETAIL_COLUMNS.filter(c => visibleCols.includes(c.key));
      sheet.addRow(cols.map(c => c.label));
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
      filteredDetailed.forEach(inv => {
        const row: any[] = [];
        cols.forEach(col => {
          switch (col.key) {
            case "invoice_id": row.push(inv.invoice_id); break;
            case "client_name": row.push(inv.client_name); break;
            case "invoice_date": row.push(formatDate(inv.invoice_date)); break;
            case "due_date": row.push(formatDate(inv.due_date)); break;
            case "days_overdue": row.push(inv.days_overdue); break;
            case "total_amount": row.push(inv.total_amount); break;
            case "paid_amount": row.push(inv.paid_amount); break;
            case "balance_due": row.push(inv.balance_due); break;
            case "aging_bucket": row.push(inv.aging_bucket); break;
            case "status": row.push(inv.status); break;
          }
        });
        sheet.addRow(row);
      });
      sheet.columns.forEach(c => { c.width = 18; });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aging-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="p-6 space-y-6">
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
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">Current</p>
            <p className="text-lg font-bold">{formatINR(totals.current)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">1-30 Days</p>
            <p className="text-lg font-bold text-yellow-600">{formatINR(totals.days_1_30)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">31-60 Days</p>
            <p className="text-lg font-bold text-orange-600">{formatINR(totals.days_31_60)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">61-90 Days</p>
            <p className="text-lg font-bold text-red-600">{formatINR(totals.days_61_90)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-700">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">90+ Days</p>
            <p className="text-lg font-bold text-red-700">{formatINR(totals.days_90_plus)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold">{formatINR(totals.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 p-3 bg-card border rounded-lg">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder="Search invoice ID, client..."
            className="pl-9 h-9"
          />
        </div>

        <DateRangeFilter
          label="Invoice Date"
          value={dateRange}
          onChange={setDateRange}
          placeholder="Filter by date"
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Unpaid">Unpaid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Aging Bucket</label>
          <Select value={bucketFilter} onValueChange={setBucketFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
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
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">View</label>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary by Client</SelectItem>
              <SelectItem value="detailed">Detailed by Invoice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode === "detailed" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9 mt-auto">
                <Columns className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {DETAIL_COLUMNS.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleCols.includes(col.key)}
                  onCheckedChange={(checked) => {
                    setVisibleCols(prev =>
                      checked ? [...prev, col.key] : prev.filter(k => k !== col.key)
                    );
                  }}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2 h-9 mt-auto">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {viewMode === "summary" ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="cursor-pointer" onClick={() => handleSort("client_name")}>
                    <div className="flex items-center">Client <SortIcon field="client_name" /></div>
                  </TableHead>
                  <TableHead className="text-right text-green-700">Current</TableHead>
                  <TableHead className="text-right text-yellow-700">1-30 Days</TableHead>
                  <TableHead className="text-right text-orange-700">31-60 Days</TableHead>
                  <TableHead className="text-right text-red-700">61-90 Days</TableHead>
                  <TableHead className="text-right text-red-800">90+ Days</TableHead>
                  <TableHead className="text-right font-bold cursor-pointer" onClick={() => handleSort("balance_due")}>
                    <div className="flex items-center justify-end">Total <SortIcon field="balance_due" /></div>
                  </TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No aging data found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
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
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/clients/${row.client_id}`)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted font-bold">
                      <TableCell>TOTAL ({agingData.length} clients)</TableCell>
                      <TableCell className="text-right">{formatINR(totals.current)}</TableCell>
                      <TableCell className="text-right text-yellow-600">{formatINR(totals.days_1_30)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatINR(totals.days_31_60)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatINR(totals.days_61_90)}</TableCell>
                      <TableCell className="text-right text-red-700">{formatINR(totals.days_90_plus)}</TableCell>
                      <TableCell className="text-right">{formatINR(totals.total)}</TableCell>
                      <TableCell className="text-right">{agingData.reduce((s, r) => s + r.invoice_count, 0)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {visibleCols.includes("invoice_id") && <TableHead>Invoice</TableHead>}
                  {visibleCols.includes("client_name") && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort("client_name")}>
                      <div className="flex items-center">Client <SortIcon field="client_name" /></div>
                    </TableHead>
                  )}
                  {visibleCols.includes("invoice_date") && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort("invoice_date")}>
                      <div className="flex items-center">Invoice Date <SortIcon field="invoice_date" /></div>
                    </TableHead>
                  )}
                  {visibleCols.includes("due_date") && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort("due_date")}>
                      <div className="flex items-center">Due Date <SortIcon field="due_date" /></div>
                    </TableHead>
                  )}
                  {visibleCols.includes("days_overdue") && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort("days_overdue")}>
                      <div className="flex items-center">Days Over <SortIcon field="days_overdue" /></div>
                    </TableHead>
                  )}
                  {visibleCols.includes("total_amount") && (
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_amount")}>
                      <div className="flex items-center justify-end">Total <SortIcon field="total_amount" /></div>
                    </TableHead>
                  )}
                  {visibleCols.includes("paid_amount") && <TableHead className="text-right">Paid</TableHead>}
                  {visibleCols.includes("balance_due") && (
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort("balance_due")}>
                      <div className="flex items-center justify-end">Outstanding <SortIcon field="balance_due" /></div>
                    </TableHead>
                  )}
                  {visibleCols.includes("aging_bucket") && <TableHead>Bucket</TableHead>}
                  {visibleCols.includes("status") && <TableHead>Status</TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDetailed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">
                      No invoices found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDetailed.map((inv) => (
                    <TableRow key={inv.invoice_id} className="hover:bg-muted/30">
                      {visibleCols.includes("invoice_id") && (
                        <TableCell>
                          <button
                            onClick={() => navigate(getInvoiceDetailPath(inv.invoice_id))}
                            className="font-medium text-primary hover:underline"
                          >
                            {inv.invoice_id}
                          </button>
                        </TableCell>
                      )}
                      {visibleCols.includes("client_name") && (
                        <TableCell>
                          <button
                            onClick={() => navigate(`/admin/clients/${inv.client_id}`)}
                            className="hover:underline text-primary"
                          >
                            {inv.client_name}
                          </button>
                        </TableCell>
                      )}
                      {visibleCols.includes("invoice_date") && <TableCell>{formatDate(inv.invoice_date)}</TableCell>}
                      {visibleCols.includes("due_date") && <TableCell>{formatDate(inv.due_date)}</TableCell>}
                      {visibleCols.includes("days_overdue") && (
                        <TableCell>
                          {inv.days_overdue > 0 ? (
                            <span className="text-red-600 font-medium">{inv.days_overdue}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {visibleCols.includes("total_amount") && (
                        <TableCell className="text-right">{formatINR(inv.total_amount)}</TableCell>
                      )}
                      {visibleCols.includes("paid_amount") && (
                        <TableCell className="text-right text-green-600">{formatINR(inv.paid_amount)}</TableCell>
                      )}
                      {visibleCols.includes("balance_due") && (
                        <TableCell className="text-right font-medium text-orange-600">{formatINR(inv.balance_due)}</TableCell>
                      )}
                      {visibleCols.includes("aging_bucket") && (
                        <TableCell>
                          <Badge className={getBucketBadgeColor(inv.aging_bucket)}>{inv.aging_bucket}</Badge>
                        </TableCell>
                      )}
                      {visibleCols.includes("status") && (
                        <TableCell>
                          <Badge variant="outline">{inv.status}</Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => navigate(getInvoiceDetailPath(inv.invoice_id))}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Showing {viewMode === "summary" ? agingData.length + " clients" : filteredDetailed.length + " invoices"}
      </p>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/navigation/PageHeader";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { ROUTES } from "@/lib/routes";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";
import {
  Download, Search, RotateCcw, RefreshCw, ExternalLink,
  ArrowUpDown, ChevronUp, ChevronDown, Columns,
  Users, FileText, AlertTriangle, DollarSign, Clock,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Raw invoice from the view
interface AgingInvoice {
  invoice_id: string;
  client_id: string;
  client_name: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  days_overdue: number;
  aging_bucket: string;
}

// Grouped row
interface ClientAgingRow {
  client_id: string;
  client_name: string;
  not_due: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  total_outstanding: number;
  unpaid_count: number;
  oldest_due_date: string | null;
  avg_days_overdue: number;
}

const COLUMNS = [
  { key: "client_name", label: "Client Name", default: true },
  { key: "total_outstanding", label: "Total Outstanding", default: true },
  { key: "not_due", label: "Not Due", default: false },
  { key: "bucket_0_30", label: "0-30 Days", default: true },
  { key: "bucket_31_60", label: "31-60 Days", default: true },
  { key: "bucket_61_90", label: "61-90 Days", default: true },
  { key: "bucket_90_plus", label: "90+ Days", default: true },
  { key: "unpaid_count", label: "Unpaid Invoices", default: true },
  { key: "oldest_due_date", label: "Oldest Due Date", default: true },
  { key: "avg_days_overdue", label: "Avg Days Overdue", default: false },
];

type SortField = "client_name" | "total_outstanding" | "bucket_0_30" | "bucket_31_60" | "bucket_61_90" | "bucket_90_plus" | "unpaid_count" | "oldest_due_date" | "avg_days_overdue";

export default function ReportAgingByClient() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rawData, setRawData] = useState<AgingInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [basis, setBasis] = useState<"due" | "invoice">((searchParams.get("basis") as any) || "due");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "unpaid");

  // Sort
  const [sortField, setSortField] = useState<SortField>("total_outstanding");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Columns
  const [visibleCols, setVisibleCols] = useState<string[]>(
    COLUMNS.filter(c => c.default).map(c => c.key)
  );

  useEffect(() => { fetchData(); }, [company?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_aging_report" as any)
        .select("*")
        .order("days_overdue", { ascending: false }) as any;
      if (error) throw error;
      setRawData((data || []) as unknown as AgingInvoice[]);
    } catch (err: any) {
      console.error("Error loading aging data:", err);
      toast({ title: "Error", description: "Failed to load aging data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter raw invoices
  const filteredInvoices = useMemo(() => {
    let result = rawData.filter(d => {
      if (statusFilter === "unpaid") return d.status !== "Paid" && Number(d.balance_due) > 0;
      if (statusFilter === "partial") return d.status === "Partial";
      return Number(d.balance_due) > 0;
    });

    if (searchValue) {
      const q = searchValue.toLowerCase();
      result = result.filter(d => d.client_name?.toLowerCase().includes(q));
    }

    return result;
  }, [rawData, searchValue, statusFilter]);

  // Group by client
  const clientRows = useMemo(() => {
    const map = new Map<string, ClientAgingRow>();

    filteredInvoices.forEach(inv => {
      const cid = inv.client_id || "unknown";
      if (!map.has(cid)) {
        map.set(cid, {
          client_id: cid,
          client_name: inv.client_name || "Unknown",
          not_due: 0,
          bucket_0_30: 0,
          bucket_31_60: 0,
          bucket_61_90: 0,
          bucket_90_plus: 0,
          total_outstanding: 0,
          unpaid_count: 0,
          oldest_due_date: null,
          avg_days_overdue: 0,
        });
      }
      const row = map.get(cid)!;
      const bal = Number(inv.balance_due || 0);
      const overdue = Number(inv.days_overdue || 0);

      row.total_outstanding += bal;
      row.unpaid_count += 1;

      // Bucket
      if (overdue <= 0) row.not_due += bal;
      else if (overdue <= 30) row.bucket_0_30 += bal;
      else if (overdue <= 60) row.bucket_31_60 += bal;
      else if (overdue <= 90) row.bucket_61_90 += bal;
      else row.bucket_90_plus += bal;

      // Oldest due date
      if (inv.due_date) {
        if (!row.oldest_due_date || inv.due_date < row.oldest_due_date) {
          row.oldest_due_date = inv.due_date;
        }
      }

      // Accumulate for average
      row.avg_days_overdue += Math.max(0, overdue);
    });

    // Finalize averages
    const rows = Array.from(map.values()).filter(r => r.total_outstanding > 0);
    rows.forEach(r => {
      r.avg_days_overdue = r.unpaid_count > 0 ? Math.round(r.avg_days_overdue / r.unpaid_count) : 0;
    });

    // Sort
    rows.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case "client_name": aVal = a.client_name; bVal = b.client_name; break;
        case "oldest_due_date": aVal = a.oldest_due_date || ""; bVal = b.oldest_due_date || ""; break;
        default: aVal = (a as any)[sortField]; bVal = (b as any)[sortField]; break;
      }
      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal);
        return sortDir === "asc" ? cmp : -cmp;
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return rows;
  }, [filteredInvoices, sortField, sortDir]);

  // Summary totals
  const totals = useMemo(() => {
    return clientRows.reduce((acc, r) => ({
      total: acc.total + r.total_outstanding,
      not_due: acc.not_due + r.not_due,
      b0_30: acc.b0_30 + r.bucket_0_30,
      b31_60: acc.b31_60 + r.bucket_31_60,
      b61_90: acc.b61_90 + r.bucket_61_90,
      b90_plus: acc.b90_plus + r.bucket_90_plus,
      invoices: acc.invoices + r.unpaid_count,
      clients90Plus: acc.clients90Plus + (r.bucket_90_plus > 0 ? 1 : 0),
    }), { total: 0, not_due: 0, b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0, invoices: 0, clients90Plus: 0 });
  }, [clientRows]);

  // Largest bucket
  const topBucket = useMemo(() => {
    const buckets = [
      { label: "0-30 Days", val: totals.b0_30 },
      { label: "31-60 Days", val: totals.b31_60 },
      { label: "61-90 Days", val: totals.b61_90 },
      { label: "90+ Days", val: totals.b90_plus },
    ];
    return buckets.sort((a, b) => b.val - a.val)[0];
  }, [totals]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(p => p === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const resetFilters = () => {
    setSearchValue("");
    setBasis("due");
    setStatusFilter("unpaid");
    setSortField("total_outstanding");
    setSortDir("desc");
    setSearchParams({});
  };

  const exportToExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Aging by Client");
    const cols = COLUMNS.filter(c => visibleCols.includes(c.key));
    ws.addRow(cols.map(c => c.label));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    clientRows.forEach(r => {
      const row: any[] = [];
      cols.forEach(c => {
        switch (c.key) {
          case "client_name": row.push(r.client_name); break;
          case "total_outstanding": row.push(r.total_outstanding); break;
          case "not_due": row.push(r.not_due); break;
          case "bucket_0_30": row.push(r.bucket_0_30); break;
          case "bucket_31_60": row.push(r.bucket_31_60); break;
          case "bucket_61_90": row.push(r.bucket_61_90); break;
          case "bucket_90_plus": row.push(r.bucket_90_plus); break;
          case "unpaid_count": row.push(r.unpaid_count); break;
          case "oldest_due_date": row.push(r.oldest_due_date ? formatDate(r.oldest_due_date) : ""); break;
          case "avg_days_overdue": row.push(r.avg_days_overdue); break;
        }
      });
      ws.addRow(row);
    });

    // Totals row
    const totRow: any[] = [];
    cols.forEach(c => {
      switch (c.key) {
        case "client_name": totRow.push(`TOTAL (${clientRows.length} clients)`); break;
        case "total_outstanding": totRow.push(totals.total); break;
        case "not_due": totRow.push(totals.not_due); break;
        case "bucket_0_30": totRow.push(totals.b0_30); break;
        case "bucket_31_60": totRow.push(totals.b31_60); break;
        case "bucket_61_90": totRow.push(totals.b61_90); break;
        case "bucket_90_plus": totRow.push(totals.b90_plus); break;
        case "unpaid_count": totRow.push(totals.invoices); break;
        default: totRow.push(""); break;
      }
    });
    const lastRow = ws.addRow(totRow);
    lastRow.font = { bold: true };

    ws.columns.forEach(col => { col.width = 18; });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aging-by-client-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBucketColor = (val: number) => val > 0 ? "font-medium" : "text-muted-foreground";

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Aging by Client" description="Loading..." showBackButton />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Aging by Client — Receivables Summary"
        description="Outstanding receivables grouped by client and aging buckets"
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Reports", path: ROUTES.REPORTS },
          { label: "Aging by Client" },
        ]}
        showBackButton
        backPath={ROUTES.REPORTS}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" /> Export Excel
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Total Outstanding
            </div>
            <p className="text-xl font-bold">{formatINR(totals.total)}</p>
            <p className="text-xs text-muted-foreground">{clientRows.length} clients</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" /> Clients with 90+
            </div>
            <p className="text-xl font-bold text-red-600">{totals.clients90Plus}</p>
            <p className="text-xs text-muted-foreground">{formatINR(totals.b90_plus)} overdue</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> Top Overdue Bucket
            </div>
            <p className="text-xl font-bold text-orange-600">{topBucket.label}</p>
            <p className="text-xs text-muted-foreground">{formatINR(topBucket.val)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
              <FileText className="h-4 w-4" /> Unpaid Invoices
            </div>
            <p className="text-xl font-bold">{totals.invoices}</p>
            <p className="text-xs text-muted-foreground">across {clientRows.length} clients</p>
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
            placeholder="Search client name..."
            className="pl-9 h-9"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Age By</label>
          <Select value={basis} onValueChange={(v) => setBasis(v as any)}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="due">Due Date</SelectItem>
              <SelectItem value="invoice">Invoice Date</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unpaid">Unpaid + Partial</SelectItem>
              <SelectItem value="partial">Partial Only</SelectItem>
              <SelectItem value="all">All Outstanding</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9 mt-auto">
              <Columns className="h-4 w-4" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleCols.includes(col.key)}
                onCheckedChange={(checked) =>
                  setVisibleCols(prev => checked ? [...prev, col.key] : prev.filter(k => k !== col.key))
                }
              >
                {col.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2 h-9 mt-auto">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {visibleCols.includes("client_name") && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort("client_name")}>
                    <div className="flex items-center">Client <SortIcon field="client_name" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("total_outstanding") && (
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("total_outstanding")}>
                    <div className="flex items-center justify-end">Total Outstanding <SortIcon field="total_outstanding" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("not_due") && <TableHead className="text-right text-green-700">Not Due</TableHead>}
                {visibleCols.includes("bucket_0_30") && (
                  <TableHead className="text-right text-yellow-700 cursor-pointer" onClick={() => handleSort("bucket_0_30")}>
                    <div className="flex items-center justify-end">0-30 <SortIcon field="bucket_0_30" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("bucket_31_60") && (
                  <TableHead className="text-right text-orange-700 cursor-pointer" onClick={() => handleSort("bucket_31_60")}>
                    <div className="flex items-center justify-end">31-60 <SortIcon field="bucket_31_60" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("bucket_61_90") && (
                  <TableHead className="text-right text-red-600 cursor-pointer" onClick={() => handleSort("bucket_61_90")}>
                    <div className="flex items-center justify-end">61-90 <SortIcon field="bucket_61_90" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("bucket_90_plus") && (
                  <TableHead className="text-right text-red-800 cursor-pointer" onClick={() => handleSort("bucket_90_plus")}>
                    <div className="flex items-center justify-end">90+ <SortIcon field="bucket_90_plus" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("unpaid_count") && (
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("unpaid_count")}>
                    <div className="flex items-center justify-end">Invoices <SortIcon field="unpaid_count" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("oldest_due_date") && (
                  <TableHead className="cursor-pointer" onClick={() => handleSort("oldest_due_date")}>
                    <div className="flex items-center">Oldest Due <SortIcon field="oldest_due_date" /></div>
                  </TableHead>
                )}
                {visibleCols.includes("avg_days_overdue") && (
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("avg_days_overdue")}>
                    <div className="flex items-center justify-end">Avg Days <SortIcon field="avg_days_overdue" /></div>
                  </TableHead>
                )}
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleCols.length + 1} className="text-center py-8 text-muted-foreground">
                    No outstanding receivables found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {clientRows.map(r => (
                    <TableRow key={r.client_id} className="hover:bg-muted/30">
                      {visibleCols.includes("client_name") && (
                        <TableCell>
                          <button
                            onClick={() => navigate(`/admin/clients/${r.client_id}`)}
                            className="font-medium text-primary hover:underline"
                          >
                            {r.client_name}
                          </button>
                        </TableCell>
                      )}
                      {visibleCols.includes("total_outstanding") && (
                        <TableCell className="text-right font-bold">{formatINR(r.total_outstanding)}</TableCell>
                      )}
                      {visibleCols.includes("not_due") && (
                        <TableCell className={`text-right ${getBucketColor(r.not_due)}`}>
                          {r.not_due > 0 ? (
                            <button
                              onClick={() => navigate(`/admin/reports/aging?client=${r.client_id}&bucket=Current`)}
                              className="hover:underline text-green-600"
                            >
                              {formatINR(r.not_due)}
                            </button>
                          ) : "—"}
                        </TableCell>
                      )}
                      {visibleCols.includes("bucket_0_30") && (
                        <TableCell className={`text-right ${getBucketColor(r.bucket_0_30)}`}>
                          {r.bucket_0_30 > 0 ? (
                            <button
                              onClick={() => navigate(`/admin/reports/aging?client=${r.client_id}&bucket=1-30+Days`)}
                              className="hover:underline text-yellow-600"
                            >
                              {formatINR(r.bucket_0_30)}
                            </button>
                          ) : "—"}
                        </TableCell>
                      )}
                      {visibleCols.includes("bucket_31_60") && (
                        <TableCell className={`text-right ${getBucketColor(r.bucket_31_60)}`}>
                          {r.bucket_31_60 > 0 ? (
                            <button
                              onClick={() => navigate(`/admin/reports/aging?client=${r.client_id}&bucket=31-60+Days`)}
                              className="hover:underline text-orange-600"
                            >
                              {formatINR(r.bucket_31_60)}
                            </button>
                          ) : "—"}
                        </TableCell>
                      )}
                      {visibleCols.includes("bucket_61_90") && (
                        <TableCell className={`text-right ${getBucketColor(r.bucket_61_90)}`}>
                          {r.bucket_61_90 > 0 ? (
                            <button
                              onClick={() => navigate(`/admin/reports/aging?client=${r.client_id}&bucket=61-90+Days`)}
                              className="hover:underline text-red-600"
                            >
                              {formatINR(r.bucket_61_90)}
                            </button>
                          ) : "—"}
                        </TableCell>
                      )}
                      {visibleCols.includes("bucket_90_plus") && (
                        <TableCell className={`text-right ${getBucketColor(r.bucket_90_plus)}`}>
                          {r.bucket_90_plus > 0 ? (
                            <button
                              onClick={() => navigate(`/admin/reports/aging?client=${r.client_id}&bucket=90%2B+Days`)}
                              className="hover:underline text-red-700 font-medium"
                            >
                              {formatINR(r.bucket_90_plus)}
                            </button>
                          ) : "—"}
                        </TableCell>
                      )}
                      {visibleCols.includes("unpaid_count") && (
                        <TableCell className="text-right">
                          <button
                            onClick={() => navigate(`/admin/invoices?client=${r.client_id}&status=unpaid`)}
                            className="text-primary hover:underline"
                          >
                            {r.unpaid_count}
                          </button>
                        </TableCell>
                      )}
                      {visibleCols.includes("oldest_due_date") && (
                        <TableCell className="text-sm">
                          {r.oldest_due_date ? formatDate(r.oldest_due_date) : "—"}
                        </TableCell>
                      )}
                      {visibleCols.includes("avg_days_overdue") && (
                        <TableCell className="text-right">
                          {r.avg_days_overdue > 0 ? (
                            <Badge variant={r.avg_days_overdue > 90 ? "destructive" : r.avg_days_overdue > 30 ? "secondary" : "outline"}>
                              {r.avg_days_overdue}d
                            </Badge>
                          ) : "—"}
                        </TableCell>
                      )}
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/clients/${r.client_id}`)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted font-bold border-t-2">
                    {visibleCols.includes("client_name") && <TableCell>TOTAL ({clientRows.length} clients)</TableCell>}
                    {visibleCols.includes("total_outstanding") && <TableCell className="text-right">{formatINR(totals.total)}</TableCell>}
                    {visibleCols.includes("not_due") && <TableCell className="text-right text-green-600">{formatINR(totals.not_due)}</TableCell>}
                    {visibleCols.includes("bucket_0_30") && <TableCell className="text-right text-yellow-600">{formatINR(totals.b0_30)}</TableCell>}
                    {visibleCols.includes("bucket_31_60") && <TableCell className="text-right text-orange-600">{formatINR(totals.b31_60)}</TableCell>}
                    {visibleCols.includes("bucket_61_90") && <TableCell className="text-right text-red-600">{formatINR(totals.b61_90)}</TableCell>}
                    {visibleCols.includes("bucket_90_plus") && <TableCell className="text-right text-red-700">{formatINR(totals.b90_plus)}</TableCell>}
                    {visibleCols.includes("unpaid_count") && <TableCell className="text-right">{totals.invoices}</TableCell>}
                    {visibleCols.includes("oldest_due_date") && <TableCell></TableCell>}
                    {visibleCols.includes("avg_days_overdue") && <TableCell></TableCell>}
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Showing {clientRows.length} clients • {totals.invoices} unpaid invoices • Aging by {basis === "due" ? "Due Date" : "Invoice Date"}
      </p>
    </div>
  );
}

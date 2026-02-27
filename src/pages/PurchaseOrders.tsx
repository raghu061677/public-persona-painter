import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Download, RotateCcw, ShoppingCart, IndianRupee, Clock, CheckCircle2, Calendar, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

const PO_STATUSES = ["Paid", "Pending", "Overdue"];
const PAGE_SIZES = [10, 20, 50, 100];
type SortField = "id" | "vendor_name" | "category" | "created_at" | "total_amount" | "payment_status";
type SortDir = "asc" | "desc";

export default function PurchaseOrders() {
  const { company } = useCompany();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (company?.id) loadExpenses();
  }, [company]);

  const loadExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("company_id", company!.id)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Error", description: "Failed to load purchase orders", variant: "destructive" });
    else setExpenses(data || []);
    setLoading(false);
  };

  const uniqueVendors = useMemo(() => [...new Set(expenses.map(e => e.vendor_name).filter(Boolean))].sort(), [expenses]);

  const filtered = useMemo(() => {
    let result = [...expenses];
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(e => e.id?.toLowerCase().includes(t) || e.expense_no?.toLowerCase().includes(t) || e.vendor_name?.toLowerCase().includes(t) || e.category?.toLowerCase().includes(t));
    }
    if (statusFilter !== "all") result = result.filter(e => e.payment_status?.toLowerCase() === statusFilter.toLowerCase());
    if (vendorFilter !== "all") result = result.filter(e => e.vendor_name === vendorFilter);
    result.sort((a, b) => {
      let aV: any, bV: any;
      if (sortField === "created_at") { aV = new Date(a[sortField] || 0).getTime(); bV = new Date(b[sortField] || 0).getTime(); }
      else if (sortField === "total_amount") { aV = a[sortField] || 0; bV = b[sortField] || 0; }
      else { aV = (a[sortField] || "").toString().toLowerCase(); bV = (b[sortField] || "").toString().toLowerCase(); }
      return sortDir === "asc" ? (aV < bV ? -1 : 1) : (aV > bV ? -1 : 1);
    });
    return result;
  }, [expenses, searchTerm, statusFilter, vendorFilter, sortField, sortDir]);

  const kpis = useMemo(() => ({
    total: filtered.length,
    totalValue: filtered.reduce((s, e) => s + (e.total_amount || 0), 0),
    pending: filtered.filter(e => e.payment_status?.toLowerCase() === "pending").length,
    paid: filtered.filter(e => e.payment_status?.toLowerCase() === "paid").length,
  }), [filtered]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [searchTerm, statusFilter, vendorFilter]);

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("asc"); }
  };
  const sortIcon = (f: SortField) => sortField !== f ? <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" /> : sortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "paid") return <Badge variant="default">Paid</Badge>;
    if (s === "overdue") return <Badge variant="destructive">Overdue</Badge>;
    return <Badge variant="secondary">{status || "Pending"}</Badge>;
  };

  const getDisplayId = (e: any) => e.expense_no || `PO-${new Date(e.created_at).getFullYear()}-${e.id.slice(0, 6).toUpperCase()}`;

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Purchase Orders");
    ws.columns = [
      { header: "PO ID", key: "display_id", width: 20 },
      { header: "Vendor", key: "vendor_name", width: 25 },
      { header: "Category", key: "category", width: 18 },
      { header: "Date", key: "created_at", width: 14 },
      { header: "Amount (₹)", key: "amount", width: 14 },
      { header: "GST (₹)", key: "gst_amount", width: 14 },
      { header: "Total (₹)", key: "total_amount", width: 16 },
      { header: "Status", key: "payment_status", width: 12 },
    ];
    ws.getRow(1).font = { bold: true };
    filtered.forEach(e => ws.addRow({ ...e, display_id: getDisplayId(e), created_at: new Date(e.created_at).toLocaleDateString("en-IN") }));
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Purchase_Orders.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => { setSearchTerm(""); setStatusFilter("all"); setVendorFilter("all"); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingCart className="h-6 w-6" /> Purchase Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Track vendor orders and expenses</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ShoppingCart className="h-3.5 w-3.5" /> Total POs</div>
          <p className="text-2xl font-bold">{kpis.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Total Value</div>
          <p className="text-2xl font-bold">{fmt(kpis.totalValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-3.5 w-3.5" /> Pending</div>
          <p className="text-2xl font-bold text-amber-600">{kpis.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="h-3.5 w-3.5" /> Paid</div>
          <p className="text-2xl font-bold text-primary">{kpis.paid}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ID, vendor, category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {uniqueVendors.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PO_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40">
                <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("id")}>PO ID {sortIcon("id")}</Button></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("vendor_name")}>Vendor {sortIcon("vendor_name")}</Button></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("category")}>Category {sortIcon("category")}</Button></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("created_at")}>Date {sortIcon("created_at")}</Button></TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right"><Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("total_amount")}>Total {sortIcon("total_amount")}</Button></TableHead>
                <TableHead><Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => handleSort("payment_status")}>Status {sortIcon("payment_status")}</Button></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12"><div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded mx-auto w-3/4" />)}</div></TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium">No purchase orders found</p>
                    <p className="text-sm text-muted-foreground mt-1">{searchTerm || statusFilter !== "all" || vendorFilter !== "all" ? "Try adjusting your filters" : "Vendor orders will appear here once expenses are recorded"}</p>
                  </TableCell>
                </TableRow>
              ) : paginated.map(e => (
                <TableRow key={e.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{getDisplayId(e)}</TableCell>
                  <TableCell>{e.vendor_name}</TableCell>
                  <TableCell><Badge variant="outline">{e.category}</Badge></TableCell>
                  <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.amount)}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(e.gst_amount)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(e.total_amount)}</TableCell>
                  <TableCell>{getStatusBadge(e.payment_status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span>
              <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm px-2">{page} / {totalPages || 1}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Search, Download, RotateCcw, ShoppingBag, IndianRupee, Clock, CheckCircle2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatINR } from "@/utils/finance";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

const STATUSES = ["Draft", "Sent", "Approved", "Rejected"];
const PAGE_SIZES = [10, 20, 50, 100];

export default function SalesOrders() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    if (company?.id) loadOrders();
  }, [company]);

  const loadOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("estimations")
      .select("*")
      .eq("company_id", company!.id)
      .order("estimation_date", { ascending: false });
    if (error) toast({ title: "Error", description: "Failed to load sales orders", variant: "destructive" });
    else setOrders(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = orders;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(e => e.id?.toLowerCase().includes(t) || e.client_name?.toLowerCase().includes(t));
    }
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    return result;
  }, [orders, searchTerm, statusFilter]);

  const kpis = useMemo(() => ({
    total: filtered.length,
    totalValue: filtered.reduce((s, e) => s + (e.total_amount || 0), 0),
    pending: filtered.filter(e => e.status === "Draft" || e.status === "Sent").length,
    approved: filtered.filter(e => e.status === "Approved").length,
  }), [filtered]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { Draft: "secondary", Sent: "outline", Approved: "default", Rejected: "destructive" };
    return <Badge variant={(map[status] || "outline") as any}>{status}</Badge>;
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Sales Orders");
    ws.columns = [
      { header: "Order ID", key: "id", width: 22 },
      { header: "Client", key: "client_name", width: 28 },
      { header: "Date", key: "estimation_date", width: 14 },
      { header: "Status", key: "status", width: 14 },
      { header: "Subtotal (₹)", key: "sub_total", width: 16 },
      { header: "GST (₹)", key: "gst_amount", width: 14 },
      { header: "Total (₹)", key: "total_amount", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    filtered.forEach(e => ws.addRow(e));
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Sales_Orders.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShoppingBag className="h-6 w-6" /> Sales Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Approved estimations tracked as sales orders</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ShoppingBag className="h-3.5 w-3.5" /> Total Orders</div>
          <p className="text-2xl font-bold">{kpis.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Order Value</div>
          <p className="text-2xl font-bold">{formatINR(kpis.totalValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="h-3.5 w-3.5" /> Pending</div>
          <p className="text-2xl font-bold text-amber-600">{kpis.pending}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</div>
          <p className="text-2xl font-bold text-primary">{kpis.approved}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search ID, client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40">
                <TableHead className="font-medium">Order ID</TableHead>
                <TableHead className="font-medium">Client</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="text-right font-medium">Subtotal</TableHead>
                <TableHead className="text-right font-medium">GST</TableHead>
                <TableHead className="text-right font-medium">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12"><div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded mx-auto w-3/4" />)}</div></TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium">No sales orders found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Sales orders appear once estimations are approved"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : paginated.map(est => (
                <TableRow key={est.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/finance/estimations/${est.id}`)}>
                  <TableCell className="font-mono text-sm font-medium">{est.id}</TableCell>
                  <TableCell>{est.client_name}</TableCell>
                  <TableCell>{new Date(est.estimation_date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{getStatusBadge(est.status)}</TableCell>
                  <TableCell className="text-right font-mono">{formatINR(est.sub_total)}</TableCell>
                  <TableCell className="text-right font-mono">{formatINR(est.gst_amount)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatINR(est.total_amount)}</TableCell>
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

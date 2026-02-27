import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Download, RotateCcw, FileText, IndianRupee, Clock, CheckCircle2, Plus, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast as toastFn } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

const STATUSES = ["draft", "sent", "accepted", "expired", "converted"];
const PAGE_SIZES = [10, 20, 50, 100];

const ProformasList = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { fetchProformas(); }, []);

  const fetchProformas = async () => {
    try {
      const { data, error } = await supabase
        .from('proforma_invoices' as any)
        .select('id, proforma_number, proforma_date, client_name, plan_name, grand_total, status')
        .order('proforma_date', { ascending: false });
      if (error) throw error;
      setProformas((data || []) as any[]);
    } catch (error) {
      console.error('Error fetching proformas:', error);
      toastFn({ variant: "destructive", title: "Error", description: "Failed to load proforma invoices." });
    } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let result = proformas;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(p => p.proforma_number?.toLowerCase().includes(t) || p.client_name?.toLowerCase().includes(t));
    }
    if (statusFilter !== "all") result = result.filter(p => p.status === statusFilter);
    return result;
  }, [proformas, searchTerm, statusFilter]);

  const kpis = useMemo(() => ({
    total: filtered.length,
    totalValue: filtered.reduce((s, p) => s + (p.grand_total || 0), 0),
    pending: filtered.filter(p => p.status === "draft" || p.status === "sent").length,
    converted: filtered.filter(p => p.status === "accepted" || p.status === "converted").length,
  }), [filtered]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [searchTerm, statusFilter]);

  const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

  const getStatusBadge = (status: string) => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary", sent: "outline", accepted: "default", expired: "destructive", converted: "default"
    };
    return <Badge variant={map[status] || "secondary"}>{status?.toUpperCase()}</Badge>;
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Proforma Invoices");
    ws.columns = [
      { header: "Proforma No", key: "proforma_number", width: 22 },
      { header: "Client", key: "client_name", width: 28 },
      { header: "Plan", key: "plan_name", width: 22 },
      { header: "Date", key: "proforma_date", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Amount (₹)", key: "grand_total", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    filtered.forEach(p => ws.addRow({ ...p, proforma_date: new Date(p.proforma_date).toLocaleDateString("en-IN") }));
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Proforma_Invoices.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Proforma Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage proforma invoices and convert to tax invoices</p>
        </div>
        <Button onClick={() => navigate('/admin/proformas/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Proforma
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileText className="h-3.5 w-3.5" /> Total</div>
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
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="h-3.5 w-3.5" /> Converted</div>
          <p className="text-2xl font-bold text-primary">{kpis.converted}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search number, client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
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
                <TableHead className="font-medium">Proforma No</TableHead>
                <TableHead className="font-medium">Client</TableHead>
                <TableHead className="font-medium">Plan</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="text-right font-medium">Amount</TableHead>
                <TableHead className="text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12"><div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded mx-auto w-3/4" />)}</div></TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium">No proforma invoices found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first proforma invoice to get started"}
                    </p>
                    {!searchTerm && statusFilter === "all" && (
                      <Button className="mt-4" onClick={() => navigate('/admin/proformas/new')}><Plus className="mr-2 h-4 w-4" /> New Proforma</Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : paginated.map(p => (
                <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/admin/proformas/${p.id}`)}>
                  <TableCell className="font-mono text-sm font-medium">{p.proforma_number}</TableCell>
                  <TableCell>{p.client_name}</TableCell>
                  <TableCell className="max-w-[160px] truncate">{p.plan_name || "—"}</TableCell>
                  <TableCell>{new Date(p.proforma_date).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{fmt(p.grand_total)}</TableCell>
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/proformas/${p.id}`)}><Eye className="h-4 w-4" /></Button>
                  </TableCell>
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
};

export default ProformasList;

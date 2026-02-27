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
import { Plus, Search, Eye, Trash2, Download, RotateCcw, FileText, IndianRupee, Clock, CheckCircle2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { getEstimationStatusColor, formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { toast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

const STATUSES = ["Draft", "Sent", "Approved", "Rejected", "Converted", "Cancelled"];
const PAGE_SIZES = [10, 20, 50, 100];

export default function EstimationsList() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [estimations, setEstimations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    checkAdminStatus();
    if (company?.id) fetchEstimations();
  }, [company]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchEstimations = async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('estimations')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to fetch estimations", variant: "destructive" });
    } else {
      setEstimations(data || []);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = estimations;
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      result = result.filter(e => e.id?.toLowerCase().includes(t) || e.client_name?.toLowerCase().includes(t));
    }
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    return result;
  }, [estimations, searchTerm, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const totalValue = filtered.reduce((s, e) => s + (e.total_amount || 0), 0);
    const pending = filtered.filter(e => e.status === "Draft" || e.status === "Sent").length;
    const converted = filtered.filter(e => e.status === "Approved" || e.status === "Converted").length;
    return { total, totalValue, pending, converted };
  }, [filtered]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);
  useEffect(() => setPage(1), [searchTerm, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this estimation?")) return;
    const { error } = await supabase.from('estimations').delete().eq('id', id);
    if (error) toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Deleted" }); fetchEstimations(); }
  };

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Estimations");
    ws.columns = [
      { header: "ID", key: "id", width: 22 },
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
    const a = document.createElement("a"); a.href = url; a.download = "Estimations.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => { setSearchTerm(""); setStatusFilter("all"); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Estimations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage quotations and estimates</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/finance/estimations/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Estimation
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileText className="h-3.5 w-3.5" /> Total</div>
          <p className="text-2xl font-bold">{kpis.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><IndianRupee className="h-3.5 w-3.5" /> Total Value</div>
          <p className="text-2xl font-bold">{formatINR(kpis.totalValue)}</p>
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

      {/* Filters */}
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
        <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset</Button>
        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40">
                <TableHead className="font-medium">Estimation ID</TableHead>
                <TableHead className="font-medium">Client</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="text-right font-medium">Amount</TableHead>
                <TableHead className="text-right font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12"><div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded mx-auto w-3/4" />)}</div></TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium">No estimations found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first estimation to get started"}
                    </p>
                    {isAdmin && !searchTerm && statusFilter === "all" && (
                      <Button className="mt-4" onClick={() => navigate('/finance/estimations/new')}><Plus className="mr-2 h-4 w-4" /> New Estimation</Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : paginated.map(est => (
                <TableRow key={est.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/finance/estimations/${est.id}`)}>
                  <TableCell className="font-mono text-sm font-medium">{est.id}</TableCell>
                  <TableCell>{est.client_name}</TableCell>
                  <TableCell>{formatDate(est.estimation_date)}</TableCell>
                  <TableCell><Badge className={getEstimationStatusColor(est.status)}>{est.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatINR(est.total_amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/finance/estimations/${est.id}`)}><Eye className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(est.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Pagination */}
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

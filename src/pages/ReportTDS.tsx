import { useState, useEffect, useMemo, useCallback } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatINR } from "@/utils/finance";
import {
  FileText, Search, Download, CheckCircle2, Clock, AlertTriangle,
  IndianRupee, Loader2, Pencil, FileSpreadsheet, Users, TrendingUp,
  ShieldCheck, BarChart3, Bell, Eye,
} from "lucide-react";
import { exportTDSReconciliation, type TDSExportEntry } from "@/utils/exports/excel/exportTDSReconciliation";

// ─── Types ─────────────────────────────────────────
interface TDSEntry {
  id: string;
  client_id: string;
  invoice_id: string;
  payment_record_id: string | null;
  financial_year: string;
  quarter: string;
  tds_section: string | null;
  tds_amount: number;
  invoice_amount: number;
  amount_received: number;
  tds_certificate_no: string | null;
  form16a_received: boolean;
  reflected_in_26as: boolean;
  verified: boolean;
  status: string;
  followup_notes: string | null;
  followup_date: string | null;
  created_at: string;
  client_name?: string;
  finance_contact?: string;
  invoice_date?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  "Not Applicable": { label: "Not Applicable", variant: "bg-muted text-muted-foreground" },
  Deducted: { label: "Deducted", variant: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  "Pending Verification": { label: "Pending Verification", variant: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
  Filed: { label: "Filed", variant: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  Reflected: { label: "Reflected in 26AS", variant: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  "Form 16A Received": { label: "Form 16A Received", variant: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20" },
  Verified: { label: "Verified", variant: "bg-green-500/10 text-green-700 border-green-500/20" },
  "Follow-up Required": { label: "Follow-up Required", variant: "bg-red-500/10 text-red-700 border-red-500/20" },
};

function deriveTDSStatus(e: TDSEntry): string {
  if (e.tds_amount === 0) return "Not Applicable";
  if (e.verified) return "Verified";
  if (e.form16a_received && e.reflected_in_26as) return "Form 16A Received";
  if (e.reflected_in_26as) return "Reflected";
  if (e.form16a_received) return "Filed";
  if (e.followup_date && !e.verified) return "Follow-up Required";
  return "Deducted";
}

const FY_OPTIONS = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 5 }, (_, i) => {
    const y = year - i;
    return `FY${y}-${String(y + 1).slice(-2)}`;
  });
};

// ─── Component ─────────────────────────────────────
export default function ReportTDS() {
  const { company } = useCompany();
  const [entries, setEntries] = useState<TDSEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fyFilter, setFyFilter] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [editEntry, setEditEntry] = useState<TDSEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (company) fetchEntries();
  }, [company]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tds_ledger" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const clientIds = [...new Set((data || []).map((d: any) => d.client_id))];
      let clientMap: Record<string, { name: string; finance_contact?: string }> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name, finance_contact")
          .in("id", clientIds);
        clientMap = Object.fromEntries(
          (clients || []).map((c: any) => [c.id, { name: c.name, finance_contact: c.finance_contact }])
        );
      }

      // Fetch invoice dates
      const invoiceIds = [...new Set((data || []).map((d: any) => d.invoice_id))];
      let invoiceDateMap: Record<string, string> = {};
      if (invoiceIds.length > 0) {
        const { data: invoices } = await supabase
          .from("invoices")
          .select("id, invoice_date")
          .in("id", invoiceIds);
        invoiceDateMap = Object.fromEntries(
          (invoices || []).map((inv: any) => [inv.id, inv.invoice_date])
        );
      }

      setEntries(
        (data || []).map((d: any) => ({
          ...d,
          client_name: clientMap[d.client_id]?.name || d.client_id,
          finance_contact: clientMap[d.client_id]?.finance_contact || "-",
          invoice_date: invoiceDateMap[d.invoice_id] || null,
        }))
      );
    } catch (error) {
      console.error("Error fetching TDS entries:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Filtering ─────────────────────────────────────
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (fyFilter !== "all" && e.financial_year !== fyFilter) return false;
      if (quarterFilter !== "all" && e.quarter !== quarterFilter) return false;
      if (statusFilter !== "all") {
        const derived = deriveTDSStatus(e);
        if (derived !== statusFilter) return false;
      }
      if (clientFilter !== "all" && e.client_id !== clientFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.client_name?.toLowerCase().includes(q) && !e.invoice_id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, fyFilter, quarterFilter, statusFilter, clientFilter, searchQuery]);

  const uniqueClients = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach((e) => map.set(e.client_id, e.client_name || e.client_id));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  // ─── Metrics ───────────────────────────────────────
  const metrics = useMemo(() => {
    const totalInvoiced = filtered.reduce((s, e) => s + e.invoice_amount, 0);
    const totalReceived = filtered.reduce((s, e) => s + e.amount_received, 0);
    const totalTDS = filtered.reduce((s, e) => s + e.tds_amount, 0);
    const totalVerified = filtered.filter((e) => e.verified).reduce((s, e) => s + e.tds_amount, 0);
    const totalPending = totalTDS - totalVerified;
    const pendingFollowups = filtered.filter(
      (e) => e.tds_amount > 0 && (!e.reflected_in_26as || !e.verified || !e.form16a_received)
    ).length;
    return { totalInvoiced, totalReceived, totalTDS, totalVerified, totalPending, pendingFollowups };
  }, [filtered]);

  // ─── Quarter Summary ──────────────────────────────
  const quarterSummary = useMemo(() => {
    const map = new Map<string, { fy: string; qtr: string; count: number; invoiced: number; tds: number; verified: number; pending: number }>();
    filtered.forEach((e) => {
      const key = `${e.financial_year}|${e.quarter}`;
      const ex = map.get(key) || { fy: e.financial_year, qtr: e.quarter, count: 0, invoiced: 0, tds: 0, verified: 0, pending: 0 };
      ex.count++;
      ex.invoiced += e.invoice_amount;
      ex.tds += e.tds_amount;
      if (e.verified) ex.verified += e.tds_amount;
      else ex.pending += e.tds_amount;
      map.set(key, ex);
    });
    return [...map.values()].sort((a, b) => `${a.fy}${a.qtr}`.localeCompare(`${b.fy}${b.qtr}`));
  }, [filtered]);

  // ─── Client Summary ───────────────────────────────
  const clientSummary = useMemo(() => {
    const map = new Map<string, { name: string; invoices: number; invoiced: number; tds: number; verified: number; pending: number; lastFollowup: string | null }>();
    filtered.forEach((e) => {
      const ex = map.get(e.client_id) || { name: e.client_name || "", invoices: 0, invoiced: 0, tds: 0, verified: 0, pending: 0, lastFollowup: null };
      ex.invoices++;
      ex.invoiced += e.invoice_amount;
      ex.tds += e.tds_amount;
      if (e.verified) ex.verified += e.tds_amount;
      else ex.pending += e.tds_amount;
      if (e.followup_date && (!ex.lastFollowup || e.followup_date > ex.lastFollowup)) {
        ex.lastFollowup = e.followup_date;
      }
      map.set(e.client_id, ex);
    });
    return [...map.values()].sort((a, b) => b.tds - a.tds);
  }, [filtered]);

  // ─── Pending Follow-ups ───────────────────────────
  const pendingEntries = useMemo(() => {
    return filtered.filter(
      (e) => e.tds_amount > 0 && (!e.reflected_in_26as || !e.verified || !e.form16a_received)
    );
  }, [filtered]);

  // ─── Top clients by TDS ──────────────────────────
  const topClients = useMemo(() => clientSummary.slice(0, 5), [clientSummary]);

  // ─── Handlers ─────────────────────────────────────
  const handleSaveEntry = async () => {
    if (!editEntry) return;
    setSaving(true);
    try {
      let status = "Deducted";
      if (editEntry.verified) status = "Verified";
      else if (editEntry.reflected_in_26as) status = "Reflected";
      else if (editEntry.form16a_received) status = "Filed";

      const { error } = await supabase
        .from("tds_ledger" as any)
        .update({
          form16a_received: editEntry.form16a_received,
          reflected_in_26as: editEntry.reflected_in_26as,
          verified: editEntry.verified,
          status,
          tds_certificate_no: editEntry.tds_certificate_no,
          followup_notes: editEntry.followup_notes,
          followup_date: editEntry.followup_date,
        } as any)
        .eq("id", editEntry.id);

      if (error) throw error;
      toast.success("TDS entry updated");
      setEditEntry(null);
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleExportFull = useCallback(async () => {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    setExporting(true);
    try {
      const exportEntries: TDSExportEntry[] = filtered.map((e) => ({
        client_name: e.client_name || "",
        invoice_id: e.invoice_id,
        invoice_date: e.invoice_date || e.created_at,
        financial_year: e.financial_year,
        quarter: e.quarter,
        invoice_amount: e.invoice_amount,
        amount_received: e.amount_received,
        tds_amount: e.tds_amount,
        tds_section: e.tds_section,
        deduction_date: e.created_at,
        form16a_received: e.form16a_received,
        reflected_in_26as: e.reflected_in_26as,
        verified: e.verified,
        status: e.status,
        followup_notes: e.followup_notes,
        tds_certificate_no: e.tds_certificate_no,
      }));
      await exportTDSReconciliation(exportEntries, fyFilter !== "all" ? fyFilter : undefined);
      toast.success("TDS Reconciliation Excel exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  }, [filtered, fyFilter]);

  const handleExportPending = useCallback(async () => {
    if (pendingEntries.length === 0) { toast.error("No pending data"); return; }
    setExporting(true);
    try {
      const exportEntries: TDSExportEntry[] = pendingEntries.map((e) => ({
        client_name: e.client_name || "",
        invoice_id: e.invoice_id,
        invoice_date: e.invoice_date || e.created_at,
        financial_year: e.financial_year,
        quarter: e.quarter,
        invoice_amount: e.invoice_amount,
        amount_received: e.amount_received,
        tds_amount: e.tds_amount,
        tds_section: e.tds_section,
        deduction_date: e.created_at,
        form16a_received: e.form16a_received,
        reflected_in_26as: e.reflected_in_26as,
        verified: e.verified,
        status: e.status,
        followup_notes: e.followup_notes,
        tds_certificate_no: e.tds_certificate_no,
      }));
      await exportTDSReconciliation(exportEntries, fyFilter !== "all" ? fyFilter : "Pending");
      toast.success("Pending Follow-up Excel exported");
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  }, [pendingEntries, fyFilter]);

  const fmtDate = (d: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "-";
    return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
  };

  const verifiedPercent = metrics.totalTDS > 0 ? Math.round((metrics.totalVerified / metrics.totalTDS) * 100) : 0;

  // ─── Render ────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            TDS Dashboard & Reconciliation
          </h1>
          <p className="text-muted-foreground">Track TDS deductions, verification status, Form 16A, and 26AS reconciliation</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportFull} disabled={exporting}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Export Full Reconciliation
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPending} disabled={exporting}>
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Export Pending Follow-ups
          </Button>
        </div>
      </div>

      {/* ─── Summary Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard icon={IndianRupee} label="Total Invoiced" value={formatINR(metrics.totalInvoiced)} color="bg-primary/10 text-primary" />
        <MetricCard icon={TrendingUp} label="Amount Received" value={formatINR(metrics.totalReceived)} color="bg-green-500/10 text-green-600" />
        <MetricCard icon={FileText} label="TDS Deducted" value={formatINR(metrics.totalTDS)} color="bg-yellow-500/10 text-yellow-600" />
        <MetricCard icon={CheckCircle2} label="TDS Verified" value={formatINR(metrics.totalVerified)} color="bg-emerald-500/10 text-emerald-600" />
        <MetricCard icon={Clock} label="TDS Pending" value={formatINR(metrics.totalPending)} color="bg-orange-500/10 text-orange-600" />
        <MetricCard icon={Bell} label="Pending Follow-ups" value={String(metrics.pendingFollowups)} color="bg-red-500/10 text-red-600" />
      </div>

      {/* ─── Filters ──────────────────────────────── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search client or invoice..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={fyFilter} onValueChange={setFyFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Financial Year" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All FY</SelectItem>
                {FY_OPTIONS().map((fy) => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={quarterFilter} onValueChange={setQuarterFilter}>
              <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Quarter" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                <SelectItem value="Q1">Q1 (Apr-Jun)</SelectItem>
                <SelectItem value="Q2">Q2 (Jul-Sep)</SelectItem>
                <SelectItem value="Q3">Q3 (Oct-Dec)</SelectItem>
                <SelectItem value="Q4">Q4 (Jan-Mar)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {uniqueClients.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.keys(STATUS_CONFIG).map((s) => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ─────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="h-4 w-4" /> Invoice-wise</TabsTrigger>
          <TabsTrigger value="clients" className="gap-1.5"><Users className="h-4 w-4" /> Client-wise</TabsTrigger>
          <TabsTrigger value="followup" className="gap-1.5"><Bell className="h-4 w-4" /> Follow-up</TabsTrigger>
        </TabsList>

        {/* ─── TAB: Overview ─────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Verified vs Pending */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Verification Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verified: {formatINR(metrics.totalVerified)}</span>
                  <span className="font-semibold text-primary">{verifiedPercent}%</span>
                </div>
                <Progress value={verifiedPercent} className="h-3" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending: {formatINR(metrics.totalPending)}</span>
                  <span className="text-muted-foreground">{100 - verifiedPercent}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Clients by TDS */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Top Clients by TDS Deducted</CardTitle>
              </CardHeader>
              <CardContent>
                {topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data</p>
                ) : (
                  <div className="space-y-3">
                    {topClients.map((c, i) => {
                      const pct = metrics.totalTDS > 0 ? (c.tds / metrics.totalTDS) * 100 : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium truncate max-w-[200px]">{c.name}</span>
                            <span className="text-muted-foreground">{formatINR(c.tds)}</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quarter-wise Summary Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quarter-wise TDS Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FY</TableHead>
                      <TableHead>Quarter</TableHead>
                      <TableHead className="text-center">Invoices</TableHead>
                      <TableHead className="text-right">Invoiced</TableHead>
                      <TableHead className="text-right">TDS Deducted</TableHead>
                      <TableHead className="text-right">Verified</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quarterSummary.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No quarter data</TableCell></TableRow>
                    ) : quarterSummary.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{q.fy}</TableCell>
                        <TableCell>{q.qtr}</TableCell>
                        <TableCell className="text-center">{q.count}</TableCell>
                        <TableCell className="text-right">{formatINR(q.invoiced)}</TableCell>
                        <TableCell className="text-right font-medium">{formatINR(q.tds)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatINR(q.verified)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatINR(q.pending)}</TableCell>
                        <TableCell className="text-center">
                          <Progress value={q.tds > 0 ? (q.verified / q.tds) * 100 : 0} className="h-2 w-20 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Invoice-wise ─────────────────── */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Invoice-wise TDS Details ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Invoice Amt</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">TDS</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>FY / Qtr</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Form 16A</TableHead>
                        <TableHead>26AS</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((e) => {
                        const balance = Math.max(0, e.invoice_amount - (e.amount_received + e.tds_amount));
                        const status = deriveTDSStatus(e);
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium max-w-[140px] truncate">{e.client_name}</TableCell>
                            <TableCell className="font-mono text-xs">{e.invoice_id}</TableCell>
                            <TableCell className="text-sm">{fmtDate(e.invoice_date)}</TableCell>
                            <TableCell className="text-right">{formatINR(e.invoice_amount)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatINR(e.amount_received)}</TableCell>
                            <TableCell className="text-right font-medium text-primary">{formatINR(e.tds_amount)}</TableCell>
                            <TableCell className="text-right">{balance > 0 ? <span className="text-red-600">{formatINR(balance)}</span> : <span className="text-green-600">₹0</span>}</TableCell>
                            <TableCell className="text-xs">{e.financial_year} / {e.quarter}</TableCell>
                            <TableCell><Badge className={STATUS_CONFIG[status]?.variant || ""}>{STATUS_CONFIG[status]?.label || status}</Badge></TableCell>
                            <TableCell>{e.form16a_received ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                            <TableCell>{e.reflected_in_26as ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-muted-foreground" />}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setEditEntry({ ...e })}><Pencil className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Client-wise ──────────────────── */}
        <TabsContent value="clients">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Client-wise TDS Summary ({clientSummary.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead className="text-center">Invoices</TableHead>
                      <TableHead className="text-right">Total Invoiced</TableHead>
                      <TableHead className="text-right">TDS Deducted</TableHead>
                      <TableHead className="text-right">TDS Verified</TableHead>
                      <TableHead className="text-right">TDS Pending</TableHead>
                      <TableHead>Last Follow-up</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientSummary.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No data</TableCell></TableRow>
                    ) : clientSummary.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-center">{c.invoices}</TableCell>
                        <TableCell className="text-right">{formatINR(c.invoiced)}</TableCell>
                        <TableCell className="text-right font-medium">{formatINR(c.tds)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatINR(c.verified)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatINR(c.pending)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(c.lastFollowup)}</TableCell>
                        <TableCell className="text-center">
                          <Progress value={c.tds > 0 ? (c.verified / c.tds) * 100 : 0} className="h-2 w-20 mx-auto" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB: Follow-up ────────────────────── */}
        <TabsContent value="followup">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Pending Follow-ups ({pendingEntries.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportPending} disabled={exporting || pendingEntries.length === 0}>
                <Download className="h-4 w-4 mr-1.5" /> Export
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {pendingEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
                  <p className="font-medium">All Clear!</p>
                  <p className="text-sm">No pending TDS follow-ups</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Invoice No</TableHead>
                        <TableHead className="text-right">TDS Amount</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead>Form 16A</TableHead>
                        <TableHead>26AS</TableHead>
                        <TableHead>Last Follow-up</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Finance Contact</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingEntries.map((e) => {
                        const status = deriveTDSStatus(e);
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="font-medium max-w-[140px] truncate">{e.client_name}</TableCell>
                            <TableCell className="font-mono text-xs">{e.invoice_id}</TableCell>
                            <TableCell className="text-right font-medium text-primary">{formatINR(e.tds_amount)}</TableCell>
                            <TableCell>{e.financial_year} / {e.quarter}</TableCell>
                            <TableCell>{e.form16a_received ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}</TableCell>
                            <TableCell>{e.reflected_in_26as ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}</TableCell>
                            <TableCell className="text-sm">{fmtDate(e.followup_date)}</TableCell>
                            <TableCell><Badge className={STATUS_CONFIG[status]?.variant || ""}>{STATUS_CONFIG[status]?.label || status}</Badge></TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate">{e.finance_contact || "-"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setEditEntry({ ...e })}><Pencil className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Edit Dialog ─────────────────────────── */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update TDS Entry</DialogTitle></DialogHeader>
          {editEntry && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Client:</span> {editEntry.client_name}</div>
                <div><span className="text-muted-foreground">Invoice:</span> {editEntry.invoice_id}</div>
                <div><span className="text-muted-foreground">TDS:</span> {formatINR(editEntry.tds_amount)}</div>
                <div><span className="text-muted-foreground">Period:</span> {editEntry.financial_year} / {editEntry.quarter}</div>
              </div>
              <div>
                <Label>TDS Certificate No.</Label>
                <Input value={editEntry.tds_certificate_no || ""} onChange={(e) => setEditEntry({ ...editEntry, tds_certificate_no: e.target.value })} placeholder="Certificate number" />
              </div>
              <div className="space-y-2">
                <Label>Status Tracking</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={editEntry.form16a_received} onCheckedChange={(c) => setEditEntry({ ...editEntry, form16a_received: !!c })} />
                    <span className="text-sm">Form 16A Received</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={editEntry.reflected_in_26as} onCheckedChange={(c) => setEditEntry({ ...editEntry, reflected_in_26as: !!c })} />
                    <span className="text-sm">Reflected in 26AS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={editEntry.verified} onCheckedChange={(c) => setEditEntry({ ...editEntry, verified: !!c })} />
                    <span className="text-sm">Verified & Reconciled</span>
                  </div>
                </div>
              </div>
              <div>
                <Label>Follow-up Date</Label>
                <Input type="date" value={editEntry.followup_date || ""} onChange={(e) => setEditEntry({ ...editEntry, followup_date: e.target.value })} />
              </div>
              <div>
                <Label>Follow-up Notes</Label>
                <Textarea value={editEntry.followup_notes || ""} onChange={(e) => setEditEntry({ ...editEntry, followup_notes: e.target.value })} placeholder="Notes about follow-up actions..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={handleSaveEntry} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────
function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">No TDS entries found</p>
      <p className="text-sm">TDS entries are automatically created when payments with TDS deduction are recorded.</p>
    </div>
  );
}

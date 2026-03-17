import { useState, useEffect, useMemo } from "react";
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
import { toast } from "sonner";
import { formatINR } from "@/utils/finance";
import { formatDate } from "@/utils/plans";
import { FileText, Search, Filter, Download, CheckCircle2, Clock, AlertTriangle, IndianRupee, Loader2, Pencil, FileSpreadsheet } from "lucide-react";
import { exportTDSReconciliation, type TDSExportEntry } from "@/utils/exports/excel/exportTDSReconciliation";

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
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Deducted: { label: "Deducted", color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  Filed: { label: "Filed", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  Reflected: { label: "Reflected", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  Verified: { label: "Verified", color: "bg-green-500/10 text-green-700 border-green-500/20" },
};

const FY_OPTIONS = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => {
    const y = year - i;
    return `FY${y}-${String(y + 1).slice(-2)}`;
  });
};

export default function ReportTDS() {
  const { company } = useCompany();
  const [entries, setEntries] = useState<TDSEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [fyFilter, setFyFilter] = useState("all");
  const [quarterFilter, setQuarterFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editEntry, setEditEntry] = useState<TDSEntry | null>(null);
  const [saving, setSaving] = useState(false);

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

      // Fetch client names
      const clientIds = [...new Set((data || []).map((d: any) => d.client_id))];
      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
      }

      setEntries((data || []).map((d: any) => ({
        ...d,
        client_name: clientMap[d.client_id] || d.client_id,
      })));
    } catch (error) {
      console.error("Error fetching TDS entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (fyFilter !== "all" && e.financial_year !== fyFilter) return false;
      if (quarterFilter !== "all" && e.quarter !== quarterFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.client_name?.toLowerCase().includes(q) && !e.invoice_id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [entries, fyFilter, quarterFilter, statusFilter, searchQuery]);

  // Dashboard metrics
  const totalDeducted = filtered.reduce((s, e) => s + e.tds_amount, 0);
  const totalVerified = filtered.filter(e => e.verified).reduce((s, e) => s + e.tds_amount, 0);
  const pendingFollowups = filtered.filter(e => !e.verified && !e.reflected_in_26as).length;
  const form16aPending = filtered.filter(e => !e.form16a_received).length;

  const handleSaveEntry = async () => {
    if (!editEntry) return;
    setSaving(true);
    try {
      // Determine status from checkboxes
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

  const exportCSV = () => {
    const headers = ["Client", "Invoice", "FY", "Quarter", "Section", "TDS Amount", "Invoice Amount", "Received", "Certificate No", "Form 16A", "26AS", "Verified", "Status", "Follow-up Notes"];
    const rows = filtered.map(e => [
      e.client_name, e.invoice_id, e.financial_year, e.quarter, e.tds_section || "",
      e.tds_amount, e.invoice_amount, e.amount_received, e.tds_certificate_no || "",
      e.form16a_received ? "Yes" : "No", e.reflected_in_26as ? "Yes" : "No",
      e.verified ? "Yes" : "No", e.status, e.followup_notes || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TDS_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">TDS Report & Reconciliation</h1>
          <p className="text-muted-foreground">Track TDS deductions, Form 16A receipts, and 26AS verification</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <IndianRupee className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total TDS Deducted</p>
                <p className="text-xl font-bold">{formatINR(totalDeducted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified in 26AS</p>
                <p className="text-xl font-bold">{formatINR(totalVerified)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                <p className="text-xl font-bold">{pendingFollowups}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Form 16A Pending</p>
                <p className="text-xl font-bold">{form16aPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search client or invoice..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={fyFilter} onValueChange={setFyFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="FY" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All FY</SelectItem>
            {FY_OPTIONS().map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={quarterFilter} onValueChange={setQuarterFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Quarter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quarters</SelectItem>
            <SelectItem value="Q1">Q1 (Apr-Jun)</SelectItem>
            <SelectItem value="Q2">Q2 (Jul-Sep)</SelectItem>
            <SelectItem value="Q3">Q3 (Oct-Dec)</SelectItem>
            <SelectItem value="Q4">Q4 (Jan-Mar)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Deducted">Deducted</SelectItem>
            <SelectItem value="Filed">Filed</SelectItem>
            <SelectItem value="Reflected">Reflected</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No TDS entries found. TDS entries are automatically created when payments with TDS deduction are recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>FY / Qtr</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead className="text-right">Invoice Amt</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">TDS</TableHead>
                    <TableHead>Form 16A</TableHead>
                    <TableHead>26AS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium max-w-[150px] truncate">{entry.client_name}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.invoice_id}</TableCell>
                      <TableCell className="text-sm">{entry.financial_year} / {entry.quarter}</TableCell>
                      <TableCell className="text-sm">{entry.tds_section || "-"}</TableCell>
                      <TableCell className="text-right">{formatINR(entry.invoice_amount)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatINR(entry.amount_received)}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">{formatINR(entry.tds_amount)}</TableCell>
                      <TableCell>
                        {entry.form16a_received ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.reflected_in_26as ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[entry.status]?.color || ""}>
                          {STATUS_CONFIG[entry.status]?.label || entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setEditEntry({ ...entry })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update TDS Entry</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Client:</span> {editEntry.client_name}</div>
                <div><span className="text-muted-foreground">Invoice:</span> {editEntry.invoice_id}</div>
                <div><span className="text-muted-foreground">TDS Amount:</span> {formatINR(editEntry.tds_amount)}</div>
                <div><span className="text-muted-foreground">Period:</span> {editEntry.financial_year} / {editEntry.quarter}</div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>TDS Certificate No.</Label>
                  <Input
                    value={editEntry.tds_certificate_no || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, tds_certificate_no: e.target.value })}
                    placeholder="Certificate number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status Tracking</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={editEntry.form16a_received}
                        onCheckedChange={(c) => setEditEntry({ ...editEntry, form16a_received: !!c })}
                      />
                      <span className="text-sm">Form 16A Received</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={editEntry.reflected_in_26as}
                        onCheckedChange={(c) => setEditEntry({ ...editEntry, reflected_in_26as: !!c })}
                      />
                      <span className="text-sm">Reflected in 26AS</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={editEntry.verified}
                        onCheckedChange={(c) => setEditEntry({ ...editEntry, verified: !!c })}
                      />
                      <span className="text-sm">Verified & Reconciled</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={editEntry.followup_date || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, followup_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Follow-up Notes</Label>
                  <Textarea
                    value={editEntry.followup_notes || ""}
                    onChange={(e) => setEditEntry({ ...editEntry, followup_notes: e.target.value })}
                    placeholder="Notes about follow-up actions..."
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
            <Button onClick={handleSaveEntry} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionKPICards } from "@/components/collections/CollectionKPICards";
import { AddFollowupModal } from "@/components/collections/AddFollowupModal";
import { FollowupHistoryModal } from "@/components/collections/FollowupHistoryModal";
import { AutoReminderPanel } from "@/components/collections/AutoReminderPanel";
import { ClientRiskPanel, ClientRiskBadge } from "@/components/collections/ClientRiskPanel";
import { CashflowForecastPanel } from "@/components/collections/CashflowForecastPanel";
import { CollectionPerformanceCards } from "@/components/collections/CollectionPerformanceCards";
import { CollectionCommunicationsTab } from "@/components/collections/CollectionCommunicationsTab";
import { SendReminderModal } from "@/components/collections/SendReminderModal";
import { useAutoReminders } from "@/hooks/useAutoReminders";
import { useClientRiskScoring } from "@/hooks/useClientRiskScoring";
import { useCashflowForecast } from "@/hooks/useCashflowForecast";
import { useCollectionMetrics } from "@/hooks/useCollectionMetrics";
import { formatINR, getDaysOverdue } from "@/utils/finance";
import { format } from "date-fns";
import { Plus, History, Eye, AlertTriangle, ChevronLeft, ChevronRight, BarChart3, BellRing, ShieldAlert, TrendingUp, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

interface CollectionRow {
  id: string;
  invoice_no: string;
  client_id: string;
  client_name: string;
  campaign_name: string | null;
  campaign_id: string | null;
  invoice_date: string | null;
  due_date: string | null;
  balance_due: number;
  total_amount: number;
  status: string;
  overdue_days: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  last_followup_date: string | null;
  promised_payment_date: string | null;
  next_followup_date: string | null;
  latest_note: string | null;
  followup_count: number;
}

function calcPriority(overdueDays: number, balanceDue: number): "HIGH" | "MEDIUM" | "LOW" {
  if (overdueDays > 30 || balanceDue >= 100000) return "HIGH";
  if (overdueDays > 0) return "MEDIUM";
  return "LOW";
}

const priorityBadge = { HIGH: "destructive" as const, MEDIUM: "outline" as const, LOW: "secondary" as const };
const priorityColor = { HIGH: "bg-red-50 dark:bg-red-950/20", MEDIUM: "", LOW: "" };

export default function FinanceCollections() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [followupsMap, setFollowupsMap] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState("");
  const [agingFilter, setAgingFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState("worklist");

  // Modals
  const [followupTarget, setFollowupTarget] = useState<string[] | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ invoiceId: string; invoiceNo: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [reminderTarget, setReminderTarget] = useState<string[] | null>(null);

  // Intelligence hooks
  const autoReminders = useAutoReminders();
  const riskScoring = useClientRiskScoring();
  const { forecast, isLoading: forecastLoading } = useCashflowForecast();
  const { metrics, isLoading: metricsLoading } = useCollectionMetrics();

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    const [invRes, fupRes] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_no, client_id, client_name, campaign_id, invoice_date, due_date, status, total_amount, paid_amount, credited_amount, balance_due, campaigns:campaign_id(campaign_name)")
        .eq("company_id", company.id)
        .not("status", "in", '("Draft","Cancelled")')
        .gt("balance_due", 0),
      supabase
        .from("invoice_followups")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false }),
    ]);

    setInvoices(invRes.data || []);

    const map: Record<string, any[]> = {};
    (fupRes.data || []).forEach((f: any) => {
      if (!map[f.invoice_id]) map[f.invoice_id] = [];
      map[f.invoice_id].push(f);
    });
    setFollowupsMap(map);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Build collection rows
  const rows: CollectionRow[] = useMemo(() => {
    return invoices.map((inv) => {
      const overdueDays = inv.due_date ? getDaysOverdue(inv.due_date) : 0;
      const bal = Number(inv.balance_due || 0);
      const fups = followupsMap[inv.id] || [];
      const latest = fups[0] || null;
      return {
        id: inv.id,
        invoice_no: inv.invoice_no || inv.id,
        client_id: inv.client_id,
        client_name: inv.client_name || "—",
        campaign_name: (inv.campaigns as any)?.campaign_name || null,
        campaign_id: inv.campaign_id,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        balance_due: bal,
        total_amount: Number(inv.total_amount || 0),
        status: inv.status,
        overdue_days: Math.max(0, overdueDays),
        priority: calcPriority(overdueDays, bal),
        last_followup_date: latest?.follow_up_date || null,
        promised_payment_date: latest?.promised_payment_date || null,
        next_followup_date: latest?.next_follow_up_date || null,
        latest_note: latest?.note || null,
        followup_count: fups.length,
      };
    }).sort((a, b) => b.overdue_days - a.overdue_days || b.balance_due - a.balance_due);
  }, [invoices, followupsMap]);

  // Filters
  const filtered = useMemo(() => {
    let list = rows;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.client_name.toLowerCase().includes(q) || r.invoice_no.toLowerCase().includes(q) || (r.campaign_name || "").toLowerCase().includes(q));
    }
    if (agingFilter !== "all") {
      list = list.filter(r => {
        switch (agingFilter) {
          case "not_due": return r.overdue_days === 0;
          case "0-30": return r.overdue_days > 0 && r.overdue_days <= 30;
          case "31-60": return r.overdue_days > 30 && r.overdue_days <= 60;
          case "61-90": return r.overdue_days > 60 && r.overdue_days <= 90;
          case "90+": return r.overdue_days > 90;
          case "high": return r.priority === "HIGH";
          default: return true;
        }
      });
    }
    return list;
  }, [rows, search, agingFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPIs
  const kpis = useMemo(() => ({
    totalOutstanding: rows.reduce((s, r) => s + r.balance_due, 0),
    totalOverdue: rows.filter(r => r.overdue_days > 0).reduce((s, r) => s + r.balance_due, 0),
    highPriorityCount: rows.filter(r => r.priority === "HIGH").length,
    followupsDueToday: rows.filter(r => r.next_followup_date === todayStr).length,
  }), [rows, todayStr]);

  // Follow-up save
  const handleSaveFollowup = async (data: any) => {
    if (!followupTarget || !company?.id) return;
    setSaving(true);
    const inserts = followupTarget.map(invoiceId => ({
      invoice_id: invoiceId,
      company_id: company.id,
      note: data.note,
      contact_type: data.contact_type,
      follow_up_date: data.follow_up_date,
      next_follow_up_date: data.next_follow_up_date || null,
      promised_payment_date: data.promised_payment_date || null,
      created_by: user?.id || null,
    }));
    const { error } = await supabase.from("invoice_followups").insert(inserts);
    setSaving(false);
    if (error) { toast.error("Failed to save follow-up"); return; }
    toast.success(`Follow-up added for ${followupTarget.length} invoice(s)`);
    setFollowupTarget(null);
    setSelected(new Set());
    fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(r => r.id)));
  };

  const promiseBroken = (r: CollectionRow) =>
    r.promised_payment_date && r.promised_payment_date < todayStr && r.balance_due > 0;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">Collections & Intelligence</h1>
          <p className="text-sm text-muted-foreground">Smart follow-ups, risk scoring & cashflow forecast</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/finance/dashboard")}>← Finance Dashboard</Button>
      </div>

      <CollectionKPICards kpis={kpis} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="worklist" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Worklist
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-1.5 text-xs">
            <BellRing className="h-3.5 w-3.5" /> Auto Reminders
            {autoReminders.candidates.length > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">{autoReminders.candidates.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="comms" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Comms
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-1.5 text-xs">
            <ShieldAlert className="h-3.5 w-3.5" /> Risk & Forecast
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* WORKLIST TAB */}
        <TabsContent value="worklist" className="space-y-4 mt-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <Input placeholder="Search client, invoice, campaign..." className="max-w-xs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
              <Select value={agingFilter} onValueChange={(v) => { setAgingFilter(v); setPage(0); }}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pending</SelectItem>
                  <SelectItem value="not_due">Not Yet Due</SelectItem>
                  <SelectItem value="0-30">0–30 Days</SelectItem>
                  <SelectItem value="31-60">31–60 Days</SelectItem>
                  <SelectItem value="61-90">61–90 Days</SelectItem>
                  <SelectItem value="90+">90+ Days</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
              {selected.size > 0 && (
                <div className="flex gap-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => setFollowupTarget(Array.from(selected))}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Follow-up ({selected.size})
                  </Button>
                </div>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} invoices</span>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={selected.size === paged.length && paged.length > 0} onCheckedChange={toggleAll} /></TableHead>
                    <TableHead className="w-20">Priority</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead>Last Follow-up</TableHead>
                    <TableHead>Promised Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No invoices match the current filters.</TableCell></TableRow>
                  )}
                  {paged.map((r) => {
                    const clientRisk = riskScoring.getRiskForClient(r.client_id);
                    return (
                      <TableRow key={r.id} className={`${priorityColor[r.priority]} ${promiseBroken(r) ? "border-l-4 border-l-amber-500" : ""}`}>
                        <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                        <TableCell><Badge variant={priorityBadge[r.priority]}>{r.priority}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium max-w-[140px] truncate">{r.client_name}</span>
                            <ClientRiskBadge riskLevel={clientRisk?.riskLevel} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{r.invoice_no}</TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{r.campaign_name || "—"}</TableCell>
                        <TableCell className="text-xs">{r.due_date ? format(new Date(r.due_date), "dd MMM yy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          {r.overdue_days > 0 ? <span className="text-red-600 font-medium">{r.overdue_days}d</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatINR(r.balance_due)}</TableCell>
                        <TableCell className="text-xs">
                          {r.last_followup_date ? format(new Date(r.last_followup_date), "dd MMM yy") : "—"}
                          {r.followup_count > 0 && <span className="text-muted-foreground ml-1">({r.followup_count})</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.promised_payment_date ? (
                            <span className={promiseBroken(r) ? "text-amber-600 font-medium" : ""}>
                              {promiseBroken(r) && <AlertTriangle className="h-3 w-3 inline mr-0.5" />}
                              {format(new Date(r.promised_payment_date), "dd MMM yy")}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {r.next_followup_date === todayStr ? (
                            <Badge className="bg-amber-100 text-amber-800 text-[10px]">Due Today</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Add Follow-up" onClick={() => setFollowupTarget([r.id])}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="History" onClick={() => setHistoryTarget({ invoiceId: r.id, invoiceNo: r.invoice_no })}>
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="View Invoice" onClick={() => navigate(`/admin/invoices?search=${encodeURIComponent(r.invoice_no)}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t">
                <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* AUTO REMINDERS TAB */}
        <TabsContent value="reminders" className="space-y-4 mt-4">
          <AutoReminderPanel
            candidates={autoReminders.candidates}
            isLoading={autoReminders.isLoading}
            onExecuteAll={autoReminders.executeAll}
            onExecuteSelected={autoReminders.executeReminders}
            isExecuting={autoReminders.isExecuting}
          />
        </TabsContent>

        {/* RISK & FORECAST TAB */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ClientRiskPanel
              scores={riskScoring.scores}
              isLoading={riskScoring.isLoading}
              onRefresh={riskScoring.persistScores}
              isRefreshing={riskScoring.isPersisting}
            />
            <CashflowForecastPanel
              buckets={forecast.buckets}
              totalExpected={forecast.totalExpected}
              riskAdjusted={forecast.riskAdjusted}
              isLoading={forecastLoading}
            />
          </div>
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4 mt-4">
          <CollectionPerformanceCards metrics={metrics} isLoading={metricsLoading} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {followupTarget && (
        <AddFollowupModal
          open
          onClose={() => setFollowupTarget(null)}
          onSave={handleSaveFollowup}
          invoiceNos={followupTarget.map(id => rows.find(r => r.id === id)?.invoice_no || id)}
          loading={saving}
        />
      )}
      {historyTarget && (
        <FollowupHistoryModal
          open
          onClose={() => setHistoryTarget(null)}
          invoiceNo={historyTarget.invoiceNo}
          followups={followupsMap[historyTarget.invoiceId] || []}
        />
      )}
    </div>
  );
}

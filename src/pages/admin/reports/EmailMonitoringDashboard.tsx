/**
 * Email Monitoring Dashboard — Enterprise-grade email operations monitoring
 * Route: /admin/reports/email-monitoring
 * Data: email_outbox, email_send_logs, email_templates
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay, isAfter, parseISO } from "date-fns";
import {
  Mail, Send, AlertTriangle, Clock, CheckCircle2, XCircle,
  RefreshCw, Search, Download, Eye, RotateCcw, TrendingUp,
  Activity, BarChart3, Users, FileText, Zap, Ban, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  queued: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-muted text-muted-foreground",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#6b7280"];

type DatePreset = "24h" | "7d" | "30d" | "custom";

export default function EmailMonitoringDashboard() {
  const { company } = useCompany();
  const [loading, setLoading] = useState(true);
  const [outboxData, setOutboxData] = useState<any[]>([]);
  const [sendLogs, setSendLogs] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialogs
  const [viewHtmlDialog, setViewHtmlDialog] = useState<{ open: boolean; html: string; subject: string }>({ open: false, html: "", subject: "" });
  const [viewPayloadDialog, setViewPayloadDialog] = useState<{ open: boolean; payload: any }>({ open: false, payload: null });

  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case "24h": return { from: subDays(now, 1), to: now };
      case "7d": return { from: subDays(now, 7), to: now };
      case "30d": return { from: subDays(now, 30), to: now };
      default: return { from: subDays(now, 7), to: now };
    }
  }, [datePreset]);

  const fetchData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);

    const from = dateRange.from.toISOString();
    const to = dateRange.to.toISOString();

    const [outboxRes, logsRes, templatesRes] = await Promise.all([
      supabase
        .from("email_outbox" as any)
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("email_send_logs" as any)
        .select("*")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("sent_at", { ascending: false })
        .limit(500),
      supabase
        .from("email_templates" as any)
        .select("template_key, template_name, trigger_event, is_active, send_mode, category, updated_at"),
    ]);

    setOutboxData((outboxRes.data as any[]) || []);
    setSendLogs((logsRes.data as any[]) || []);
    setTemplates((templatesRes.data as any[]) || []);
    setLoading(false);
  }, [company?.id, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtered outbox
  const filtered = useMemo(() => {
    return outboxData.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (eventFilter !== "all" && row.event_key !== eventFilter) return false;
      if (templateFilter !== "all" && row.template_key !== templateFilter) return false;
      if (moduleFilter !== "all" && row.source_module !== moduleFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !(row.recipient_to || "").toLowerCase().includes(q) &&
          !(row.subject_rendered || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [outboxData, statusFilter, eventFilter, templateFilter, moduleFilter, searchQuery]);

  // Unique values for filters
  const uniqueEvents = useMemo(() => [...new Set(outboxData.map(r => r.event_key).filter(Boolean))], [outboxData]);
  const uniqueTemplates = useMemo(() => [...new Set(outboxData.map(r => r.template_key).filter(Boolean))], [outboxData]);
  const uniqueModules = useMemo(() => [...new Set(outboxData.map(r => r.source_module).filter(Boolean))], [outboxData]);

  // Summary stats
  const stats = useMemo(() => {
    const total = outboxData.length;
    const sent = outboxData.filter(r => r.status === "sent").length;
    const pending = outboxData.filter(r => r.status === "pending" || r.status === "processing" || r.status === "queued").length;
    const failed = outboxData.filter(r => r.status === "failed").length;
    const retry = outboxData.filter(r => (r.attempt_count || 0) > 1 && r.status !== "sent").length;
    const today = outboxData.filter(r => {
      try { return isAfter(parseISO(r.created_at), startOfDay(new Date())); } catch { return false; }
    }).length;
    const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;
    return { total, sent, pending, failed, retry, today, successRate };
  }, [outboxData]);

  // Charts
  const statusPieData = useMemo(() => {
    const map: Record<string, number> = {};
    outboxData.forEach(r => { map[r.status] = (map[r.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [outboxData]);

  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; sent: number; failed: number; pending: number }> = {};
    outboxData.forEach(r => {
      const d = format(parseISO(r.created_at), "MMM dd");
      if (!map[d]) map[d] = { date: d, sent: 0, failed: 0, pending: 0 };
      if (r.status === "sent") map[d].sent++;
      else if (r.status === "failed") map[d].failed++;
      else map[d].pending++;
    });
    return Object.values(map).reverse();
  }, [outboxData]);

  const moduleData = useMemo(() => {
    const map: Record<string, number> = {};
    outboxData.forEach(r => { const m = r.source_module || "unknown"; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [outboxData]);

  const topTemplates = useMemo(() => {
    const map: Record<string, { name: string; sent: number; failed: number }> = {};
    outboxData.forEach(r => {
      const k = r.template_key || "unknown";
      if (!map[k]) map[k] = { name: k, sent: 0, failed: 0 };
      if (r.status === "sent") map[k].sent++;
      else if (r.status === "failed") map[k].failed++;
    });
    return Object.values(map).sort((a, b) => (b.sent + b.failed) - (a.sent + a.failed)).slice(0, 10);
  }, [outboxData]);

  // Template performance
  const templatePerformance = useMemo(() => {
    const map: Record<string, { key: string; name: string; sent: number; failed: number; lastUsed: string }> = {};
    outboxData.forEach(r => {
      const k = r.template_key || "unknown";
      if (!map[k]) {
        const tpl = templates.find(t => t.template_key === k);
        map[k] = { key: k, name: tpl?.template_name || k, sent: 0, failed: 0, lastUsed: r.created_at };
      }
      if (r.status === "sent") map[k].sent++;
      else if (r.status === "failed") map[k].failed++;
      if (r.created_at > map[k].lastUsed) map[k].lastUsed = r.created_at;
    });
    return Object.values(map).sort((a, b) => (b.sent + b.failed) - (a.sent + a.failed));
  }, [outboxData, templates]);

  // Recipient activity
  const recipientActivity = useMemo(() => {
    const map: Record<string, { email: string; total: number; failed: number; lastEvent: string; lastDate: string }> = {};
    outboxData.forEach(r => {
      const e = r.recipient_to;
      if (!e) return;
      if (!map[e]) map[e] = { email: e, total: 0, failed: 0, lastEvent: "", lastDate: "" };
      map[e].total++;
      if (r.status === "failed") map[e].failed++;
      if (!map[e].lastDate || r.created_at > map[e].lastDate) {
        map[e].lastDate = r.created_at;
        map[e].lastEvent = r.event_key || "";
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [outboxData]);

  // Retry action
  const handleRetry = async (row: any) => {
    setRetryingId(row.id);
    try {
      const { error } = await supabase
        .from("email_outbox" as any)
        .update({ status: "pending", attempt_count: (row.attempt_count || 0) + 1, last_error: null } as any)
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Email queued for retry");
      fetchData();
    } catch (err: any) {
      toast.error("Retry failed: " + err.message);
    } finally {
      setRetryingId(null);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ["Created At", "Event Key", "Template Key", "Subject", "Recipient", "Status", "Attempts", "Error"];
    const rows = filtered.map(r => [
      r.created_at, r.event_key, r.template_key, r.subject_rendered,
      r.recipient_to, r.status, r.attempt_count || 0, r.last_error || "",
    ]);
    const csv = [headers, ...rows].map(row => row.map((c: any) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-monitoring-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const failedEmails = useMemo(() => filtered.filter(r => r.status === "failed"), [filtered]);

  const StatusBadge = ({ status }: { status: string }) => (
    <Badge variant="secondary" className={`text-xs font-medium ${STATUS_COLORS[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </Badge>
  );

  const formatDate = (d: string | null) => d ? format(parseISO(d), "dd MMM yyyy, HH:mm") : "—";

  return (
    <ModuleGuard module="reports">
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" /> Email Monitoring
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Monitor outgoing emails, failures, retries, and automation health
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Emails", value: stats.total, icon: Mail, color: "text-primary" },
              { label: "Sent", value: stats.sent, icon: CheckCircle2, color: "text-emerald-600" },
              { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-600" },
              { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-600" },
              { label: "Success Rate", value: `${stats.successRate}%`, icon: TrendingUp, color: "text-blue-600" },
              { label: "Today", value: stats.today, icon: Zap, color: "text-purple-600" },
            ].map((s) => (
              <Card key={s.label} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                    <span className="text-2xl font-bold">{s.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Date Range</label>
                  <div className="flex gap-1">
                    {(["24h", "7d", "30d"] as DatePreset[]).map(p => (
                      <Button key={p} size="sm" variant={datePreset === p ? "default" : "outline"} onClick={() => setDatePreset(p)} className="text-xs px-3">
                        {p === "24h" ? "24h" : p === "7d" ? "7 Days" : "30 Days"}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Event</label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {uniqueEvents.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Template</label>
                  <Select value={templateFilter} onValueChange={setTemplateFilter}>
                    <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Templates</SelectItem>
                      {uniqueTemplates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Module</label>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      {uniqueModules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground block mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Recipient email or subject..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="overview" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="outbox" className="text-xs gap-1"><Send className="h-3.5 w-3.5" /> Outbox Queue</TabsTrigger>
              <TabsTrigger value="failures" className="text-xs gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Failures ({stats.failed})</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" /> Template Performance</TabsTrigger>
              <TabsTrigger value="recipients" className="text-xs gap-1"><Users className="h-3.5 w-3.5" /> Recipient Activity</TabsTrigger>
              <TabsTrigger value="automation" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" /> Automation Health</TabsTrigger>
            </TabsList>

            {/* ===== OVERVIEW ===== */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Pie */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Sent vs Failed vs Pending</CardTitle></CardHeader>
                  <CardContent>
                    {statusPieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyState text="No email data" />}
                  </CardContent>
                </Card>
                {/* Daily Trend */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Emails by Day</CardTitle></CardHeader>
                  <CardContent>
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="sent" fill="#10b981" name="Sent" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState text="No daily data" />}
                  </CardContent>
                </Card>
                {/* By Module */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Emails by Module</CardTitle></CardHeader>
                  <CardContent>
                    {moduleData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={moduleData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="hsl(var(--primary))" name="Count" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyState text="No module data" />}
                  </CardContent>
                </Card>
                {/* Top Templates */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Top Templates Used</CardTitle></CardHeader>
                  <CardContent>
                    {topTemplates.length > 0 ? (
                      <div className="space-y-2">
                        {topTemplates.map(t => (
                          <div key={t.name} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1 mr-2 text-xs">{t.name}</span>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">{t.sent} sent</Badge>
                              {t.failed > 0 && <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">{t.failed} failed</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <EmptyState text="No template data" />}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ===== OUTBOX QUEUE ===== */}
            <TabsContent value="outbox">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs w-[140px]">Created At</TableHead>
                          <TableHead className="text-xs">Event</TableHead>
                          <TableHead className="text-xs">Template</TableHead>
                          <TableHead className="text-xs">Subject</TableHead>
                          <TableHead className="text-xs">Recipient</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-center">Attempts</TableHead>
                          <TableHead className="text-xs">Module</TableHead>
                          <TableHead className="text-xs text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">No emails found</TableCell></TableRow>
                        ) : filtered.slice(0, 100).map(row => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                            <TableCell className="text-xs font-mono">{row.event_key || "—"}</TableCell>
                            <TableCell className="text-xs">{row.template_key || "—"}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{row.subject_rendered || "—"}</TableCell>
                            <TableCell className="text-xs">{row.recipient_to || "—"}</TableCell>
                            <TableCell><StatusBadge status={row.status} /></TableCell>
                            <TableCell className="text-xs text-center">{row.attempt_count || 0}</TableCell>
                            <TableCell className="text-xs">{row.source_module || "—"}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {row.html_rendered && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="View Email"
                                    onClick={() => setViewHtmlDialog({ open: true, html: row.html_rendered, subject: row.subject_rendered || "" })}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {row.payload_json && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" title="View Payload"
                                    onClick={() => setViewPayloadDialog({ open: true, payload: row.payload_json })}>
                                    <FileText className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {row.status === "failed" && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" title="Retry"
                                    disabled={retryingId === row.id} onClick={() => handleRetry(row)}>
                                    {retryingId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filtered.length > 100 && (
                    <div className="p-3 text-center text-xs text-muted-foreground border-t">
                      Showing 100 of {filtered.length} results. Use filters to narrow down.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== FAILURES ===== */}
            <TabsContent value="failures">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Created At</TableHead>
                          <TableHead className="text-xs">Template</TableHead>
                          <TableHead className="text-xs">Recipient</TableHead>
                          <TableHead className="text-xs text-center">Attempts</TableHead>
                          <TableHead className="text-xs">Error Message</TableHead>
                          <TableHead className="text-xs text-right">Retry</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedEmails.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />No failed emails 🎉
                          </TableCell></TableRow>
                        ) : failedEmails.map(row => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs whitespace-nowrap">{formatDate(row.created_at)}</TableCell>
                            <TableCell className="text-xs">{row.template_key || "—"}</TableCell>
                            <TableCell className="text-xs">{row.recipient_to || "—"}</TableCell>
                            <TableCell className="text-xs text-center">{row.attempt_count || 0}</TableCell>
                            <TableCell className="text-xs max-w-[300px] truncate text-red-600">{row.last_error || "Unknown error"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={retryingId === row.id} onClick={() => handleRetry(row)}>
                                {retryingId === row.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />} Retry
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== TEMPLATE PERFORMANCE ===== */}
            <TabsContent value="templates">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Template Name</TableHead>
                          <TableHead className="text-xs">Key</TableHead>
                          <TableHead className="text-xs text-center">Sent</TableHead>
                          <TableHead className="text-xs text-center">Failed</TableHead>
                          <TableHead className="text-xs text-center">Success Rate</TableHead>
                          <TableHead className="text-xs">Last Used</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {templatePerformance.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No template usage data</TableCell></TableRow>
                        ) : templatePerformance.map(t => {
                          const total = t.sent + t.failed;
                          const rate = total > 0 ? Math.round((t.sent / total) * 100) : 0;
                          return (
                            <TableRow key={t.key}>
                              <TableCell className="text-xs font-medium">{t.name}</TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">{t.key}</TableCell>
                              <TableCell className="text-xs text-center font-medium text-emerald-600">{t.sent}</TableCell>
                              <TableCell className="text-xs text-center font-medium text-red-600">{t.failed}</TableCell>
                              <TableCell className="text-xs text-center">
                                <Badge variant="secondary" className={rate >= 90 ? "bg-emerald-100 text-emerald-700" : rate >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                                  {rate}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{formatDate(t.lastUsed)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== RECIPIENT ACTIVITY ===== */}
            <TabsContent value="recipients">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Recipient Email</TableHead>
                          <TableHead className="text-xs text-center">Total Sent</TableHead>
                          <TableHead className="text-xs text-center">Failed</TableHead>
                          <TableHead className="text-xs">Last Event</TableHead>
                          <TableHead className="text-xs">Last Sent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipientActivity.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No recipient data</TableCell></TableRow>
                        ) : recipientActivity.slice(0, 50).map(r => (
                          <TableRow key={r.email}>
                            <TableCell className="text-xs font-medium">{r.email}</TableCell>
                            <TableCell className="text-xs text-center">{r.total}</TableCell>
                            <TableCell className="text-xs text-center">{r.failed > 0 ? <span className="text-red-600 font-medium">{r.failed}</span> : "0"}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{r.lastEvent}</TableCell>
                            <TableCell className="text-xs">{formatDate(r.lastDate)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== AUTOMATION HEALTH ===== */}
            <TabsContent value="automation">
              <AutomationHealthPanel companyId={company?.id} />
            </TabsContent>
          </Tabs>

          {/* View Rendered Email Dialog */}
          <Dialog open={viewHtmlDialog.open} onOpenChange={(o) => setViewHtmlDialog(p => ({ ...p, open: o }))}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm">Rendered Email: {viewHtmlDialog.subject}</DialogTitle>
              </DialogHeader>
              <div className="border rounded p-4 bg-white">
                <div dangerouslySetInnerHTML={{ __html: viewHtmlDialog.html }} />
              </div>
            </DialogContent>
          </Dialog>

          {/* View Payload Dialog */}
          <Dialog open={viewPayloadDialog.open} onOpenChange={(o) => setViewPayloadDialog(p => ({ ...p, open: o }))}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-sm">Email Payload</DialogTitle></DialogHeader>
              <pre className="bg-muted rounded p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(viewPayloadDialog.payload, null, 2)}
              </pre>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ModuleGuard>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Mail className="h-8 w-8 mb-2 opacity-40" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

/** Automation Health Panel — shows status of scheduled jobs */
function AutomationHealthPanel({ companyId }: { companyId?: string }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Query automation rules for email-related triggers
      const { data: rules } = await supabase
        .from("automation_rules" as any)
        .select("*")
        .order("created_at", { ascending: false });

      // Query auto_reminder_settings
      const { data: reminderRaw } = await supabase
        .from("auto_reminder_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      const reminderSettings = reminderRaw as any;

      const automationJobs = [
        {
          name: "Daily Digest",
          description: "Sends daily summary email to admins",
          status: "configured",
          lastRun: reminderSettings?.last_run_at || null,
          enabled: reminderSettings?.enabled ?? false,
        },
        {
          name: "Payment Reminders",
          description: "Auto-sends payment reminders for overdue invoices",
          status: "configured",
          lastRun: reminderSettings?.last_run_at || null,
          enabled: reminderSettings?.email_enabled ?? false,
        },
        {
          name: "Campaign End Alerts",
          description: "Notifies before campaign end dates",
          status: "configured",
          lastRun: null,
          enabled: true,
        },
        {
          name: "Failed Email Alerts",
          description: "Monitors and alerts on email delivery failures",
          status: "configured",
          lastRun: null,
          enabled: true,
        },
      ];

      // Add dynamic automation rules
      if (rules) {
        (rules as any[]).forEach(r => {
          if (r.trigger_event?.includes("email") || (r.actions as any)?.type === "send_email") {
            automationJobs.push({
              name: r.rule_name,
              description: `Trigger: ${r.trigger_event}`,
              status: r.is_active ? "active" : "inactive",
              lastRun: r.updated_at,
              enabled: r.is_active,
            });
          }
        });
      }

      setJobs(automationJobs);
      setLoading(false);
    }
    load();
  }, [companyId]);

  if (loading) return <div className="py-12 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Job Name</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
                <TableHead className="text-xs">Last Run</TableHead>
                <TableHead className="text-xs text-center">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{j.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{j.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className={j.enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}>
                      {j.enabled ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{j.lastRun ? format(parseISO(j.lastRun), "dd MMM yyyy, HH:mm") : "—"}</TableCell>
                  <TableCell className="text-center">
                    {j.enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" /> : <Ban className="h-4 w-4 text-muted-foreground mx-auto" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

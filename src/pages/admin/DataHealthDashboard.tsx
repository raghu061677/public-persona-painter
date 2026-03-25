import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuditStore } from "@/hooks/useAuditStore";
import { usePersistedIssues, type PersistedIssue, type IssueSeverity, type WorkflowStatus } from "@/hooks/usePersistedIssues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Ban,
  Link2Off,
  Building2,
  CalendarX,
  CalendarRange,
  Tag,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Download,
  Database,
  Activity,
  TrendingDown,
  Clock,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  EyeOff,
  Search,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CHECK_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  negative_money: { label: "Negative Money", icon: Ban, color: "text-red-600 bg-red-50 border-red-200" },
  invalid_status: { label: "Invalid Status", icon: AlertTriangle, color: "text-amber-600 bg-amber-50 border-amber-200" },
  orphan_reference: { label: "Orphan Reference", icon: Link2Off, color: "text-orange-600 bg-orange-50 border-orange-200" },
  missing_company_id: { label: "Missing Company ID", icon: Building2, color: "text-rose-600 bg-rose-50 border-rose-200" },
  inverted_date_range: { label: "Inverted Date Range", icon: CalendarX, color: "text-purple-600 bg-purple-50 border-purple-200" },
  booking_outside_campaign: { label: "Booking Outside Campaign", icon: CalendarRange, color: "text-blue-600 bg-blue-50 border-blue-200" },
  missing_identifier: { label: "Missing Identifier", icon: Tag, color: "text-slate-600 bg-slate-50 border-slate-200" },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: "Critical", color: "text-red-700", bgColor: "bg-red-100 border-red-300" },
  high: { label: "High", color: "text-orange-700", bgColor: "bg-orange-100 border-orange-300" },
  medium: { label: "Medium", color: "text-amber-700", bgColor: "bg-amber-100 border-amber-300" },
  low: { label: "Low", color: "text-slate-600", bgColor: "bg-slate-100 border-slate-300" },
};

const WORKFLOW_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-red-100 text-red-800" },
  investigating: { label: "Investigating", color: "bg-amber-100 text-amber-800" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-800" },
  ignored: { label: "Ignored", color: "bg-slate-100 text-slate-600" },
};

const ALL_CHECKS = Object.keys(CHECK_META);

interface UnifiedIssue {
  id?: string;
  check: string;
  table: string;
  field: string;
  recordId: string;
  detail: string;
  context: string;
  time: string;
  occurrences?: number;
  severity: IssueSeverity;
  workflowStatus: WorkflowStatus;
  assignedTo?: string | null;
  resolutionNote?: string | null;
}

function exportCsv(rows: UnifiedIssue[], filename: string) {
  const header = "Severity,Check,Table,Field,Record ID,Detail,Context,Status,Time,Occurrences\n";
  const body = rows
    .map(
      (r) =>
        `"${r.severity}","${r.check}","${r.table}","${r.field}","${r.recordId}","${r.detail.replace(/"/g, '""')}","${r.context}","${r.workflowStatus}","${r.time}","${r.occurrences || 1}"`
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Map session issues to severity
const SESSION_SEVERITY_MAP: Record<string, IssueSeverity> = {
  missing_company_id: "critical",
  orphan_reference: "high",
  negative_money: "high",
  inverted_date_range: "high",
  invalid_status: "medium",
  booking_outside_campaign: "medium",
  missing_identifier: "low",
};

export default function DataHealthDashboard() {
  const { allIssues, snapshots, clear } = useAuditStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [tab, setTab] = useState<string>(urlTab === "persisted" ? "persisted" : "session");
  const isPersisted = tab === "persisted";

  // Sync tab changes back to URL
  const handleTabChange = useCallback((newTab: string) => {
    setTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  }, [setSearchParams]);
  const { issues: persistedIssues, isLoading, trendData, runs, refetch, updateIssue, isUpdating } = usePersistedIssues(isPersisted);

  const [checkFilter, setCheckFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<UnifiedIssue | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  // Convert to unified shape
  const sessionUnified: UnifiedIssue[] = useMemo(
    () =>
      allIssues.map((i) => ({
        check: i.check,
        table: i.table,
        field: i.field,
        recordId: i.recordId,
        detail: i.detail,
        context: i.label,
        time: i.capturedAt,
        occurrences: 1,
        severity: SESSION_SEVERITY_MAP[i.check] || "medium",
        workflowStatus: "open" as WorkflowStatus,
      })),
    [allIssues]
  );

  const persistedUnified: UnifiedIssue[] = useMemo(
    () =>
      persistedIssues.map((i: PersistedIssue) => ({
        id: i.id,
        check: i.issue_type,
        table: i.table_name,
        field: i.field_name,
        recordId: i.record_id,
        detail: i.detail || "",
        context: i.context || "nightly-audit",
        time: i.last_seen,
        occurrences: i.occurrences,
        severity: i.severity,
        workflowStatus: i.workflow_status,
        assignedTo: i.assigned_to,
        resolutionNote: i.resolution_note,
      })),
    [persistedIssues]
  );

  const activeIssues = isPersisted ? persistedUnified : sessionUnified;

  const uniqueTables = useMemo(
    () => [...new Set(activeIssues.map((i) => i.table))].sort(),
    [activeIssues]
  );

  const countsByCheck = useMemo(() => {
    const m: Record<string, number> = {};
    ALL_CHECKS.forEach((c) => (m[c] = 0));
    activeIssues.forEach((i) => (m[i.check] = (m[i.check] || 0) + 1));
    return m;
  }, [activeIssues]);

  const countsBySeverity = useMemo(() => {
    const m: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    activeIssues.forEach((i) => (m[i.severity] = (m[i.severity] || 0) + 1));
    return m;
  }, [activeIssues]);

  const filtered = useMemo(() => {
    let list = activeIssues;
    if (checkFilter !== "all") list = list.filter((i) => i.check === checkFilter);
    if (tableFilter !== "all") list = list.filter((i) => i.table === tableFilter);
    if (severityFilter !== "all") list = list.filter((i) => i.severity === severityFilter);
    if (statusFilter !== "all") list = list.filter((i) => i.workflowStatus === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.detail.toLowerCase().includes(q) ||
          i.recordId.toLowerCase().includes(q) ||
          i.field.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeIssues, checkFilter, tableFilter, severityFilter, statusFilter, search]);

  const totalIssues = activeIssues.length;

  const handleExportCsv = useCallback(() => {
    exportCsv(filtered, `data-health-${tab}-${new Date().toISOString().substring(0, 10)}.csv`);
  }, [filtered, tab]);

  const handleResolve = useCallback((issue: UnifiedIssue, status: WorkflowStatus) => {
    if (!issue.id || !isPersisted) return;
    updateIssue({
      issueId: issue.id,
      updates: {
        workflow_status: status,
        resolution_note: resolutionNote || undefined,
      },
    });
    setSelectedIssue(null);
    setResolutionNote("");
  }, [updateIssue, isPersisted, resolutionNote]);

  const lastRun = runs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Data Health Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isPersisted
              ? `Persisted issues · ${totalIssues} active · Last scan: ${lastRun ? new Date(lastRun.started_at).toLocaleString() : "never"}`
              : `Session issues · ${snapshots.length} audit(s) · ${totalIssues} issue(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPersisted && (
            <Button variant="outline" size="sm" onClick={clear} disabled={totalIssues === 0} className="gap-2">
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          )}
          {isPersisted && (
            <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0} className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Severity summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["critical", "high", "medium", "low"] as const).map((sev) => {
          const cfg = SEVERITY_CONFIG[sev];
          const count = countsBySeverity[sev] || 0;
          const isActive = severityFilter === sev;
          return (
            <Card
              key={sev}
              className={`cursor-pointer transition-all hover:shadow-md border ${cfg.bgColor} ${
                isActive ? "ring-2 ring-primary" : count === 0 ? "opacity-50" : ""
              }`}
              onClick={() => setSeverityFilter(isActive ? "all" : sev)}
            >
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{count}</p>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>
                  </div>
                  <AlertCircle className={`h-5 w-5 ${cfg.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tab toggle */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="session" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Session
          </TabsTrigger>
          <TabsTrigger value="persisted" className="gap-1.5">
            <Database className="h-3.5 w-3.5" /> Persisted
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="mt-4 space-y-6">
          {totalIssues === 0 ? <ZeroState /> : (
            <IssuesView
              countsByCheck={countsByCheck} checkFilter={checkFilter} setCheckFilter={setCheckFilter}
              uniqueTables={uniqueTables} tableFilter={tableFilter} setTableFilter={setTableFilter}
              severityFilter={severityFilter} setSeverityFilter={setSeverityFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              search={search} setSearch={setSearch}
              filtered={filtered} totalIssues={totalIssues} isPersisted={isPersisted}
              onSelectIssue={setSelectedIssue}
            />
          )}
        </TabsContent>

        <TabsContent value="persisted" className="mt-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {trendData.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" /> Issue Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="found" name="Found" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="new" name="New" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="resolved" name="Resolved" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {lastRun && (
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="gap-1.5 py-1">
                    <Clock className="h-3 w-3" /> Last run: {new Date(lastRun.started_at).toLocaleString()}
                  </Badge>
                  <Badge variant="secondary">{lastRun.issues_found} found</Badge>
                  <Badge variant="secondary">{lastRun.issues_new} new</Badge>
                  <Badge variant="secondary">{lastRun.issues_resolved} resolved</Badge>
                  <Badge variant={lastRun.status === "completed" ? "default" : "destructive"}>{lastRun.status}</Badge>
                </div>
              )}

              {totalIssues === 0 ? <ZeroState persisted /> : (
                <IssuesView
                  countsByCheck={countsByCheck} checkFilter={checkFilter} setCheckFilter={setCheckFilter}
                  uniqueTables={uniqueTables} tableFilter={tableFilter} setTableFilter={setTableFilter}
                  severityFilter={severityFilter} setSeverityFilter={setSeverityFilter}
                  statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                  search={search} setSearch={setSearch}
                  filtered={filtered} totalIssues={totalIssues} isPersisted={isPersisted}
                  onSelectIssue={setSelectedIssue}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Issue detail dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={(o) => { if (!o) { setSelectedIssue(null); setResolutionNote(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIssue && CHECK_META[selectedIssue.check] && (
                <>
                  {(() => { const Icon = CHECK_META[selectedIssue.check].icon; return <Icon className="h-5 w-5" />; })()}
                  {CHECK_META[selectedIssue.check]?.label}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Severity</p>
                  <Badge className={`mt-1 ${SEVERITY_CONFIG[selectedIssue.severity]?.bgColor} ${SEVERITY_CONFIG[selectedIssue.severity]?.color} border`}>
                    {SEVERITY_CONFIG[selectedIssue.severity]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge className={`mt-1 ${WORKFLOW_CONFIG[selectedIssue.workflowStatus]?.color}`}>
                    {WORKFLOW_CONFIG[selectedIssue.workflowStatus]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Table</p>
                  <p className="font-mono text-xs mt-1">{selectedIssue.table}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Field</p>
                  <p className="font-mono text-xs mt-1">{selectedIssue.field}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Record ID</p>
                  <p className="font-mono text-xs mt-1 break-all">{selectedIssue.recordId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Detail</p>
                  <p className="text-xs mt-1">{selectedIssue.detail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Context</p>
                  <p className="text-xs mt-1">{selectedIssue.context}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Occurrences</p>
                  <p className="text-xs mt-1 tabular-nums">{selectedIssue.occurrences || 1}</p>
                </div>
              </div>

              {isPersisted && selectedIssue.id && selectedIssue.workflowStatus !== "resolved" && selectedIssue.workflowStatus !== "ignored" && (
                <>
                  <Textarea
                    placeholder="Resolution note (optional)…"
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={2}
                  />
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleResolve(selectedIssue, "investigating")}
                      disabled={isUpdating}
                    >
                      <Search className="h-3.5 w-3.5" /> Investigating
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleResolve(selectedIssue, "ignored")}
                      disabled={isUpdating}
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Ignore
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleResolve(selectedIssue, "resolved")}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ZeroState({ persisted }: { persisted?: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <ShieldCheck className="h-14 w-14 text-emerald-500" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">No issues detected</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            {persisted
              ? "No persisted issues found. The nightly audit will scan and populate data automatically."
              : "Issues are captured as you navigate the app. Visit reports, payment queues, or campaign pages to trigger data quality audits."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface IssuesViewProps {
  countsByCheck: Record<string, number>;
  checkFilter: string;
  setCheckFilter: (v: string) => void;
  uniqueTables: string[];
  tableFilter: string;
  setTableFilter: (v: string) => void;
  severityFilter: string;
  setSeverityFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  filtered: UnifiedIssue[];
  totalIssues: number;
  isPersisted: boolean;
  onSelectIssue: (issue: UnifiedIssue) => void;
}

function IssuesView({
  countsByCheck, checkFilter, setCheckFilter,
  uniqueTables, tableFilter, setTableFilter,
  severityFilter, setSeverityFilter,
  statusFilter, setStatusFilter,
  search, setSearch, filtered, totalIssues, isPersisted,
  onSelectIssue,
}: IssuesViewProps) {
  return (
    <>
      {/* Check-type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {ALL_CHECKS.map((check) => {
          const meta = CHECK_META[check];
          const Icon = meta.icon;
          const count = countsByCheck[check] || 0;
          return (
            <Card
              key={check}
              className={`cursor-pointer transition-all hover:shadow-md border ${
                checkFilter === check ? "ring-2 ring-primary" : count === 0 ? "opacity-50" : ""
              }`}
              onClick={() => setCheckFilter(checkFilter === check ? "all" : check)}
            >
              <CardContent className="pt-4 pb-3 px-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`rounded-md p-1.5 ${meta.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{meta.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search detail, field, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {uniqueTables.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {isPersisted && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
            </SelectContent>
          </Select>
        )}
        {(checkFilter !== "all" || tableFilter !== "all" || severityFilter !== "all" || statusFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setCheckFilter("all"); setTableFilter("all"); setSeverityFilter("all"); setStatusFilter("all"); setSearch(""); }}>
            Reset filters
          </Button>
        )}
        <Badge variant="secondary" className="ml-auto">
          {filtered.length} of {totalIssues} shown
        </Badge>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Issue Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Severity</TableHead>
                  <TableHead className="w-40">Check</TableHead>
                  <TableHead className="w-36">Source Table</TableHead>
                  <TableHead className="w-28">Field</TableHead>
                  <TableHead className="w-28">Record ID</TableHead>
                  <TableHead>Detail</TableHead>
                  {isPersisted && <TableHead className="w-28">Status</TableHead>}
                  {isPersisted && <TableHead className="w-16">Count</TableHead>}
                  <TableHead className="w-32">Time</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isPersisted ? 10 : 8} className="text-center py-8 text-muted-foreground">
                      No matching issues
                    </TableCell>
                  </TableRow>
                )}
                {filtered.slice(0, 500).map((issue, idx) => {
                  const meta = CHECK_META[issue.check];
                  const Icon = meta?.icon || AlertTriangle;
                  const sevCfg = SEVERITY_CONFIG[issue.severity];
                  const wfCfg = WORKFLOW_CONFIG[issue.workflowStatus];
                  return (
                    <TableRow
                      key={`${issue.recordId}-${issue.check}-${idx}`}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectIssue(issue)}
                    >
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${sevCfg?.bgColor} ${sevCfg?.color} border`}>
                          {sevCfg?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${meta?.color.split(" ")[0] || ""}`} />
                          <span className="text-xs">{meta?.label || issue.check}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{issue.table}</TableCell>
                      <TableCell className="text-xs">{issue.field}</TableCell>
                      <TableCell className="font-mono text-xs" title={issue.recordId}>
                        {issue.recordId.substring(0, 12)}{issue.recordId.length > 12 ? "…" : ""}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate" title={issue.detail}>{issue.detail}</TableCell>
                      {isPersisted && (
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${wfCfg?.color}`}>
                            {wfCfg?.label}
                          </Badge>
                        </TableCell>
                      )}
                      {isPersisted && (
                        <TableCell className="text-xs font-medium tabular-nums">{issue.occurrences}</TableCell>
                      )}
                      <TableCell className="text-xs text-muted-foreground">
                        {isPersisted
                          ? new Date(issue.time).toLocaleDateString()
                          : new Date(issue.time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 500 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Showing first 500 of {filtered.length} issues
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import { useState, useMemo, useCallback } from "react";
import { useAuditStore } from "@/hooks/useAuditStore";
import { usePersistedIssues, type PersistedIssue } from "@/hooks/usePersistedIssues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AuditCheckType } from "@/utils/dataQualityAudit";

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

const ALL_CHECKS = Object.keys(CHECK_META);

// Unified issue shape for rendering
interface UnifiedIssue {
  check: string;
  table: string;
  field: string;
  recordId: string;
  detail: string;
  context: string;
  time: string;
  occurrences?: number;
}

function exportCsv(rows: UnifiedIssue[], filename: string) {
  const header = "Check,Table,Field,Record ID,Detail,Context,Time,Occurrences\n";
  const body = rows
    .map(
      (r) =>
        `"${r.check}","${r.table}","${r.field}","${r.recordId}","${r.detail.replace(/"/g, '""')}","${r.context}","${r.time}","${r.occurrences || 1}"`
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

export default function DataHealthDashboard() {
  const { allIssues, snapshots, clear } = useAuditStore();
  const [tab, setTab] = useState<string>("session");
  const isPersisted = tab === "persisted";
  const { issues: persistedIssues, isLoading, trendData, runs, refetch } = usePersistedIssues(isPersisted);

  const [checkFilter, setCheckFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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
      })),
    [allIssues]
  );

  const persistedUnified: UnifiedIssue[] = useMemo(
    () =>
      persistedIssues.map((i: PersistedIssue) => ({
        check: i.issue_type,
        table: i.table_name,
        field: i.field_name,
        recordId: i.record_id,
        detail: i.detail || "",
        context: i.context || "nightly-audit",
        time: i.last_seen,
        occurrences: i.occurrences,
      })),
    [persistedIssues]
  );

  const activeIssues = isPersisted ? persistedUnified : sessionUnified;

  // Derive unique tables
  const uniqueTables = useMemo(
    () => [...new Set(activeIssues.map((i) => i.table))].sort(),
    [activeIssues]
  );

  // Counts per check type
  const countsByCheck = useMemo(() => {
    const m: Record<string, number> = {};
    ALL_CHECKS.forEach((c) => (m[c] = 0));
    activeIssues.forEach((i) => (m[i.check] = (m[i.check] || 0) + 1));
    return m;
  }, [activeIssues]);

  // Filtered issues
  const filtered = useMemo(() => {
    let list = activeIssues;
    if (checkFilter !== "all") list = list.filter((i) => i.check === checkFilter);
    if (tableFilter !== "all") list = list.filter((i) => i.table === tableFilter);
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
  }, [activeIssues, checkFilter, tableFilter, search]);

  const totalIssues = activeIssues.length;

  const handleExportCsv = useCallback(() => {
    exportCsv(filtered, `data-health-${tab}-${new Date().toISOString().substring(0, 10)}.csv`);
  }, [filtered, tab]);

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

      {/* Tab toggle */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="session" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Session
          </TabsTrigger>
          <TabsTrigger value="persisted" className="gap-1.5">
            <Database className="h-3.5 w-3.5" /> Persisted
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="mt-4 space-y-6">
          {totalIssues === 0 ? <ZeroState /> : <IssuesView {...{ countsByCheck, checkFilter, setCheckFilter, uniqueTables, tableFilter, setTableFilter, search, setSearch, filtered, totalIssues, isPersisted }} />}
        </TabsContent>

        <TabsContent value="persisted" className="mt-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Trend chart */}
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

              {/* Last run summary */}
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

              {totalIssues === 0 ? <ZeroState persisted /> : <IssuesView {...{ countsByCheck, checkFilter, setCheckFilter, uniqueTables, tableFilter, setTableFilter, search, setSearch, filtered, totalIssues, isPersisted }} />}
            </>
          )}
        </TabsContent>
      </Tabs>
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
  search: string;
  setSearch: (v: string) => void;
  filtered: UnifiedIssue[];
  totalIssues: number;
  isPersisted: boolean;
}

function IssuesView({
  countsByCheck, checkFilter, setCheckFilter,
  uniqueTables, tableFilter, setTableFilter,
  search, setSearch, filtered, totalIssues, isPersisted,
}: IssuesViewProps) {
  return (
    <>
      {/* Summary cards */}
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
              onClick={() => setCheckFilter((prev: string) => (prev === check ? "all" : check))}
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Tables" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {uniqueTables.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(checkFilter !== "all" || tableFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setCheckFilter("all"); setTableFilter("all"); setSearch(""); }}>
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
                  <TableHead className="w-40">Check</TableHead>
                  <TableHead className="w-44">Source Table</TableHead>
                  <TableHead className="w-36">Field</TableHead>
                  <TableHead className="w-32">Record ID</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="w-32">Context</TableHead>
                  {isPersisted && <TableHead className="w-20">Count</TableHead>}
                  <TableHead className="w-40">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isPersisted ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      No matching issues
                    </TableCell>
                  </TableRow>
                )}
                {filtered.slice(0, 500).map((issue, idx) => {
                  const meta = CHECK_META[issue.check];
                  const Icon = meta?.icon || AlertTriangle;
                  return (
                    <TableRow key={`${issue.recordId}-${issue.check}-${idx}`}>
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
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{issue.context}</Badge>
                      </TableCell>
                      {isPersisted && (
                        <TableCell className="text-xs font-medium tabular-nums">{issue.occurrences}</TableCell>
                      )}
                      <TableCell className="text-xs text-muted-foreground">
                        {isPersisted
                          ? new Date(issue.time).toLocaleDateString()
                          : new Date(issue.time).toLocaleTimeString()}
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

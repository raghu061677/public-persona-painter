import { useState, useMemo } from "react";
import { useAuditStore } from "@/hooks/useAuditStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import type { AuditCheckType, AuditIssue } from "@/utils/dataQualityAudit";

const CHECK_META: Record<
  AuditCheckType,
  { label: string; icon: React.ElementType; color: string }
> = {
  negative_money: {
    label: "Negative Money",
    icon: Ban,
    color: "text-red-600 bg-red-50 border-red-200",
  },
  invalid_status: {
    label: "Invalid Status",
    icon: AlertTriangle,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  orphan_reference: {
    label: "Orphan Reference",
    icon: Link2Off,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  missing_company_id: {
    label: "Missing Company ID",
    icon: Building2,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  inverted_date_range: {
    label: "Inverted Date Range",
    icon: CalendarX,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  booking_outside_campaign: {
    label: "Booking Outside Campaign",
    icon: CalendarRange,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  missing_identifier: {
    label: "Missing Identifier",
    icon: Tag,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
};

const ALL_CHECKS = Object.keys(CHECK_META) as AuditCheckType[];

export default function DataHealthDashboard() {
  const { allIssues, snapshots, clear } = useAuditStore();
  const [checkFilter, setCheckFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Derive unique tables
  const uniqueTables = useMemo(
    () => [...new Set(allIssues.map((i) => i.table))].sort(),
    [allIssues]
  );

  // Counts per check type
  const countsByCheck = useMemo(() => {
    const m: Record<string, number> = {};
    ALL_CHECKS.forEach((c) => (m[c] = 0));
    allIssues.forEach((i) => (m[i.check] = (m[i.check] || 0) + 1));
    return m;
  }, [allIssues]);

  // Filtered issues
  const filtered = useMemo(() => {
    let list = allIssues;
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
  }, [allIssues, checkFilter, tableFilter, search]);

  const totalIssues = allIssues.length;
  const totalSnapshots = snapshots.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Data Health Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Session-based data quality monitoring · {totalSnapshots} audit(s) captured
            · {totalIssues} issue(s) total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clear}
          disabled={totalIssues === 0}
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
      </div>

      {/* Zero-state */}
      {totalIssues === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <ShieldCheck className="h-14 w-14 text-emerald-500" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">No issues detected</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                Issues are captured as you navigate the app. Visit reports, payment queues,
                or campaign pages to trigger data quality audits.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {totalIssues > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {ALL_CHECKS.map((check) => {
              const meta = CHECK_META[check];
              const Icon = meta.icon;
              const count = countsByCheck[check] || 0;
              return (
                <Card
                  key={check}
                  className={`cursor-pointer transition-all hover:shadow-md border ${
                    checkFilter === check
                      ? "ring-2 ring-primary"
                      : count === 0
                      ? "opacity-50"
                      : ""
                  }`}
                  onClick={() =>
                    setCheckFilter((prev) => (prev === check ? "all" : check))
                  }
                >
                  <CardContent className="pt-4 pb-3 px-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`rounded-md p-1.5 ${meta.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{count}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {meta.label}
                    </p>
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
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(checkFilter !== "all" || tableFilter !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCheckFilter("all");
                  setTableFilter("all");
                  setSearch("");
                }}
              >
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
                      <TableHead className="w-40">Module</TableHead>
                      <TableHead className="w-40">Captured</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No matching issues
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.slice(0, 500).map((issue, idx) => {
                      const meta = CHECK_META[issue.check as AuditCheckType];
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
                            {issue.recordId.substring(0, 12)}…
                          </TableCell>
                          <TableCell className="text-xs max-w-xs truncate" title={issue.detail}>
                            {issue.detail}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {issue.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(issue.capturedAt).toLocaleTimeString()}
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
      )}
    </div>
  );
}

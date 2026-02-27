import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  Download,
  RotateCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ExcelJS from "exceljs";

/* ─── Types ─── */

export interface FinanceKpi {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Optional semantic color class for the value */
  valueClassName?: string;
  /** If set, clicking the card calls this */
  onClick?: () => void;
}

export interface FinanceColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right";
  cell: (row: T) => React.ReactNode;
  /** Used for Excel export — returns a primitive */
  exportValue?: (row: T) => string | number;
}

export interface FinanceModuleLayoutProps<T extends Record<string, any>> {
  /* Header */
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** Primary CTA */
  createLabel?: string;
  onCreateClick?: () => void;

  /* Data */
  data: T[];
  loading: boolean;
  error?: string | null;
  /** Unique key extractor */
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;

  /* KPIs */
  kpis: FinanceKpi[];

  /* Columns */
  columns: FinanceColumn<T>[];

  /* Filters */
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  statuses?: string[];
  statusAccessor?: (row: T) => string;
  /** Extra filter dropdowns rendered between status and reset */
  extraFilters?: React.ReactNode;

  /* Export */
  exportFileName?: string;

  /* Empty state */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
}

const PAGE_SIZES = [10, 20, 50, 100];

/** Debounce hook */
function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Skeleton row component */
function SkeletonRows({ columns, count = 5 }: { columns: number; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i} className={i % 2 === 0 ? "bg-muted/20" : ""}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <div
                className="h-4 bg-muted animate-pulse rounded"
                style={{ width: `${60 + Math.random() * 30}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function FinanceModuleLayout<T extends Record<string, any>>({
  title,
  subtitle,
  icon: Icon,
  createLabel,
  onCreateClick,
  data,
  loading,
  error,
  rowKey,
  onRowClick,
  kpis,
  columns,
  searchPlaceholder = "Search...",
  searchFields = [],
  statuses = [],
  statusAccessor,
  extraFilters,
  exportFileName,
  emptyIcon: EmptyIcon,
  emptyTitle = "No records found",
  emptyDescription = "Try adjusting your filters or create a new record",
}: FinanceModuleLayoutProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Reset page on filter change
  useEffect(() => setPage(1), [debouncedSearch, statusFilter]);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let result = [...data];

    // Search (debounced)
    if (debouncedSearch) {
      const t = debouncedSearch.toLowerCase();
      result = result.filter((row) =>
        searchFields.some((field) => {
          const val = row[field as string];
          return val && String(val).toLowerCase().includes(t);
        })
      );
    }

    // Status
    if (statusFilter !== "all" && statusAccessor) {
      result = result.filter(
        (row) => statusAccessor(row)?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aV = a[sortField];
        const bV = b[sortField];
        if (aV == null && bV == null) return 0;
        if (aV == null) return 1;
        if (bV == null) return -1;
        if (typeof aV === "number" && typeof bV === "number")
          return sortDir === "asc" ? aV - bV : bV - aV;
        const cmp = String(aV).localeCompare(String(bV));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, debouncedSearch, statusFilter, sortField, sortDir, searchFields, statusAccessor]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  /* ── Sorting ── */
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  const sortIcon = (field: string) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  /* ── Export ── */
  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(title);
    ws.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: 20,
    }));
    ws.getRow(1).font = { bold: true };
    filtered.forEach((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((c) => {
        obj[c.key] = c.exportValue ? c.exportValue(row) : row[c.key] ?? "";
      });
      ws.addRow(obj);
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFileName || title.replace(/\s/g, "_")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortField(null);
  };

  const DisplayEmptyIcon = EmptyIcon || Icon;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Icon className="h-6 w-6" />
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download className="h-4 w-4 mr-1" />
            Export Excel
          </Button>
          {createLabel && onCreateClick && (
            <Button onClick={onCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Widgets ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                  <div className="h-7 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi) => {
              const KpiIcon = kpi.icon;
              return (
                <Card
                  key={kpi.label}
                  className={
                    kpi.onClick
                      ? "cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
                      : "transition-shadow"
                  }
                  onClick={kpi.onClick}
                >
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                      <KpiIcon className="h-3.5 w-3.5" />
                      {kpi.label}
                    </div>
                    <p className={`text-2xl font-bold ${kpi.valueClassName || ""}`}>
                      {kpi.value}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* ── Error State ── */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center p-3 bg-card border rounded-lg">
        <div className="relative flex-1 min-w-[200px] max-w-full sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-[16px] sm:text-sm"
          />
        </div>

        {statuses.length > 0 && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {extraFilters}

        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      </div>

      {/* ── Data Table ── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="border-b-2 border-border/60 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={`font-semibold text-xs uppercase tracking-wider whitespace-nowrap ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 hover:bg-background/60"
                        onClick={() => handleSort(col.key)}
                      >
                        {col.header}
                        {sortIcon(col.key)}
                      </Button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows columns={columns.length} count={pageSize > 10 ? 8 : 5} />
              ) : paginated.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="text-center py-16">
                    <DisplayEmptyIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">{emptyTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : emptyDescription}
                    </p>
                    {createLabel &&
                      onCreateClick &&
                      !searchTerm &&
                      statusFilter === "all" && (
                        <Button className="mt-4" onClick={onCreateClick}>
                          <Plus className="mr-2 h-4 w-4" />
                          {createLabel}
                        </Button>
                      )}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row, idx) => (
                  <TableRow
                    key={rowKey(row)}
                    className={`
                      ${idx % 2 === 0 ? "bg-transparent" : "bg-muted/30"}
                      ${onRowClick ? "cursor-pointer" : ""}
                      hover:bg-primary/5 transition-colors
                    `}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        className={`whitespace-nowrap ${col.align === "right" ? "text-right tabular-nums" : ""}`}
                      >
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

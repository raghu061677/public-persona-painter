import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  MapPin,
  Building2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { ReportControls, ReportKPICards, ReportEmptyState, ReportExportMenu } from "@/components/reports";
import { useReportFilters } from "@/hooks/useReportFilters";
import { usePagination } from "@/hooks/usePagination";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";

// ---------- types ----------
interface CampaignAssetRow {
  asset_code: string;
  media_type: string;
  city: string;
  area: string;
  location: string;
  dimensions: string;
  illumination: string;
  direction: string;
}

interface CampaignSummaryRow {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  assets_booked: number;
  cities_text: string;
  campaign_status: string;
  assets: CampaignAssetRow[];
}

// ---------- helpers ----------
function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function diffDays(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0);
  return { start, end };
}

const DATE_TYPES = [
  { value: "overlap", label: "Overlapping Month" },
];

const SORT_OPTIONS = [
  { value: "campaign_name", label: "Campaign Name" },
  { value: "client_name", label: "Client Name" },
  { value: "start_date", label: "Start Date" },
  { value: "end_date", label: "End Date" },
  { value: "duration_days", label: "Duration" },
  { value: "assets_booked", label: "Assets Booked" },
];

const COLUMNS = [
  { key: "campaign_name", label: "Campaign Name", default: true },
  { key: "client_name", label: "Client", default: true },
  { key: "start_date", label: "Start Date", default: true },
  { key: "end_date", label: "End Date", default: true },
  { key: "duration_days", label: "Duration (Days)", default: true },
  { key: "assets_booked", label: "Assets Booked", default: true },
  { key: "cities_text", label: "Cities", default: true },
  { key: "campaign_status", label: "Status", default: true },
];

const STORAGE_KEY = "report.monthlyCampaigns.visibleColumns";
const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.default).map((c) => c.key);

// ---------- component ----------
export default function ReportMonthlyCampaigns() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CampaignSummaryRow[]>([]);
  const [monthKey, setMonthKey] = useState(() => searchParams.get("month") || currentMonthKey());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const {
    dateType, setDateType,
    dateRange, setDateRange,
    searchValue, setSearchValue,
    selectedFilters, handleFilterChange,
    sortConfig, setSortConfig,
    resetFilters, hasActiveFilters,
  } = useReportFilters({
    defaultDateType: "overlap",
    defaultSortField: "start_date",
    defaultSortDirection: "desc",
    reportKey: "monthly-campaigns-report",
  });

  // Init status from query param
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) {
      handleFilterChange("statuses", [statusParam]);
    }
  }, []); // only on mount

  const [visibleColumns, setVisibleColumnsRaw] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_VISIBLE;
  });

  const setVisibleColumns = useCallback((cols: string[]) => {
    setVisibleColumnsRaw(cols);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)); } catch {}
  }, []);

  // Sync month picker to dateRange for ReportControls
  useEffect(() => {
    const { start, end } = getMonthRange(monthKey);
    setDateRange({ from: start, to: end });
  }, [monthKey]);

  // ---------- load ----------
  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { start, end } = getMonthRange(monthKey);
      const startISO = start.toISOString().split("T")[0];
      const endISO = end.toISOString().split("T")[0];

      const { data: campData, error: campError } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name, start_date, end_date, status")
        .eq("company_id", company.id)
        .lte("start_date", endISO)
        .gte("end_date", startISO);

      if (campError) throw campError;
      if (!campData || campData.length === 0) { setData([]); return; }

      const campIds = campData.map((c: any) => c.id);
      let allCA: any[] = [];
      for (let i = 0; i < campIds.length; i += 100) {
        const chunk = campIds.slice(i, i + 100);
        const { data: caData } = await supabase
          .from("campaign_assets")
          .select("campaign_id, asset_id, media_type, city, area, location, dimensions, illumination_type, direction, total_sqft")
          .in("campaign_id", chunk);
        if (caData) allCA.push(...caData);
      }

      const assetIds = [...new Set(allCA.map((r: any) => r.asset_id))];
      const codeMap = new Map<string, string>();
      const detailMap = new Map<string, any>();
      for (let i = 0; i < assetIds.length; i += 100) {
        const chunk = assetIds.slice(i, i + 100);
        const { data: maData } = await supabase
          .from("media_assets")
          .select("id, media_asset_code, direction, facing, dimensions, dimension, illumination_type, illumination, total_sqft")
          .in("id", chunk);
        maData?.forEach((m: any) => {
          codeMap.set(m.id, m.media_asset_code || `ASSET-${m.id.replace(/-/g, '').slice(-6).toUpperCase()}`);
          detailMap.set(m.id, {
            direction: m.direction || m.facing || "-",
            dimensions: m.dimensions || m.dimension || "-",
            illumination_type: m.illumination_type || m.illumination || "-",
          });
        });
      }

      const assetsByCamp = new Map<string, CampaignAssetRow[]>();
      allCA.forEach((r: any) => {
        const arr = assetsByCamp.get(r.campaign_id) || [];
        const d = detailMap.get(r.asset_id);
        arr.push({
          asset_code: codeMap.get(r.asset_id) || `ASSET-${r.asset_id.replace(/-/g, '').slice(-6).toUpperCase()}`,
          media_type: r.media_type || "-",
          city: r.city || "-",
          area: r.area || "-",
          location: r.location || "-",
          dimensions: r.dimensions || d?.dimensions || "-",
          illumination: r.illumination_type || d?.illumination_type || "-",
          direction: r.direction || d?.direction || "-",
        });
        assetsByCamp.set(r.campaign_id, arr);
      });

      const rows: CampaignSummaryRow[] = campData.map((c: any) => {
        const assets = assetsByCamp.get(c.id) || [];
        const cities = [...new Set(assets.map((a) => a.city).filter((x) => x !== "-"))];
        return {
          campaign_id: c.id,
          campaign_name: c.campaign_name || "-",
          client_name: c.client_name || "-",
          start_date: c.start_date,
          end_date: c.end_date,
          duration_days: diffDays(c.start_date, c.end_date),
          assets_booked: assets.length,
          cities_text: cities.join(", ") || "-",
          campaign_status: c.status || "-",
          assets,
        };
      });

      setData(rows);
    } catch (error: any) {
      console.error("Error loading monthly campaigns:", error);
      toast({ title: "Error", description: error.message || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [company?.id, monthKey, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- filter options ----------
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const mediaTypes = new Set<string>();
    const statuses = new Set<string>();
    const clients = new Set<string>();
    data.forEach((r) => {
      r.assets.forEach((a) => {
        if (a.city !== "-") cities.add(a.city);
        if (a.media_type !== "-") mediaTypes.add(a.media_type);
      });
      statuses.add(r.campaign_status);
      if (r.client_name !== "-") clients.add(r.client_name);
    });
    return {
      cities: Array.from(cities).sort().map((c) => ({ value: c, label: c })),
      mediaTypes: Array.from(mediaTypes).sort().map((t) => ({ value: t, label: t })),
      statuses: Array.from(statuses).sort().map((s) => ({ value: s, label: s })),
      clients: Array.from(clients).sort().map((c) => ({ value: c, label: c })),
    };
  }, [data]);

  // ---------- filtered + sorted ----------
  const filteredData = useMemo(() => {
    let result = [...data];
    if (selectedFilters.statuses.length > 0) {
      result = result.filter((r) => selectedFilters.statuses.includes(r.campaign_status));
    }
    if (selectedFilters.cities.length > 0) {
      result = result.filter((r) => r.assets.some((a) => selectedFilters.cities.includes(a.city)));
    }
    if (selectedFilters.mediaTypes.length > 0) {
      result = result.filter((r) => r.assets.some((a) => selectedFilters.mediaTypes.includes(a.media_type)));
    }
    if (selectedFilters.clients.length > 0) {
      result = result.filter((r) => selectedFilters.clients.includes(r.client_name));
    }
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (r) =>
          r.campaign_name.toLowerCase().includes(term) ||
          r.client_name.toLowerCase().includes(term) ||
          r.cities_text.toLowerCase().includes(term)
      );
    }
    result.sort((a, b) => {
      const key = sortConfig.field as keyof CampaignSummaryRow;
      const aVal = a[key]; const bVal = b[key];
      if (key === "start_date" || key === "end_date") {
        const diff = new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
        return sortConfig.direction === "asc" ? diff : -diff;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, selectedFilters, searchValue, sortConfig]);

  const pagination = usePagination(filteredData, { initialPageSize: 50 });

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const totalAssets = filteredData.reduce((s, r) => s + r.assets_booked, 0);
    const uniqueClients = new Set(filteredData.map((r) => r.client_name)).size;
    const allCities = new Set(filteredData.flatMap((r) => r.assets.map((a) => a.city).filter((x) => x !== "-")));
    const avgDuration = filteredData.length > 0
      ? Math.round(filteredData.reduce((s, r) => s + r.duration_days, 0) / filteredData.length) : 0;
    return [
      { label: "Campaigns", value: filteredData.length, icon: <Briefcase className="h-5 w-5" />, color: 'info' as const },
      { label: "Total Booked Assets", value: totalAssets, icon: <Building2 className="h-5 w-5" />, color: 'success' as const },
      { label: "Clients", value: uniqueClients, icon: <Users className="h-5 w-5" />, color: 'warning' as const },
      { label: "Cities", value: allCities.size, icon: <MapPin className="h-5 w-5" />, color: 'danger' as const },
      { label: "Avg Duration", value: `${avgDuration} days`, icon: <CalendarDays className="h-5 w-5" />, color: 'default' as const },
    ];
  }, [filteredData]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "InProgress": case "Running": case "Active":
        return <Badge variant="default">{status}</Badge>;
      case "Completed":
        return <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">{status}</Badge>;
      case "Planned": case "Upcoming":
        return <Badge variant="secondary">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ---------- month nav ----------
  const prevMonth = () => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const [y, m] = monthKey.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonthKey(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = (() => {
    const [y, m] = monthKey.split("-").map(Number);
    return new Date(y, m - 1).toLocaleString("default", { month: "long", year: "numeric" });
  })();

  // ---------- export ----------
  const handleExportExcel = async () => {
    const cols = COLUMNS.filter((c) => visibleColumns.includes(c.key));
    try {
      await exportListExcel({
        branding: {
          companyName: company?.name || "GO-ADS 360°",
          title: `Monthly Campaign Report – ${monthLabel}`,
          logoUrl: company?.logo_url || undefined,
        },
        fields: cols.map((c) => ({
          key: c.key,
          label: c.label,
          width: c.key === "campaign_name" || c.key === "cities_text" ? 28 : 18,
          type: (c.key === "duration_days" || c.key === "assets_booked" ? "number" : c.key === "start_date" || c.key === "end_date" ? "date" : "text") as any,
          value: c.key === "start_date" ? (r: CampaignSummaryRow) => formatDateDDMMYYYY(r.start_date)
            : c.key === "end_date" ? (r: CampaignSummaryRow) => formatDateDDMMYYYY(r.end_date) : undefined,
        })),
        rows: filteredData,
        rowStyleRules: [
          { when: (r: CampaignSummaryRow) => r.campaign_status === "Completed", fill: { argb: "FFD1FAE5" } },
          { when: (r: CampaignSummaryRow) => r.campaign_status === "Cancelled", fill: { argb: "FFFEE2E2" } },
        ],
        fileName: `Monthly_Campaign_Report_${monthKey}.xlsx`,
      });
      toast({ title: "Export Complete", description: `Exported ${filteredData.length} campaigns.` });
    } catch (err) {
      console.error("Excel export error:", err);
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const getCellValue = (row: CampaignSummaryRow, key: string): React.ReactNode => {
    switch (key) {
      case "start_date": return formatDateDDMMYYYY(row.start_date);
      case "end_date": return formatDateDDMMYYYY(row.end_date);
      case "duration_days": return `${row.duration_days} days`;
      case "campaign_status": return getStatusBadge(row.campaign_status);
      default: return (row as any)[key] ?? "-";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Campaign Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Campaigns running in a selected month with booked asset count and drilldown
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Month picker */}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
            <ChevronDown className="h-4 w-4 rotate-90" />
          </Button>
          <Input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="h-9 w-44" />
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </Button>
          <ReportExportMenu
            onExportExcel={handleExportExcel}
            onExportPDF={async () => {}}
            metadata={{ reportName: "Monthly Campaign Report", generatedAt: new Date(), filtersApplied: [], companyName: company?.name }}
            disabled={filteredData.length === 0}
          />
        </div>
      </div>

      <ReportControls
        reportKey="monthly-campaigns-report"
        dateTypes={DATE_TYPES}
        selectedDateType={dateType}
        onDateTypeChange={setDateType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search campaign, client, city..."
        filters={filterOptions}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        sortOptions={SORT_OPTIONS}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        onReset={() => { resetFilters(); setMonthKey(currentMonthKey()); }}
        onApply={loadData}
      />

      <ReportKPICards kpis={kpis} columns={5} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filteredData.length === 0 ? (
        <ReportEmptyState title="No Campaigns Found" description={`No campaigns overlap with ${monthLabel}. Try a different month.`} />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.data.map((row) => {
                const isExpanded = expandedRows.has(row.campaign_id);
                return (
                  <Collapsible key={row.campaign_id} asChild open={isExpanded} onOpenChange={() => toggleRow(row.campaign_id)}>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="px-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                            <TableCell key={col.key} className={col.key === "duration_days" || col.key === "assets_booked" ? "text-right" : ""}>
                              {getCellValue(row, col.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={visibleColumns.length + 1} className="p-0">
                            {row.assets.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground">No assets linked.</p>
                            ) : (
                              <div className="p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Asset Code</TableHead>
                                      <TableHead>Media Type</TableHead>
                                      <TableHead>City</TableHead>
                                      <TableHead>Area</TableHead>
                                      <TableHead>Location</TableHead>
                                      <TableHead>Size</TableHead>
                                      <TableHead>Illumination</TableHead>
                                      <TableHead>Facing</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {row.assets.map((a, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell className="font-mono text-xs">{a.asset_code}</TableCell>
                                        <TableCell>{a.media_type}</TableCell>
                                        <TableCell>{a.city}</TableCell>
                                        <TableCell>{a.area}</TableCell>
                                        <TableCell>{a.location}</TableCell>
                                        <TableCell>{a.dimensions}</TableCell>
                                        <TableCell>{a.illumination}</TableCell>
                                        <TableCell>{a.direction}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={pagination.previousPage} disabled={!pagination.hasPreviousPage}>Previous</Button>
                <Button variant="outline" size="sm" onClick={pagination.nextPage} disabled={!pagination.hasNextPage}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

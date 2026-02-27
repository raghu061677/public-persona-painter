import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Briefcase,
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { DateRange } from "react-day-picker";
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
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { ReportControls, ReportKPICards, ReportEmptyState, ReportExportMenu } from "@/components/reports";
import { useReportFilters } from "@/hooks/useReportFilters";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";
import ExcelJS from "exceljs";

// ---------- types ----------
interface AssetRow {
  asset_code: string;
  media_type: string;
  city: string;
  area: string;
  location: string;
  dimensions: string;
  illumination: string;
  direction: string;
}

interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  asset_count: number;
  status: string;
  assets: AssetRow[];
}

interface ClientSummaryRow {
  client_id: string;
  client_name: string;
  total_campaigns: number;
  total_assets: number;
  first_booking: string;
  last_booking: string;
  cities_text: string;
  campaigns: CampaignRow[];
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

function defaultDateRange(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { from, to: now };
}

const DATE_TYPES = [
  { value: "overlap", label: "Overlapping Range" },
];

const SORT_OPTIONS = [
  { value: "client_name", label: "Client Name" },
  { value: "total_campaigns", label: "Total Campaigns" },
  { value: "total_assets", label: "Total Assets" },
  { value: "first_booking", label: "First Booking" },
  { value: "last_booking", label: "Last Booking" },
];

const COLUMNS = [
  { key: "client_name", label: "Client Name", default: true },
  { key: "total_campaigns", label: "Campaigns", default: true },
  { key: "total_assets", label: "Assets Booked", default: true },
  { key: "first_booking", label: "First Booking", default: true },
  { key: "last_booking", label: "Last Booking", default: true },
  { key: "cities_text", label: "Cities", default: true },
];

const STORAGE_KEY = "report.clientBookings.visibleColumns";
const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.default).map((c) => c.key);

// ---------- component ----------
export default function ReportClientBookings() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ClientSummaryRow[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const {
    dateType, setDateType,
    dateRange, setDateRange,
    searchValue, setSearchValue,
    selectedFilters, handleFilterChange,
    sortConfig, setSortConfig,
    resetFilters: resetBase,
    hasActiveFilters,
  } = useReportFilters({
    defaultDateType: "overlap",
    defaultSortField: "total_assets",
    defaultSortDirection: "desc",
    reportKey: "client-bookings-report",
  });

  // Init from URL on mount
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam) handleFilterChange("statuses", [statusParam]);
  }, []);

  const [visibleColumns, setVisibleColumnsRaw] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) { const p = JSON.parse(stored); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return DEFAULT_VISIBLE;
  });

  const setVisibleColumns = useCallback((cols: string[]) => {
    setVisibleColumnsRaw(cols);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cols)); } catch {}
  }, []);

  // ---------- load ----------
  const loadData = useCallback(async () => {
    if (!company?.id || !dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    try {
      const rangeStart = dateRange.from.toISOString().split("T")[0];
      const rangeEnd = dateRange.to.toISOString().split("T")[0];

      let query = supabase
        .from("campaigns")
        .select("id, campaign_name, client_id, client_name, start_date, end_date, status")
        .eq("company_id", company.id)
        .lte("start_date", rangeEnd)
        .gte("end_date", rangeStart);

      const { data: campData, error: campError } = await query;
      if (campError) throw campError;
      if (!campData || campData.length === 0) { setData([]); return; }

      const campIds = campData.map((c: any) => c.id);
      let allCA: any[] = [];
      for (let i = 0; i < campIds.length; i += 100) {
        const chunk = campIds.slice(i, i + 100);
        const { data: caData } = await supabase
          .from("campaign_assets")
          .select("campaign_id, asset_id, media_type, city, area, location, dimensions, illumination_type, direction")
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
          .select("id, media_asset_code, direction, dimensions, illumination_type")
          .in("id", chunk);
        maData?.forEach((m: any) => {
          codeMap.set(m.id, m.media_asset_code || `ASSET-${m.id.replace(/-/g, '').slice(-6).toUpperCase()}`);
          detailMap.set(m.id, { direction: m.direction || "-", dimensions: m.dimensions || "-", illumination_type: m.illumination_type || "-" });
        });
      }

      const assetsByCamp = new Map<string, AssetRow[]>();
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

      const clientMap = new Map<string, ClientSummaryRow>();
      campData.forEach((c: any) => {
        const assets = assetsByCamp.get(c.id) || [];
        const campRow: CampaignRow = {
          campaign_id: c.id,
          campaign_name: c.campaign_name || "-",
          start_date: c.start_date,
          end_date: c.end_date,
          duration_days: diffDays(c.start_date, c.end_date),
          asset_count: assets.length,
          status: c.status || "-",
          assets,
        };
        const clientKey = c.client_id || c.client_name || "unknown";
        const existing = clientMap.get(clientKey);
        if (existing) {
          existing.campaigns.push(campRow);
          existing.total_campaigns += 1;
          existing.total_assets += assets.length;
          if (c.start_date < existing.first_booking) existing.first_booking = c.start_date;
          if (c.end_date > existing.last_booking) existing.last_booking = c.end_date;
          const newCities = new Set([...existing.cities_text.split(", ").filter(Boolean), ...assets.map((a) => a.city).filter((x) => x !== "-")]);
          existing.cities_text = Array.from(newCities).join(", ");
        } else {
          const cities = [...new Set(assets.map((a) => a.city).filter((x) => x !== "-"))];
          clientMap.set(clientKey, {
            client_id: clientKey,
            client_name: c.client_name || "-",
            total_campaigns: 1,
            total_assets: assets.length,
            first_booking: c.start_date,
            last_booking: c.end_date,
            cities_text: cities.join(", ") || "-",
            campaigns: [campRow],
          });
        }
      });

      setData(Array.from(clientMap.values()).sort((a, b) => b.total_assets - a.total_assets));
    } catch (error: any) {
      console.error("Error loading client bookings:", error);
      toast({ title: "Error", description: error.message || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---------- filter options ----------
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const statuses = new Set<string>();
    const clients = new Set<string>();
    data.forEach((r) => {
      if (r.client_name !== "-") clients.add(r.client_name);
      r.campaigns.forEach((c) => {
        statuses.add(c.status);
        c.assets.forEach((a) => { if (a.city !== "-") cities.add(a.city); });
      });
    });
    return {
      cities: Array.from(cities).sort().map((c) => ({ value: c, label: c })),
      statuses: Array.from(statuses).sort().map((s) => ({ value: s, label: s })),
      clients: Array.from(clients).sort().map((c) => ({ value: c, label: c })),
    };
  }, [data]);

  // ---------- filtered + sorted ----------
  const filteredData = useMemo(() => {
    let result = [...data];
    if (selectedFilters.statuses.length > 0) {
      result = result.filter((r) => r.campaigns.some((c) => selectedFilters.statuses.includes(c.status)));
    }
    if (selectedFilters.cities.length > 0) {
      result = result.filter((r) => r.campaigns.some((c) => c.assets.some((a) => selectedFilters.cities.includes(a.city))));
    }
    if (selectedFilters.clients.length > 0) {
      result = result.filter((r) => selectedFilters.clients.includes(r.client_name));
    }
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (r) =>
          r.client_name.toLowerCase().includes(term) ||
          r.cities_text.toLowerCase().includes(term) ||
          r.campaigns.some((c) => c.campaign_name.toLowerCase().includes(term))
      );
    }
    result.sort((a, b) => {
      const key = sortConfig.field as keyof ClientSummaryRow;
      const aVal = a[key]; const bVal = b[key];
      if (key === "first_booking" || key === "last_booking") {
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

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const totalAssets = filteredData.reduce((s, r) => s + r.total_assets, 0);
    const totalCampaigns = filteredData.reduce((s, r) => s + r.total_campaigns, 0);
    const uniqueCities = new Set(filteredData.flatMap((r) => r.cities_text.split(", ").filter(Boolean))).size;
    return [
      { label: "Total Clients", value: filteredData.length, icon: <Users className="h-5 w-5" /> },
      { label: "Total Campaigns", value: totalCampaigns, icon: <Briefcase className="h-5 w-5" /> },
      { label: "Total Assets Booked", value: totalAssets, icon: <Building2 className="h-5 w-5" /> },
      { label: "Cities Covered", value: uniqueCities, icon: <MapPin className="h-5 w-5" /> },
    ];
  }, [filteredData]);

  const toggleClient = (id: string) => {
    setExpandedClients((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
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

  // ---------- export ----------
  const handleExportExcel = async () => {
    const cols = COLUMNS.filter((c) => visibleColumns.includes(c.key));
    try {
      // Summary sheet via branded engine
      await exportListExcel({
        branding: {
          companyName: company?.name || "GO-ADS 360°",
          title: "Client-wise Booking Report",
          subtitle: dateRange?.from && dateRange?.to
            ? `${formatDateDDMMYYYY(dateRange.from.toISOString())} – ${formatDateDDMMYYYY(dateRange.to.toISOString())}`
            : undefined,
          logoUrl: company?.logo_url || undefined,
        },
        fields: cols.map((c) => ({
          key: c.key,
          label: c.label,
          width: c.key === "client_name" || c.key === "cities_text" ? 28 : 18,
          type: (c.key === "total_campaigns" || c.key === "total_assets" ? "number"
            : c.key === "first_booking" || c.key === "last_booking" ? "date" : "text") as any,
          value: c.key === "first_booking" ? (r: ClientSummaryRow) => formatDateDDMMYYYY(r.first_booking)
            : c.key === "last_booking" ? (r: ClientSummaryRow) => formatDateDDMMYYYY(r.last_booking) : undefined,
        })),
        rows: filteredData,
        fileName: `Client_Bookings_Report.xlsx`,
      });
      toast({ title: "Export Complete", description: `Exported ${filteredData.length} clients.` });
    } catch (err) {
      console.error("Excel export error:", err);
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  const resetFilters = () => {
    resetBase();
    setDateRange(defaultDateRange());
  };

  const getCellValue = (row: ClientSummaryRow, key: string): React.ReactNode => {
    switch (key) {
      case "first_booking": return (
        <div className="flex items-center gap-1 text-sm">
          <CalendarDays className="h-3 w-3 text-muted-foreground" />
          {formatDateDDMMYYYY(row.first_booking)}
        </div>
      );
      case "last_booking": return (
        <div className="flex items-center gap-1 text-sm">
          <CalendarDays className="h-3 w-3 text-muted-foreground" />
          {formatDateDDMMYYYY(row.last_booking)}
        </div>
      );
      default: return (row as any)[key] ?? "-";
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client-wise Booking Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analyze bookings grouped by client with campaign and asset drilldown
          </p>
        </div>
        <ReportExportMenu
          onExportExcel={handleExportExcel}
          onExportPDF={async () => {}}
          metadata={{
            reportName: "Client-wise Booking Report",
            generatedAt: new Date(),
            dateRange: dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined,
            filtersApplied: [],
            companyName: company?.name,
          }}
          disabled={filteredData.length === 0}
        />
      </div>

      <ReportControls
        reportKey="client-bookings-report"
        dateTypes={DATE_TYPES}
        selectedDateType={dateType}
        onDateTypeChange={setDateType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search client, campaign, city..."
        filters={filterOptions}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        sortOptions={SORT_OPTIONS}
        sortConfig={sortConfig}
        onSortChange={setSortConfig}
        columns={COLUMNS}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
        onReset={resetFilters}
        onApply={loadData}
      />

      <ReportKPICards kpis={kpis} columns={4} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filteredData.length === 0 ? (
        <ReportEmptyState title="No Client Bookings Found" description="No campaigns overlap with the selected date range." onClearFilters={resetFilters} />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                  <TableHead key={col.key} className={col.key === "total_campaigns" || col.key === "total_assets" ? "text-right" : ""}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((client) => {
                const isClientExpanded = expandedClients.has(client.client_id);
                return (
                  <Collapsible key={client.client_id} asChild open={isClientExpanded} onOpenChange={() => toggleClient(client.client_id)}>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50 font-medium">
                          <TableCell className="px-2">
                            {isClientExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                            <TableCell key={col.key} className={col.key === "total_campaigns" || col.key === "total_assets" ? "text-right" : ""}>
                              {getCellValue(client, col.key)}
                            </TableCell>
                          ))}
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={visibleColumns.length + 1} className="p-0">
                            <div className="px-6 py-3">
                              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Campaigns for {client.client_name}</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-6" />
                                    <TableHead>Campaign Name</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead className="text-right">Duration</TableHead>
                                    <TableHead className="text-right">Assets</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {client.campaigns.map((camp) => {
                                    const isCampExpanded = expandedCampaigns.has(camp.campaign_id);
                                    return (
                                      <Collapsible key={camp.campaign_id} asChild open={isCampExpanded} onOpenChange={() => toggleCampaign(camp.campaign_id)}>
                                        <>
                                          <CollapsibleTrigger asChild>
                                            <TableRow className="cursor-pointer hover:bg-muted/30">
                                              <TableCell className="px-1">
                                                {camp.assets.length > 0 && (isCampExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                                              </TableCell>
                                              <TableCell className="font-medium">{camp.campaign_name}</TableCell>
                                              <TableCell>{formatDateDDMMYYYY(camp.start_date)}</TableCell>
                                              <TableCell>{formatDateDDMMYYYY(camp.end_date)}</TableCell>
                                              <TableCell className="text-right">{camp.duration_days} days</TableCell>
                                              <TableCell className="text-right">{camp.asset_count}</TableCell>
                                              <TableCell>{getStatusBadge(camp.status)}</TableCell>
                                            </TableRow>
                                          </CollapsibleTrigger>
                                          {camp.assets.length > 0 && (
                                            <CollapsibleContent asChild>
                                              <TableRow className="bg-muted/10">
                                                <TableCell colSpan={7} className="p-0">
                                                  <div className="px-6 py-2">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow>
                                                          <TableHead>Asset Code</TableHead>
                                                          <TableHead>Media Type</TableHead>
                                                          <TableHead>City</TableHead>
                                                          <TableHead>Area</TableHead>
                                                          <TableHead>Location</TableHead>
                                                          <TableHead>Dimensions</TableHead>
                                                          <TableHead>Illumination</TableHead>
                                                          <TableHead>Direction</TableHead>
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {camp.assets.map((asset, idx) => (
                                                          <TableRow key={idx} className="text-sm">
                                                            <TableCell className="font-mono text-xs">{asset.asset_code}</TableCell>
                                                            <TableCell>{asset.media_type}</TableCell>
                                                            <TableCell>{asset.city}</TableCell>
                                                            <TableCell>{asset.area}</TableCell>
                                                            <TableCell>{asset.location}</TableCell>
                                                            <TableCell>{asset.dimensions}</TableCell>
                                                            <TableCell>{asset.illumination}</TableCell>
                                                            <TableCell>{asset.direction}</TableCell>
                                                          </TableRow>
                                                        ))}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            </CollapsibleContent>
                                          )}
                                        </>
                                      </Collapsible>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

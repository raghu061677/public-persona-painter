import { useEffect, useState, useMemo, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { ReportKPICards, ReportEmptyState, ReportExportMenu } from "@/components/reports";
import { usePagination } from "@/hooks/usePagination";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ExcelJS from "exceljs";

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
  cities: string[];
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

function getMonthRange(monthKey: string): { start: Date; end: Date } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0); // last day
  return { start, end };
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "InProgress", label: "Active / In Progress" },
  { value: "Planned", label: "Planned" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

// ---------- component ----------
export default function ReportMonthlyCampaigns() {
  const { company } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CampaignSummaryRow[]>([]);
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ---------- load ----------
  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { start, end } = getMonthRange(monthKey);
      const startISO = start.toISOString().split("T")[0];
      const endISO = end.toISOString().split("T")[0];

      // Fetch campaigns overlapping the selected month
      const { data: campData, error: campError } = await supabase
        .from("campaigns")
        .select("id, campaign_name, client_name, start_date, end_date, status")
        .eq("company_id", company.id)
        .lte("start_date", endISO)
        .gte("end_date", startISO);

      if (campError) throw campError;

      if (!campData || campData.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const campIds = campData.map((c: any) => c.id);

      // Fetch campaign_assets for these campaigns (batch 100)
      let allCA: any[] = [];
      for (let i = 0; i < campIds.length; i += 100) {
        const chunk = campIds.slice(i, i + 100);
        const { data: caData } = await supabase
          .from("campaign_assets")
          .select("campaign_id, asset_id, media_type, city, area, location, dimensions, illumination_type, direction")
          .in("campaign_id", chunk);
        if (caData) allCA.push(...caData);
      }

      // Fetch asset codes
      const assetIds = [...new Set(allCA.map((r: any) => r.asset_id))];
      const codeMap = new Map<string, string>();
      for (let i = 0; i < assetIds.length; i += 100) {
        const chunk = assetIds.slice(i, i + 100);
        const { data: maData } = await supabase
          .from("media_assets")
          .select("id, media_asset_code")
          .in("id", chunk);
        maData?.forEach((m: any) => codeMap.set(m.id, m.media_asset_code || m.id));
      }

      // Group assets by campaign
      const assetsByCamp = new Map<string, CampaignAssetRow[]>();
      allCA.forEach((r: any) => {
        const arr = assetsByCamp.get(r.campaign_id) || [];
        arr.push({
          asset_code: codeMap.get(r.asset_id) || r.asset_id,
          media_type: r.media_type || "-",
          city: r.city || "-",
          area: r.area || "-",
          location: r.location || "-",
          dimensions: r.dimensions || "-",
          illumination: r.illumination_type || "-",
          direction: r.direction || "-",
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
          cities,
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- filter ----------
  const filteredData = useMemo(() => {
    let result = [...data];
    if (statusFilter !== "all") {
      result = result.filter((r) => r.campaign_status === statusFilter);
    }
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (r) =>
          r.campaign_name.toLowerCase().includes(term) ||
          r.client_name.toLowerCase().includes(term) ||
          r.cities.some((c) => c.toLowerCase().includes(term))
      );
    }
    return result;
  }, [data, statusFilter, searchValue]);

  const pagination = usePagination(filteredData, { initialPageSize: 50 });

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const totalAssets = filteredData.reduce((s, r) => s + r.assets_booked, 0);
    const uniqueClients = new Set(filteredData.map((r) => r.client_name)).size;
    const uniqueCities = new Set(filteredData.flatMap((r) => r.cities)).size;
    const avgDuration = filteredData.length > 0
      ? Math.round(filteredData.reduce((s, r) => s + r.duration_days, 0) / filteredData.length)
      : 0;
    return [
      { label: "Campaigns", value: filteredData.length, icon: <Briefcase className="h-5 w-5" /> },
      { label: "Total Booked Assets", value: totalAssets, icon: <Building2 className="h-5 w-5" /> },
      { label: "Clients", value: uniqueClients, icon: <Users className="h-5 w-5" /> },
      { label: "Cities", value: uniqueCities, icon: <MapPin className="h-5 w-5" /> },
      { label: "Avg Duration", value: `${avgDuration} days`, icon: <CalendarDays className="h-5 w-5" /> },
    ];
  }, [filteredData]);

  // ---------- toggle expand ----------
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---------- status badge ----------
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "InProgress":
      case "Running":
      case "Active":
        return <Badge variant="default">{status}</Badge>;
      case "Completed":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600">{status}</Badge>;
      case "Planned":
      case "Upcoming":
        return <Badge variant="secondary">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ---------- export ----------
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Monthly Campaigns");
    const headers = ["Campaign Name", "Client Name", "Start Date", "End Date", "Duration (Days)", "Assets Booked", "Cities", "Status"];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach((row) => {
      sheet.addRow([
        row.campaign_name,
        row.client_name,
        formatDateDDMMYYYY(row.start_date),
        formatDateDDMMYYYY(row.end_date),
        row.duration_days,
        row.assets_booked,
        row.cities.join(", "),
        row.campaign_status,
      ]);
    });

    sheet.columns.forEach((col) => { col.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Monthly_Campaign_Report_${monthKey}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredData.length} campaigns.` });
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monthly Campaign Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Campaigns running in a selected month with booked asset count and drilldown
          </p>
        </div>
        <ReportExportMenu
          onExportExcel={handleExportExcel}
          onExportPDF={async () => {}}
          metadata={{
            reportName: "Monthly Campaign Report",
            generatedAt: new Date(),
            filtersApplied: [],
            companyName: company?.name,
          }}
          disabled={filteredData.length === 0}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 bg-card border rounded-lg p-4">
        {/* Month picker */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Month</Label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevMonth}>
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
            <Input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value)}
              className="h-9 w-44"
            />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextMonth}>
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
        </div>

        {/* Status filter */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs font-medium text-muted-foreground">Search</Label>
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search campaign, client, city..."
            className="h-9"
          />
        </div>

        <Button variant="outline" size="sm" className="h-9" onClick={() => { setMonthKey(currentMonthKey()); setStatusFilter("all"); setSearchValue(""); }}>
          Reset
        </Button>
      </div>

      <ReportKPICards kpis={kpis} />

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <ReportEmptyState
          title="No Campaigns Found"
          description={`No campaigns overlap with ${monthLabel}. Try a different month.`}
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Campaign Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Assets</TableHead>
                <TableHead>Cities</TableHead>
                <TableHead>Status</TableHead>
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
                          <TableCell className="font-medium">{row.campaign_name}</TableCell>
                          <TableCell>{row.client_name}</TableCell>
                          <TableCell>{formatDateDDMMYYYY(row.start_date)}</TableCell>
                          <TableCell>{formatDateDDMMYYYY(row.end_date)}</TableCell>
                          <TableCell className="text-right">{row.duration_days} days</TableCell>
                          <TableCell className="text-right">{row.assets_booked}</TableCell>
                          <TableCell>{row.cities.join(", ") || "-"}</TableCell>
                          <TableCell>{getStatusBadge(row.campaign_status)}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-0">
                            {row.assets.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground">No assets linked to this campaign.</p>
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

          {/* Pagination */}
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

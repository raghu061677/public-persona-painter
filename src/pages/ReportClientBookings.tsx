import { useEffect, useState, useMemo, useCallback } from "react";
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
import { DateRangeFilter } from "@/components/common/date-range-filter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  cities: string[];
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

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "InProgress", label: "Active / In Progress" },
  { value: "Planned", label: "Planned" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

// ---------- component ----------
export default function ReportClientBookings() {
  const { company } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ClientSummaryRow[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultDateRange);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  // ---------- load ----------
  const loadData = useCallback(async () => {
    if (!company?.id || !dateRange?.from || !dateRange?.to) return;
    setLoading(true);
    try {
      const rangeStart = dateRange.from.toISOString().split("T")[0];
      const rangeEnd = dateRange.to.toISOString().split("T")[0];

      // Fetch campaigns overlapping the date range
      let query = supabase
        .from("campaigns")
        .select("id, campaign_name, client_id, client_name, start_date, end_date, status")
        .eq("company_id", company.id)
        .lte("start_date", rangeEnd)
        .gte("end_date", rangeStart);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data: campData, error: campError } = await query;
      if (campError) throw campError;

      if (!campData || campData.length === 0) {
        setData([]);
        return;
      }

      const campIds = campData.map((c: any) => c.id);

      // Batch-fetch campaign_assets
      let allCA: any[] = [];
      for (let i = 0; i < campIds.length; i += 100) {
        const chunk = campIds.slice(i, i + 100);
        const { data: caData } = await supabase
          .from("campaign_assets")
          .select("campaign_id, asset_id, media_type, city, area, location, dimensions, illumination_type, direction")
          .in("campaign_id", chunk);
        if (caData) allCA.push(...caData);
      }

      // Batch-fetch asset codes
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
      const assetsByCamp = new Map<string, AssetRow[]>();
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

      // Build campaign rows and group by client
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
          assets.forEach((a) => {
            if (a.city !== "-" && !existing.cities.includes(a.city)) existing.cities.push(a.city);
          });
        } else {
          const cities = [...new Set(assets.map((a) => a.city).filter((x) => x !== "-"))];
          clientMap.set(clientKey, {
            client_id: clientKey,
            client_name: c.client_name || "-",
            total_campaigns: 1,
            total_assets: assets.length,
            first_booking: c.start_date,
            last_booking: c.end_date,
            cities,
            campaigns: [campRow],
          });
        }
      });

      const rows = Array.from(clientMap.values()).sort((a, b) => b.total_assets - a.total_assets);
      setData(rows);
    } catch (error: any) {
      console.error("Error loading client bookings:", error);
      toast({ title: "Error", description: error.message || "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [company?.id, dateRange, statusFilter, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------- filter (search only, status applied in query) ----------
  const filteredData = useMemo(() => {
    if (!searchValue) return data;
    const term = searchValue.toLowerCase();
    return data.filter(
      (r) =>
        r.client_name.toLowerCase().includes(term) ||
        r.cities.some((c) => c.toLowerCase().includes(term)) ||
        r.campaigns.some((c) => c.campaign_name.toLowerCase().includes(term))
    );
  }, [data, searchValue]);

  // ---------- KPIs ----------
  const kpis = useMemo(() => {
    const totalAssets = filteredData.reduce((s, r) => s + r.total_assets, 0);
    const totalCampaigns = filteredData.reduce((s, r) => s + r.total_campaigns, 0);
    const uniqueCities = new Set(filteredData.flatMap((r) => r.cities)).size;
    return [
      { label: "Total Clients", value: filteredData.length, icon: <Users className="h-5 w-5" /> },
      { label: "Total Campaigns", value: totalCampaigns, icon: <Briefcase className="h-5 w-5" /> },
      { label: "Total Assets Booked", value: totalAssets, icon: <Building2 className="h-5 w-5" /> },
      { label: "Cities Covered", value: uniqueCities, icon: <MapPin className="h-5 w-5" /> },
    ];
  }, [filteredData]);

  // ---------- toggle helpers ----------
  const toggleClient = (id: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((prev) => {
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
        return <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400">{status}</Badge>;
      case "Planned":
      case "Upcoming":
        return <Badge variant="secondary">{status}</Badge>;
      case "Cancelled":
        return <Badge variant="destructive">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ---------- export summary ----------
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Client Bookings Summary");
    const headers = ["Client Name", "Total Campaigns", "Total Assets Booked", "First Booking", "Last Booking", "Cities"];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach((row) => {
      sheet.addRow([
        row.client_name,
        row.total_campaigns,
        row.total_assets,
        formatDateDDMMYYYY(row.first_booking),
        formatDateDDMMYYYY(row.last_booking),
        row.cities.join(", "),
      ]);
    });

    sheet.columns.forEach((col) => { col.width = 22; });

    // Drilldown sheet
    const drillSheet = workbook.addWorksheet("Drilldown");
    const dHeaders = ["Client Name", "Campaign Name", "Start Date", "End Date", "Duration", "Assets", "Status", "Asset Code", "Media Type", "City", "Area", "Location"];
    drillSheet.addRow(dHeaders);
    drillSheet.getRow(1).font = { bold: true };
    drillSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };

    filteredData.forEach((client) => {
      client.campaigns.forEach((camp) => {
        if (camp.assets.length === 0) {
          drillSheet.addRow([
            client.client_name,
            camp.campaign_name,
            formatDateDDMMYYYY(camp.start_date),
            formatDateDDMMYYYY(camp.end_date),
            camp.duration_days,
            camp.asset_count,
            camp.status,
            "-", "-", "-", "-", "-",
          ]);
        } else {
          camp.assets.forEach((asset, idx) => {
            drillSheet.addRow([
              idx === 0 ? client.client_name : "",
              idx === 0 ? camp.campaign_name : "",
              idx === 0 ? formatDateDDMMYYYY(camp.start_date) : "",
              idx === 0 ? formatDateDDMMYYYY(camp.end_date) : "",
              idx === 0 ? camp.duration_days : "",
              idx === 0 ? camp.asset_count : "",
              idx === 0 ? camp.status : "",
              asset.asset_code,
              asset.media_type,
              asset.city,
              asset.area,
              asset.location,
            ]);
          });
        }
      });
    });

    drillSheet.columns.forEach((col) => { col.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Client_Bookings_Report.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredData.length} clients with drilldown.` });
  };

  const resetFilters = () => {
    setDateRange(defaultDateRange());
    setStatusFilter("all");
    setSearchValue("");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
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
            filtersApplied: [statusFilter !== "all" ? `Status: ${statusFilter}` : "", searchValue ? `Search: ${searchValue}` : ""].filter(Boolean),
            companyName: company?.name,
          }}
          disabled={filteredData.length === 0}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 bg-card border rounded-lg p-4">
        <DateRangeFilter
          label="Date Range"
          value={dateRange}
          onChange={setDateRange}
          placeholder="Select date range"
        />

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

        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs font-medium text-muted-foreground">Search</Label>
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search client, campaign, city..."
            className="h-9"
          />
        </div>

        <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
          Reset
        </Button>
      </div>

      <ReportKPICards kpis={kpis} columns={4} />

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <ReportEmptyState
          title="No Client Bookings Found"
          description="No campaigns overlap with the selected date range."
          onClearFilters={resetFilters}
        />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Client Name</TableHead>
                <TableHead className="text-right">Campaigns</TableHead>
                <TableHead className="text-right">Assets Booked</TableHead>
                <TableHead>First Booking</TableHead>
                <TableHead>Last Booking</TableHead>
                <TableHead>Cities</TableHead>
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
                          <TableCell>{client.client_name}</TableCell>
                          <TableCell className="text-right">{client.total_campaigns}</TableCell>
                          <TableCell className="text-right">{client.total_assets}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <CalendarDays className="h-3 w-3 text-muted-foreground" />
                              {formatDateDDMMYYYY(client.first_booking)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <CalendarDays className="h-3 w-3 text-muted-foreground" />
                              {formatDateDDMMYYYY(client.last_booking)}
                            </div>
                          </TableCell>
                          <TableCell>{client.cities.join(", ") || "-"}</TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={7} className="p-0">
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
                                                {camp.assets.length > 0 && (
                                                  isCampExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                                                )}
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

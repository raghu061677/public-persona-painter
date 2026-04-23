import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useExecutiveDrillDown } from "@/hooks/useExecutiveDrillDown";
import { ExecutiveSummaryBanner } from "@/components/common/ExecutiveSummaryBanner";
import { DateRange } from "react-day-picker";
import {
  MapPin,
  Building2,
  Users,
  Briefcase,
  Clock,
  Settings2,
  IndianRupee,
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/common/SortableTableHead";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { ReportControls, ReportKPICards, ReportEmptyState, ReportExportMenu } from "@/components/reports";
import { useReportFilters } from "@/hooks/useReportFilters";
import { usePagination } from "@/hooks/usePagination";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ROUTES } from "@/lib/routes";
import { exportListExcel } from "@/utils/exports/excel/exportListExcel";
import { exportListPdf } from "@/utils/exports/pdf/exportListPdf";
import { BookedMediaCustomExportDialog } from "@/components/reports/BookedMediaCustomExportDialog";

interface BookedMediaRow {
  asset_id: string;
  asset_code: string;
  media_type: string;
  city: string;
  area: string;
  location: string;
  address: string;
  direction: string;
  dimensions: string;
  total_sqft: number;
  illumination: string;
  latitude: number | null;
  longitude: number | null;
  asset_status: string;
  operational_status: string;
  campaign_name: string;
  campaign_id: string;
  client_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  campaign_status: string;
  installation_status: string;
  // Booking intelligence
  booked_till: string;
  available_from: string;
  billing_type: string;
  // Commercial
  negotiated_rate: number;
  printing_charges: number;
  mounting_charges: number;
  total_booking_value: number;
  invoice_status: string;
}

const DATE_TYPES = [
  { value: "overlap", label: "Overlapping Range" },
  { value: "start", label: "Booking Start Date" },
  { value: "end", label: "Booking End Date" },
];

const SORT_OPTIONS = [
  { value: "city", label: "City" },
  { value: "asset_code", label: "Asset Code" },
  { value: "location", label: "Location" },
  { value: "campaign_name", label: "Campaign Name" },
  { value: "client_name", label: "Client Name" },
  { value: "start_date", label: "Start Date" },
  { value: "duration_days", label: "Duration" },
];

const COLUMNS = [
  { key: "asset_code", label: "Asset Code", default: true },
  { key: "media_type", label: "Media Type", default: true },
  { key: "city", label: "City", default: true },
  { key: "area", label: "Area", default: true },
  { key: "location", label: "Location", default: true },
  { key: "address", label: "Address", default: false },
  { key: "direction", label: "Facing", default: true },
  { key: "dimensions", label: "Dimensions", default: true },
  { key: "total_sqft", label: "Sq.Ft", default: false },
  { key: "illumination", label: "Illumination", default: true },
  { key: "latitude", label: "Latitude", default: false },
  { key: "longitude", label: "Longitude", default: false },
  { key: "asset_status", label: "Asset Status", default: false },
  { key: "operational_status", label: "Ops Status", default: true },
  { key: "campaign_name", label: "Campaign", default: true },
  { key: "client_name", label: "Client", default: true },
  { key: "start_date", label: "Start Date", default: true },
  { key: "end_date", label: "End Date", default: true },
  { key: "booked_till", label: "Booked Till", default: true },
  { key: "available_from", label: "Available From", default: true },
  { key: "duration_days", label: "Duration (Days)", default: true },
  { key: "campaign_status", label: "Campaign Status", default: true },
  { key: "installation_status", label: "Installation", default: false },
  { key: "billing_type", label: "Billing Type", default: false },
  { key: "negotiated_rate", label: "Negotiated Rate", default: false },
  { key: "printing_charges", label: "Printing", default: false },
  { key: "mounting_charges", label: "Mounting", default: false },
  { key: "total_booking_value", label: "Booking Value", default: true },
  { key: "invoice_status", label: "Invoice Status", default: true },
];

const STORAGE_KEY = "report.bookedMedia.visibleColumns";
const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.default).map((c) => c.key);

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function diffDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

export default function ReportBookedMedia() {
  const { company } = useCompany();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isFromExecutive, drillState, alreadyApplied, markApplied, clearDrillState } = useExecutiveDrillDown();
  const [showDrillBanner, setShowDrillBanner] = useState(false);

  const [loading, setLoading] = useState(false);
  const [customExportOpen, setCustomExportOpen] = useState(false);
  const [data, setData] = useState<BookedMediaRow[]>([]);

  const {
    dateType,
    setDateType,
    dateRange,
    setDateRange,
    searchValue,
    setSearchValue,
    selectedFilters,
    handleFilterChange,
    sortConfig,
    setSortConfig,
    resetFilters,
    hasActiveFilters,
  } = useReportFilters({
    defaultDateType: "overlap",
    defaultSortField: "city",
    defaultSortDirection: "asc",
    reportKey: "booked-media-report",
  });

  // Apply executive summary drill-down filters on first load
  useEffect(() => {
    if (isFromExecutive && !alreadyApplied && drillState) {
      markApplied();
      setShowDrillBanner(true);
      if (drillState.dateFrom && drillState.dateTo) {
        setDateRange({ from: new Date(drillState.dateFrom), to: new Date(drillState.dateTo) });
      }
      if (drillState.filterCity) {
        handleFilterChange("city", [drillState.filterCity]);
      }
    }
  }, [isFromExecutive]);

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

  // Load data
  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      // Fetch campaign_assets joined with campaigns and media_assets
      const { data: caData, error: caError } = await supabase
        .from("campaign_assets")
        .select(`
          asset_id, city, area, location, direction, dimensions, total_sqft,
          media_type, card_rate, status, start_date, end_date,
          booking_start_date, booking_end_date,
          effective_start_date, effective_end_date,
          illumination_type,
          latitude, longitude,
          campaign_id, is_removed,
          billing_mode, billing_mode_override,
          negotiated_rate, printing_charges, mounting_charges, total_price,
          campaigns!inner(id, campaign_name, client_name, start_date, end_date, status, company_id)
        `)
        .eq("campaigns.company_id", company.id)
        .eq("is_removed", false);

      if (caError) throw caError;

      // Get asset codes
      const assetIds = [...new Set((caData || []).map((r: any) => r.asset_id))];
      let assetCodeMap = new Map<string, string>();
      let assetExtraMap = new Map<string, { status: string; direction: string; dimensions: string; illumination_type: string; total_sqft: number; operational_status: string }>();

      if (assetIds.length > 0) {
        for (let i = 0; i < assetIds.length; i += 100) {
          const chunk = assetIds.slice(i, i + 100);
          const { data: maData } = await supabase
            .from("media_assets")
            .select("id, media_asset_code, status, direction, dimensions, illumination_type, total_sqft, operational_status")
            .in("id", chunk);
          maData?.forEach((ma: any) => {
            assetCodeMap.set(ma.id, ma.media_asset_code || `ASSET-${ma.id.replace(/-/g, '').slice(-6).toUpperCase()}`);
            assetExtraMap.set(ma.id, {
              status: ma.status || "-",
              direction: ma.direction || "-",
              dimensions: ma.dimensions || "-",
              illumination_type: ma.illumination_type || "-",
              total_sqft: ma.total_sqft || 0,
              operational_status: ma.operational_status || "active",
            });
          });
        }
      }

      // Batch-fetch invoice statuses by campaign_id (latest per campaign)
      const campaignIds = [...new Set((caData || []).map((r: any) => r.campaigns?.id).filter(Boolean))];
      const invoiceStatusMap = new Map<string, string>();
      if (campaignIds.length > 0) {
        for (let i = 0; i < campaignIds.length; i += 100) {
          const chunk = campaignIds.slice(i, i + 100);
          const { data: invData } = await supabase
            .from("invoices")
            .select("campaign_id, status, balance_due")
            .in("campaign_id", chunk);
          invData?.forEach((inv: any) => {
            if (!inv.campaign_id) return;
            const prev = invoiceStatusMap.get(inv.campaign_id);
            // Priority: Overdue > Partially Paid > Sent > Paid > Draft > Cancelled
            const rank = (s: string) => {
              if (s === 'Overdue') return 6;
              if (s === 'Partially Paid') return 5;
              if (s === 'Sent' || s === 'Issued') return 4;
              if (s === 'Paid') return 3;
              if (s === 'Draft') return 2;
              return 1;
            };
            if (!prev || rank(inv.status) > rank(prev)) {
              invoiceStatusMap.set(inv.campaign_id, inv.status);
            }
          });
        }
      }

      // Build per-asset booking timeline to derive booked_till + available_from
      // Group all bookings by asset to find chained next-booking dates
      const bookingsByAsset = new Map<string, Array<{ start: string; end: string }>>();
      (caData || []).forEach((r: any) => {
        const s = r.effective_start_date || r.booking_start_date || r.start_date || r.campaigns?.start_date;
        const e = r.effective_end_date || r.booking_end_date || r.end_date || r.campaigns?.end_date;
        if (!s || !e) return;
        if (!bookingsByAsset.has(r.asset_id)) bookingsByAsset.set(r.asset_id, []);
        bookingsByAsset.get(r.asset_id)!.push({ start: s, end: e });
      });
      // Sort each asset's bookings ascending
      bookingsByAsset.forEach((arr) => arr.sort((a, b) => a.start.localeCompare(b.start)));

      const rows: BookedMediaRow[] = (caData || []).map((r: any) => {
        const campaign = r.campaigns;
        const startDate = r.effective_start_date || r.booking_start_date || r.start_date || campaign.start_date;
        const endDate = r.effective_end_date || r.booking_end_date || r.end_date || campaign.end_date;
        const maExtra = assetExtraMap.get(r.asset_id);

        // booked_till = current row end date
        const bookedTill = endDate;
        // available_from = day after booked_till, unless next chained booking continues
        let availableFrom = "";
        try {
          const list = bookingsByAsset.get(r.asset_id) || [];
          // Find the latest end among bookings overlapping or starting before our end
          let chainedEnd = endDate;
          let extended = true;
          while (extended) {
            extended = false;
            for (const b of list) {
              if (b.start <= chainedEnd && b.end > chainedEnd) {
                chainedEnd = b.end;
                extended = true;
              }
            }
          }
          if (chainedEnd) {
            const d = new Date(chainedEnd + "T00:00:00");
            d.setDate(d.getDate() + 1);
            availableFrom = d.toISOString().split("T")[0];
          }
        } catch {
          availableFrom = "";
        }

        const negotiated = Number(r.negotiated_rate || 0);
        const printing = Number(r.printing_charges || 0);
        const mounting = Number(r.mounting_charges || 0);
        const totalValue = Number(r.total_price || 0) || (negotiated + printing + mounting);

        return {
          asset_id: r.asset_id,
          asset_code: assetCodeMap.get(r.asset_id) || `ASSET-${r.asset_id.replace(/-/g, '').slice(-6).toUpperCase()}`,
          media_type: r.media_type || "-",
          city: r.city || "-",
          area: r.area || "-",
          location: r.location || "-",
          address: r.location || "-",
          direction: r.direction || maExtra?.direction || "-",
          dimensions: r.dimensions || maExtra?.dimensions || "-",
          total_sqft: r.total_sqft || maExtra?.total_sqft || 0,
          illumination: r.illumination_type || maExtra?.illumination_type || "-",
          latitude: r.latitude || null,
          longitude: r.longitude || null,
          asset_status: maExtra?.status || "-",
          operational_status: maExtra?.operational_status || "active",
          campaign_name: campaign.campaign_name || "-",
          campaign_id: campaign.id,
          client_name: campaign.client_name || "-",
          start_date: startDate,
          end_date: endDate,
          duration_days: diffDays(startDate, endDate),
          campaign_status: campaign.status || "-",
          installation_status: r.status || "-",
          booked_till: bookedTill,
          available_from: availableFrom,
          billing_type: r.billing_mode_override || r.billing_mode || "-",
          negotiated_rate: negotiated,
          printing_charges: printing,
          mounting_charges: mounting,
          total_booking_value: totalValue,
          invoice_status: invoiceStatusMap.get(campaign.id) || "Not Invoiced",
        };
      });

      setData(rows);
    } catch (error: any) {
      console.error("Error loading booked media:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load booked media data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter options
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const areas = new Set<string>();
    const mediaTypes = new Set<string>();
    const statuses = new Set<string>();
    const clients = new Set<string>();

    data.forEach((r) => {
      if (r.city && r.city !== "-") cities.add(r.city);
      if (r.area && r.area !== "-") areas.add(r.area);
      if (r.media_type && r.media_type !== "-") mediaTypes.add(r.media_type);
      statuses.add(r.campaign_status);
      if (r.client_name && r.client_name !== "-") clients.add(r.client_name);
    });

    return {
      cities: Array.from(cities).sort().map((c) => ({ value: c, label: c })),
      areas: Array.from(areas).sort().map((a) => ({ value: a, label: a })),
      mediaTypes: Array.from(mediaTypes).sort().map((t) => ({ value: t, label: t })),
      statuses: Array.from(statuses).sort().map((s) => ({ value: s, label: s })),
      clients: Array.from(clients).sort().map((c) => ({ value: c, label: c })),
    };
  }, [data]);

  // Filtered + sorted
  const filteredData = useMemo(() => {
    let result = [...data];

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      result = result.filter((r) => {
        const s = new Date(r.start_date);
        const e = new Date(r.end_date);
        switch (dateType) {
          case "start":
            return s >= dateRange.from! && s <= dateRange.to!;
          case "end":
            return e >= dateRange.from! && e <= dateRange.to!;
          default: // overlap
            return s <= dateRange.to! && e >= dateRange.from!;
        }
      });
    }

    // Search
    if (searchValue) {
      const term = searchValue.toLowerCase();
      result = result.filter(
        (r) =>
          r.asset_code.toLowerCase().includes(term) ||
          r.location.toLowerCase().includes(term) ||
          r.campaign_name.toLowerCase().includes(term) ||
          r.client_name.toLowerCase().includes(term) ||
          r.city.toLowerCase().includes(term) ||
          r.area.toLowerCase().includes(term)
      );
    }

    // Multi-filters
    if (selectedFilters.cities.length > 0) {
      result = result.filter((r) => selectedFilters.cities.includes(r.city));
    }
    if (selectedFilters.areas.length > 0) {
      result = result.filter((r) => selectedFilters.areas.includes(r.area));
    }
    if (selectedFilters.mediaTypes.length > 0) {
      result = result.filter((r) => selectedFilters.mediaTypes.includes(r.media_type));
    }
    if (selectedFilters.statuses.length > 0) {
      result = result.filter((r) => selectedFilters.statuses.includes(r.campaign_status));
    }
    if (selectedFilters.clients.length > 0) {
      result = result.filter((r) => selectedFilters.clients.includes(r.client_name));
    }

    // Sort
    result.sort((a, b) => {
      const key = sortConfig.field as keyof BookedMediaRow;
      const aVal = a[key];
      const bVal = b[key];
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
  }, [data, dateRange, dateType, searchValue, selectedFilters, sortConfig]);

  // Pagination
  const pagination = usePagination(filteredData, { initialPageSize: 50 });

  // KPIs
  const kpis = useMemo(() => {
    const uniqueAssets = new Set(filteredData.map((r) => r.asset_id)).size;
    const uniqueCampaigns = new Set(filteredData.map((r) => r.campaign_name)).size;
    const uniqueClients = new Set(filteredData.map((r) => r.client_name)).size;
    const uniqueCities = new Set(filteredData.map((r) => r.city)).size;
    const avgDuration = filteredData.length > 0
      ? Math.round(filteredData.reduce((s, r) => s + r.duration_days, 0) / filteredData.length)
      : 0;
    const totalValue = filteredData.reduce((s, r) => s + (r.total_booking_value || 0), 0);
    const atRisk = filteredData.filter((r) => r.operational_status && r.operational_status !== "active").length;

    return [
      { label: "Total Bookings", value: filteredData.length, icon: <MapPin className="h-5 w-5" />, color: 'info' as const },
      { label: "Unique Assets", value: uniqueAssets, icon: <Building2 className="h-5 w-5" />, color: 'success' as const },
      { label: "Campaigns", value: uniqueCampaigns, icon: <Briefcase className="h-5 w-5" />, color: 'warning' as const },
      { label: "Clients", value: uniqueClients, icon: <Users className="h-5 w-5" />, color: 'danger' as const },
      { label: "Cities", value: uniqueCities, icon: <MapPin className="h-5 w-5" />, color: 'info' as const },
      { label: "Avg Duration", value: `${avgDuration} days`, icon: <Clock className="h-5 w-5" />, color: 'default' as const },
      { label: "Booking Value", value: `₹${Math.round(totalValue).toLocaleString('en-IN')}`, icon: <IndianRupee className="h-5 w-5" />, color: 'success' as const },
      { label: "At Risk Assets", value: atRisk, icon: <AlertTriangle className="h-5 w-5" />, color: atRisk > 0 ? 'danger' as const : 'default' as const },
    ];
  }, [filteredData]);

  // Grouped summaries — Top Cities & Top Clients
  const topCities = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    filteredData.forEach((r) => {
      const cur = map.get(r.city) || { count: 0, value: 0 };
      cur.count += 1;
      cur.value += r.total_booking_value || 0;
      map.set(r.city, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  }, [filteredData]);

  const topClients = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    filteredData.forEach((r) => {
      const cur = map.get(r.client_name) || { count: 0, value: 0 };
      cur.count += 1;
      cur.value += r.total_booking_value || 0;
      map.set(r.client_name, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5);
  }, [filteredData]);

  // Status badge
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

  const getOperationalBadge = (status: string) => {
    const s = (status || "active").toLowerCase();
    switch (s) {
      case "active":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50">Active</Badge>;
      case "removed":
        return <Badge variant="destructive">Removed</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">Maintenance</Badge>;
      case "inactive":
        return <Badge variant="outline" className="border-slate-400 text-slate-600">Inactive</Badge>;
      case "blocked":
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInvoiceBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50">Paid</Badge>;
      case "Partially Paid":
        return <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">Partial</Badge>;
      case "Sent":
      case "Issued":
        return <Badge variant="outline" className="border-indigo-500 text-indigo-700 bg-indigo-50">{status}</Badge>;
      case "Overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "Draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "Cancelled":
        return <Badge variant="outline" className="border-red-400 text-red-600">Cancelled</Badge>;
      case "Not Invoiced":
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Invoiced</Badge>;
    }
  };

  const formatCurrency = (n: number) => {
    if (!n || n === 0) return "-";
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  };

  // Excel export
  const handleExportExcel = async () => {
    const cols = COLUMNS.filter((c) => visibleColumns.includes(c.key));
    try {
      await exportListExcel({
        branding: {
          companyName: company?.name || "GO-ADS 360°",
          title: "Booked Media Report",
          subtitle: dateRange?.from && dateRange?.to
            ? `${formatDateDDMMYYYY(dateRange.from.toISOString())} – ${formatDateDDMMYYYY(dateRange.to.toISOString())}`
            : undefined,
          logoUrl: company?.logo_url || undefined,
        },
        fields: cols.map((c) => ({
          key: c.key,
          label: c.label,
          width: c.key === "location" || c.key === "address" ? 30 : 18,
          type: (
            ["total_sqft", "duration_days", "negotiated_rate", "printing_charges", "mounting_charges", "total_booking_value"].includes(c.key)
              ? "number"
              : ["start_date", "end_date", "booked_till", "available_from"].includes(c.key)
              ? "date"
              : "text"
          ) as any,
          value:
            c.key === "start_date" ? (row: BookedMediaRow) => formatDateDDMMYYYY(row.start_date)
            : c.key === "end_date" ? (row: BookedMediaRow) => formatDateDDMMYYYY(row.end_date)
            : c.key === "booked_till" ? (row: BookedMediaRow) => formatDateDDMMYYYY(row.booked_till)
            : c.key === "available_from" ? (row: BookedMediaRow) => row.available_from ? formatDateDDMMYYYY(row.available_from) : "-"
            : undefined,
        })),
        rows: filteredData,
        rowStyleRules: [
          { when: (r: BookedMediaRow) => r.campaign_status === "Completed", fill: { argb: "FFD1FAE5" } },
          { when: (r: BookedMediaRow) => r.campaign_status === "Cancelled", fill: { argb: "FFFEE2E2" } },
          { when: (r: BookedMediaRow) => r.operational_status && r.operational_status !== "active", fill: { argb: "FFFEF3C7" } },
        ],
        fileName: `Booked_Media_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      });
      toast({ title: "Export Complete", description: `Exported ${filteredData.length} rows.` });
    } catch (err) {
      console.error("Excel export error:", err);
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  // PDF export
  const handleExportPDF = async () => {
    const cols = COLUMNS.filter((c) => visibleColumns.includes(c.key));
    try {
      await exportListPdf({
        branding: {
          companyName: company?.name || "GO-ADS 360°",
          title: "Booked Media Report",
          subtitle: dateRange?.from && dateRange?.to
            ? `Period: ${formatDateDDMMYYYY(dateRange.from.toISOString())} – ${formatDateDDMMYYYY(dateRange.to.toISOString())} | ${filteredData.length} bookings`
            : `${filteredData.length} bookings | Generated ${formatDateDDMMYYYY(new Date().toISOString())}`,
          themeColor: company?.theme_color || undefined,
          logoUrl: company?.logo_url || undefined,
        },
        fields: cols.map((c) => ({
          key: c.key,
          label: c.label,
          value:
            c.key === "start_date" ? (row: BookedMediaRow) => formatDateDDMMYYYY(row.start_date)
            : c.key === "end_date" ? (row: BookedMediaRow) => formatDateDDMMYYYY(row.end_date)
            : c.key === "booked_till" ? (row: BookedMediaRow) => formatDateDDMMYYYY(row.booked_till)
            : c.key === "available_from" ? (row: BookedMediaRow) => row.available_from ? formatDateDDMMYYYY(row.available_from) : "-"
            : ["negotiated_rate", "printing_charges", "mounting_charges", "total_booking_value"].includes(c.key)
              ? (row: BookedMediaRow) => formatCurrency((row as any)[c.key])
            : undefined,
        })),
        rows: filteredData,
        orientation: "l",
        rowStyleRules: [
          { when: (r: BookedMediaRow) => r.operational_status && r.operational_status !== "active", fillColor: [254, 243, 199] },
          { when: (r: BookedMediaRow) => r.campaign_status === "Cancelled", fillColor: [254, 226, 226] },
        ],
        fileName: `Booked_Media_Report_${new Date().toISOString().split("T")[0]}.pdf`,
      });
      toast({ title: "PDF Exported", description: `Exported ${filteredData.length} rows.` });
    } catch (err) {
      console.error("PDF export error:", err);
      toast({ title: "PDF Export Failed", variant: "destructive" });
    }
  };

  const getCellValue = (row: BookedMediaRow, key: string) => {
    switch (key) {
      case "start_date": return formatDateDDMMYYYY(row.start_date);
      case "end_date": return formatDateDDMMYYYY(row.end_date);
      case "booked_till": return formatDateDDMMYYYY(row.booked_till);
      case "available_from": return row.available_from ? formatDateDDMMYYYY(row.available_from) : <span className="text-muted-foreground">-</span>;
      case "campaign_status": return getStatusBadge(row.campaign_status);
      case "installation_status": return <Badge variant="outline">{row.installation_status}</Badge>;
      case "operational_status": return getOperationalBadge(row.operational_status);
      case "invoice_status": return getInvoiceBadge(row.invoice_status);
      case "billing_type": return row.billing_type && row.billing_type !== "-" ? <Badge variant="secondary" className="capitalize">{row.billing_type}</Badge> : "-";
      case "negotiated_rate":
      case "printing_charges":
      case "mounting_charges":
      case "total_booking_value":
        return <span className="tabular-nums">{formatCurrency((row as any)[key])}</span>;
      default: return row[key as keyof BookedMediaRow] || "-";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {showDrillBanner && (
        <ExecutiveSummaryBanner
          dateFrom={drillState?.dateFrom}
          dateTo={drillState?.dateTo}
          extraLabel={drillState?.filterCity ? `City: ${drillState.filterCity}` : undefined}
          onClear={() => { setShowDrillBanner(false); resetFilters(); clearDrillState(); }}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Booked Media Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            All booked/active campaign assets with campaign + client + duration details
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustomExportOpen(true)}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            Custom Fields Export
          </Button>
          <ReportExportMenu
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            metadata={{
              reportName: "Booked Media Report",
              generatedAt: new Date(),
              dateRange: dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined,
              filtersApplied: [],
              companyName: company?.name,
            }}
            disabled={filteredData.length === 0}
          />
        </div>
      </div>

      <ReportControls
        reportKey="booked-media-report"
        dateTypes={DATE_TYPES.map((d) => ({ value: d.value, label: d.label }))}
        selectedDateType={dateType}
        onDateTypeChange={setDateType}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search asset, campaign, client, city..."
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

      <ReportKPICards kpis={kpis} columns={6} />

      {filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Top Cities by Booked Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {topCities.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-2">
                  {topCities.map(([city, info]) => (
                    <div key={city} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{city}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground tabular-nums">{info.count} bookings</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(info.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Top Clients by Booking Value
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {topClients.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-2">
                  {topClients.map(([client, info]) => (
                    <div key={client} className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{client}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground tabular-nums">{info.count} bookings</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(info.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filteredData.length === 0 ? (
        <ReportEmptyState
          title="No Booked Media Found"
          description="No booked assets match your current filters. Try adjusting your date range or filters."
        />
      ) : (
        <>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                    <SortableTableHead
                      key={col.key}
                      sortKey={col.key}
                      currentSort={sortConfig.field === col.key ? { key: col.key, direction: sortConfig.direction } : null}
                      onSort={(key) => {
                        setSortConfig((prev: any) => {
                          if (prev.field === key) {
                            return { field: key, direction: prev.direction === "asc" ? "desc" : "asc" };
                          }
                          return { field: key, direction: "asc" };
                        });
                      }}
                      className="whitespace-nowrap"
                      align={col.key === "total_sqft" || col.key === "duration_days" ? "right" : "left"}
                    >
                      {col.label}
                    </SortableTableHead>
                  ))}
                  <TableHead className="w-32 text-right whitespace-nowrap sticky right-0 bg-background border-l">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.data.map((row, idx) => (
                  <TableRow key={`${row.asset_id}-${row.campaign_name}-${idx}`}>
                    <TableCell className="text-muted-foreground">{pagination.startIndex + idx}</TableCell>
                    {COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                      <TableCell key={col.key} className="whitespace-nowrap">
                        {getCellValue(row, col.key)}
                      </TableCell>
                    ))}
                    <TableCell className="w-32 text-right whitespace-nowrap sticky right-0 bg-background border-l">
                      <TooltipProvider delayDuration={150}>
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => row.asset_id && navigate(ROUTES.MEDIA_ASSETS_DETAIL(row.asset_id))}
                                disabled={!row.asset_id}
                                aria-label="Open Asset"
                              >
                                <MapPin className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Open Asset {row.asset_code ? `(${row.asset_code})` : ""}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => row.campaign_id && navigate(ROUTES.CAMPAIGNS_DETAIL(row.campaign_id))}
                                disabled={!row.campaign_id}
                                aria-label="Open Campaign"
                              >
                                <Briefcase className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Open Campaign {row.campaign_name ? `– ${row.campaign_name}` : ""}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  navigate(
                                    `${ROUTES.INVOICES}?search=${encodeURIComponent(row.campaign_name || row.campaign_id || "")}`
                                  )
                                }
                                disabled={!row.campaign_id && !row.campaign_name}
                                aria-label="Open Invoices"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Invoices for this campaign
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {pagination.startIndex}–{pagination.endIndex} of {pagination.totalItems}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={pagination.previousPage}
                disabled={!pagination.hasPreviousPage}
              >
                Previous
              </Button>
              <span className="flex items-center px-2">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <BookedMediaCustomExportDialog
        open={customExportOpen}
        onOpenChange={setCustomExportOpen}
        rows={filteredData}
        startDate={dateRange?.from?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0]}
        endDate={dateRange?.to?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0]}
        companyName={company?.name}
        themeColor={company?.theme_color || undefined}
      />
    </div>
  );
}

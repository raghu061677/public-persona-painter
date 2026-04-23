import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileSpreadsheet,
  Presentation,
  FileText,
  Columns,
  RotateCcw,
  Zap,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Unlock,
  Loader2,
} from "lucide-react";
import { Wrench, Ban, AlertTriangle, TrendingUp, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { format, addDays, addMonths, startOfToday } from "date-fns";

/** Format date string to Indian DD/MM/YYYY */
function formatDateIN(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch { return '-'; }
}

/**
 * Build a compact 1-3 line availability timeline explanation for a row.
 * Reuses the already-resolved availability_status and dates from row enrichment;
 * does NOT recompute vacancy logic.
 */
function buildAvailabilityTimeline(row: any): { lines: Array<{ label?: string; value: string }> } {
  const lines: Array<{ label?: string; value: string }> = [];
  const status = row?.availability_status;
  const bookedTill = formatDateIN(row?.booked_till);
  const availFrom = formatDateIN(row?.available_from);
  const holdEnd = formatDateIN(row?.hold_end_date);
  const reason = row?.deactivation_reason || row?.block_reason || null;

  switch (status) {
    case 'VACANT_NOW':
      lines.push({ value: 'Available now' });
      if (row?.booked_till) lines.push({ label: 'Next booked till', value: bookedTill });
      break;
    case 'AVAILABLE_SOON':
    case 'BOOKED_THROUGH_RANGE':
      if (row?.booked_till) lines.push({ label: 'Booked till', value: bookedTill });
      if (row?.available_from) lines.push({ label: 'Available from', value: availFrom });
      if (lines.length === 0) lines.push({ value: 'Booked' });
      break;
    case 'HELD':
      if (row?.hold_end_date) lines.push({ label: 'Held till', value: holdEnd });
      if (row?.available_from) lines.push({ label: 'Available from', value: availFrom });
      if (lines.length === 0) lines.push({ value: 'On hold' });
      break;
    case 'MAINTENANCE':
      lines.push({ value: 'Under maintenance' });
      if (reason) lines.push({ label: 'Reason', value: reason });
      break;
    case 'REMOVED':
      lines.push({ value: 'Removed' });
      if (reason) lines.push({ label: 'Reason', value: reason });
      break;
    case 'INACTIVE':
      lines.push({ value: 'Inactive' });
      if (reason) lines.push({ label: 'Reason', value: reason });
      break;
    default:
      if (row?.booked_till) lines.push({ label: 'Booked till', value: bookedTill });
      if (row?.available_from) lines.push({ label: 'Available from', value: availFrom });
      if (lines.length === 0) lines.push({ value: '-' });
  }
  return { lines };
}

/** Flat string version of the timeline, for exports */
function timelineAsText(row: any): string {
  const { lines } = buildAvailabilityTimeline(row);
  return lines.map(l => (l.label ? `${l.label}: ${l.value}` : l.value)).join(' | ');
}

/** Map operational_status enum to a readable label for exports/UI */
function operationalStatusLabel(s: string | null | undefined): string {
  if (!s) return '-';
  switch (s) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'removed': return 'Removed';
    case 'maintenance': return 'Under Maintenance';
    default: return s;
  }
}
import { formatCurrency } from "@/utils/mediaAssets";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { generateAvailabilityReportExcel } from "@/lib/reports/generateAvailabilityReportExcel";
import { CustomExportDialog } from "@/components/reports/CustomExportDialog";
import { generateProposalPpt } from "@/lib/reports/generateProposalPpt";
import { Settings2 } from "lucide-react";
import { ListToolbar } from "@/components/list-views";
import { useListViewExport } from "@/hooks/useListViewExport";
import { vacantMediaExcelRules, vacantMediaPdfRules } from "@/utils/exports/statusColorRules";
import { AssetHoldDialog } from "@/components/reports/AssetHoldDialog";
import { ReleaseHoldDialog } from "@/components/reports/ReleaseHoldDialog";

// ─── Types ───────────────────────────────────────────────────
interface AvailabilityRow {
  asset_id: string;
  media_asset_code: string | null;
  area: string;
  location: string;
  direction: string | null;
  dimension: string | null;
  sqft: number;
  illumination: string | null;
  card_rate: number;
  city: string;
  media_type: string;
  primary_photo_url: string | null;
  qr_code_url: string | null;
  latitude: number | null;
  longitude: number | null;
  availability_status:
    | 'VACANT_NOW'
    | 'AVAILABLE_SOON'
    | 'BOOKED_THROUGH_RANGE'
    | 'HELD'
    | 'MAINTENANCE'
    | 'REMOVED'
    | 'INACTIVE';
  available_from: string;
  booked_till: string | null;
  current_campaign_id: string | null;
  current_campaign_name: string | null;
  current_client_name: string | null;
  booking_start: string | null;
  booking_end: string | null;
  // Hold fields (computed client-side)
  hold_status?: string | null;
  hold_type?: string | null;
  hold_client_name?: string | null;
  hold_start_date?: string | null;
  hold_end_date?: string | null;
  hold_id?: string | null;
  // Operational fields (computed client-side from media_assets)
  operational_status?: 'active' | 'inactive' | 'removed' | 'maintenance' | null;
  deactivation_reason?: string | null;
  block_reason?: string | null;
}

interface ActiveHold {
  id: string;
  asset_id: string;
  client_name: string | null;
  hold_type: string;
  status: string;
  start_date: string;
  end_date: string;
}

// ─── Column definitions ──────────────────────────────────────
const ALL_COLUMNS = [
  'area', 'location', 'direction', 'dimensions', 'sqft',
  'illumination', 'status', 'availability_timeline', 'available_from', 'card_rate',
  'asset_id', 'type', 'city', 'booked_till', 'campaign',
] as const;

const DEFAULT_VISIBLE = [
  'area', 'location', 'direction', 'dimensions', 'sqft',
  'illumination', 'status', 'availability_timeline', 'available_from',
];

const COLUMN_LABELS: Record<string, string> = {
  asset_id: 'Asset ID',
  type: 'Type',
  location: 'Location',
  area: 'Area',
  city: 'City',
  dimensions: 'Dimensions',
  sqft: 'Sq.Ft',
  direction: 'Direction',
  illumination: 'Illumination',
  status: 'Status',
  card_rate: 'Card Rate',
  available_from: 'Available From',
  booked_till: 'Booked Till',
  campaign: 'Campaign',
  availability_timeline: 'Availability Timeline',
};

type SortColumn = 'asset_id' | 'location' | 'area' | 'available_from' | 'direction' | 'dimensions' | 'sqft' | 'illumination' | 'status' | 'card_rate' | 'type' | 'city' | 'booked_till' | 'campaign' | null;
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

export default function MediaAvailabilityReport() {
  const { company } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 15), 'yyyy-MM-dd'));
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [allRows, setAllRows] = useState<AvailabilityRow[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'available_from', direction: 'asc' });
  const [exporting, setExporting] = useState(false);
  const [autoTrigger, setAutoTrigger] = useState(false);
  const [customExportOpen, setCustomExportOpen] = useState(false);
  const [proposalExporting, setProposalExporting] = useState(false);

  // Hold dialog state
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [holdTarget, setHoldTarget] = useState<{ assetId: string; label: string; bookingEnd?: string | null }>({ assetId: "", label: "" });
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<{ holdId: string; label: string; clientName?: string | null }>({ holdId: "", label: "" });

  // Bulk hold release state
  const [selectedHoldIds, setSelectedHoldIds] = useState<Set<string>>(new Set());
  const [bulkReleasing, setBulkReleasing] = useState(false);

  // Global List View System
  const { lv, handleExportExcel, handleExportPdf } = useListViewExport({
    pageKey: "reports.vacant_media",
    title: "MEDIA AVAILABILITY REPORT",
    subtitle: `${startDate} to ${endDate}`,
    excelRules: vacantMediaExcelRules,
    pdfRules: vacantMediaPdfRules,
    orientation: "l",
    valueOverrides: {
      sno: (_r: any, idx: number) => idx + 1,
      asset_id: (r: any) => r.media_asset_code || r.asset_id,
      availability_status: (r: any) =>
        r.availability_status === "VACANT_NOW" ? "Available" :
        r.availability_status === "AVAILABLE_SOON" ? `Available From (${formatDateIN(r.available_from)})` :
        r.availability_status === "HELD" ? "Held/Blocked" :
        r.availability_status === "MAINTENANCE" ? "Under Maintenance" :
        r.availability_status === "REMOVED" ? "Removed" :
        r.availability_status === "INACTIVE" ? "Inactive" : "Booked",
      available_from: (r: any) => formatDateIN(r.available_from),
      booked_till: (r: any) => formatDateIN(r.booked_till),
      campaign_name: (r: any) =>
        r.current_campaign_name ||
        (r.hold_type ? `Hold: ${r.hold_type}` : '') ||
        r.block_reason || '',
      client_name: (r: any) => r.current_client_name || r.hold_client_name || '',
      // Operational/inventory fields — included in Excel/PDF/Custom exports when field is present
      operational_status: (r: any) => operationalStatusLabel(r.operational_status),
      deactivation_reason: (r: any) => r.deactivation_reason || '-',
      block_reason: (r: any) => r.block_reason || r.deactivation_reason || '-',
      hold_end_date: (r: any) => formatDateIN(r.hold_end_date),
      // Single-cell business explanation for Availability Timeline column
      availability_timeline: (r: any) => timelineAsText(r),
    },
  });
  // Column visibility
  const {
    visibleKeys,
    setVisibleKeys,
    reset: resetColumns,
  } = useColumnPrefs('availability-report-v5', [...ALL_COLUMNS], DEFAULT_VISIBLE);

  const isColumnVisible = (col: string) => visibleKeys.includes(col);
  const toggleColumn = (col: string) => {
    if (visibleKeys.includes(col)) {
      setVisibleKeys(visibleKeys.filter(k => k !== col));
    } else {
      setVisibleKeys([...visibleKeys, col]);
    }
  };

  // ─── Load filters (cities & media types) ───────────────────
  useEffect(() => {
    if (company?.id) loadFilters();
  }, [company]);

  const loadFilters = async () => {
    if (!company?.id) return;
    const { data } = await supabase
      .from('media_assets')
      .select('city, media_type')
      .eq('company_id', company.id);
    if (data) {
      setCities([...new Set(data.map(a => a.city).filter(Boolean))]);
      setMediaTypes([...new Set(data.map(a => a.media_type).filter(Boolean))]);
    }
  };

  // ─── Load availability via RPC + holds ─────────────────────
  const loadAvailability = useCallback(async () => {
    if (!company?.id) return;
    const trimmedStart = (startDate || '').trim();
    const trimmedEnd = (endDate || '').trim();
    if (!trimmedStart || !trimmedEnd) {
      toast({ title: "Missing Dates", description: "Please select both start and end dates", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // Fetch availability + active holds + operational status in parallel
      const [availResult, holdsResult, opsResult] = await Promise.all([
        supabase.rpc('fn_media_availability_range', {
          p_company_id: company.id,
          p_start: trimmedStart,
          p_end: trimmedEnd,
          p_city: selectedCity === 'all' ? null : selectedCity,
          p_media_type: selectedMediaType === 'all' ? null : selectedMediaType,
        }),
        supabase
          .from('asset_holds')
          .select('id, asset_id, client_name, hold_type, status, start_date, end_date')
          .eq('company_id', company.id)
          .eq('status', 'ACTIVE')
          .lte('start_date', trimmedEnd)
          .gte('end_date', trimmedStart),
        supabase
          .from('media_assets')
          .select('id, operational_status, deactivation_reason')
          .eq('company_id', company.id),
      ]);

      if (availResult.error) throw availResult.error;

      const rows = (availResult.data as AvailabilityRow[]) || [];
      const holds = (holdsResult.data as ActiveHold[]) || [];

      // Build a map: asset_id -> hold that overlaps report range
      const holdMap = new Map<string, ActiveHold>();
      for (const h of holds) {
        // Keep the one with latest end_date if multiple
        const existing = holdMap.get(h.asset_id);
        if (!existing || h.end_date > existing.end_date) {
          holdMap.set(h.asset_id, h);
        }
      }

      // Build operational map: asset_id -> { operational_status, deactivation_reason }
      const opsMap = new Map<string, { operational_status: string | null; deactivation_reason: string | null }>();
      for (const op of (opsResult.data || []) as any[]) {
        opsMap.set(op.id, {
          operational_status: op.operational_status || 'active',
          deactivation_reason: op.deactivation_reason || null,
        });
      }

      // Merge hold info into rows
      const mergedRows = rows.map((row) => {
        const hold = holdMap.get(row.asset_id);
        const ops = opsMap.get(row.asset_id);
        const opStatus = (ops?.operational_status || 'active') as 'active' | 'inactive' | 'removed' | 'maintenance';
        const deactivationReason = ops?.deactivation_reason || null;

        // Priority rules:
        //   1. Active booking always shows as booked (operational issue noted via badge)
        //   2. Operational unavailability (removed / maintenance / inactive) overrides "vacant"
        //   3. Active hold overrides "vacant"
        const isCurrentlyBooked = row.availability_status === 'BOOKED_THROUGH_RANGE';

        // Apply operational override only if NOT currently booked
        let workingRow: AvailabilityRow = {
          ...row,
          operational_status: opStatus,
          deactivation_reason: deactivationReason,
        };

        if (!isCurrentlyBooked && opStatus !== 'active') {
          const opsLabel: AvailabilityRow['availability_status'] =
            opStatus === 'removed' ? 'REMOVED'
            : opStatus === 'maintenance' ? 'MAINTENANCE'
            : 'INACTIVE';
          workingRow = {
            ...workingRow,
            availability_status: opsLabel,
            // Operationally non-bookable assets do not have a derivable available_from
            available_from: '',
            block_reason: deactivationReason || (
              opStatus === 'removed' ? 'Asset removed'
              : opStatus === 'maintenance' ? 'Under maintenance'
              : 'Inactive'
            ),
          };
        }

        if (hold) {
          // If asset was VACANT_NOW/AVAILABLE_SOON/operational-issue but has an active hold,
          // mark as HELD. Booking still wins.
          const isOperationallyBlocked = workingRow.availability_status === 'REMOVED'
            || workingRow.availability_status === 'MAINTENANCE'
            || workingRow.availability_status === 'INACTIVE';
          const newAvailFrom = isCurrentlyBooked
            ? row.available_from
            : (hold.end_date > (row.booked_till || '') 
                ? format(addDays(new Date(hold.end_date), 1), 'yyyy-MM-dd')
                : row.available_from);
          
          return {
            ...workingRow,
            availability_status: isCurrentlyBooked
              ? row.availability_status
              : isOperationallyBlocked
                ? workingRow.availability_status // operational issue still wins over hold
                : 'HELD' as const,
            available_from: newAvailFrom,
            hold_status: 'ACTIVE',
            hold_type: hold.hold_type,
            hold_client_name: hold.client_name,
            hold_start_date: hold.start_date,
            hold_end_date: hold.end_date,
            hold_id: hold.id,
          };
        }
        return workingRow;
      });

      setAllRows(mergedRows);
      toast({
        title: "Report Updated",
        description: `Found ${mergedRows.length} assets in range (${holds.length} with holds)`,
      });
    } catch (error: any) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load availability report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [company?.id, startDate, endDate, selectedCity, selectedMediaType]);

  // Auto-trigger when quick button sets dates
  useEffect(() => {
    if (autoTrigger && company?.id) {
      loadAvailability();
      setAutoTrigger(false);
    }
  }, [autoTrigger, loadAvailability]);

  // ─── Quick date range buttons ──────────────────────────────
  const setQuickRange = (days: number | 'month') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setStartDate(today);
    if (days === 'month') {
      setEndDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    } else {
      setEndDate(format(addDays(new Date(), days), 'yyyy-MM-dd'));
    }
    setAutoTrigger(true);
  };

  // ─── Filtering ─────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let rows = allRows;

    // Status filter
    if (statusFilter !== 'all') {
      rows = rows.filter(r => r.availability_status === statusFilter);
    }

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.asset_id?.toLowerCase().includes(term) ||
        r.media_asset_code?.toLowerCase().includes(term) ||
        r.area?.toLowerCase().includes(term) ||
        r.location?.toLowerCase().includes(term) ||
        r.city?.toLowerCase().includes(term) ||
        r.media_type?.toLowerCase().includes(term) ||
        r.current_campaign_name?.toLowerCase().includes(term) ||
        r.current_client_name?.toLowerCase().includes(term)
      );
    }

    return rows;
  }, [allRows, statusFilter, searchTerm]);

  // ─── Sorting ───────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      switch (sortConfig.column) {
        case 'asset_id': aVal = a.media_asset_code || a.asset_id; bVal = b.media_asset_code || b.asset_id; break;
        case 'location': aVal = a.location || ''; bVal = b.location || ''; break;
        case 'area': aVal = a.area || ''; bVal = b.area || ''; break;
        case 'available_from': aVal = a.available_from || ''; bVal = b.available_from || ''; break;
        case 'direction': aVal = a.direction || ''; bVal = b.direction || ''; break;
        case 'dimensions': aVal = a.dimension || ''; bVal = b.dimension || ''; break;
        case 'sqft': aVal = a.sqft || 0; bVal = b.sqft || 0; break;
        case 'illumination': aVal = a.illumination || ''; bVal = b.illumination || ''; break;
        case 'status': aVal = a.availability_status || ''; bVal = b.availability_status || ''; break;
        case 'card_rate': aVal = a.card_rate || 0; bVal = b.card_rate || 0; break;
        case 'type': aVal = a.media_type || ''; bVal = b.media_type || ''; break;
        case 'city': aVal = a.city || ''; bVal = b.city || ''; break;
        case 'booked_till': aVal = a.booked_till || ''; bVal = b.booked_till || ''; break;
        case 'campaign': aVal = a.current_campaign_name || ''; bVal = b.current_campaign_name || ''; break;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortConfig]);

  // ─── Counts ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const vacantNow = allRows.filter(r => r.availability_status === 'VACANT_NOW').length;
    const availableSoon = allRows.filter(r => r.availability_status === 'AVAILABLE_SOON').length;
    const held = allRows.filter(r => r.availability_status === 'HELD').length;
    const booked = allRows.filter(r => r.availability_status === 'BOOKED_THROUGH_RANGE').length;
    const maintenance = allRows.filter(r => r.availability_status === 'MAINTENANCE').length;
    const removed = allRows.filter(r => r.availability_status === 'REMOVED').length;
    const inactive = allRows.filter(r => r.availability_status === 'INACTIVE').length;
    const atRisk = maintenance + removed + inactive;
    const totalSqft = allRows.reduce((s, r) => s + (Number(r.sqft) || 0), 0);
    const sellableSqft = allRows
      .filter(r => r.availability_status === 'VACANT_NOW')
      .reduce((s, r) => s + (Number(r.sqft) || 0), 0);
    const potentialRevenue = allRows
      .filter(r => r.availability_status === 'VACANT_NOW')
      .reduce((s, r) => s + (Number(r.card_rate) || 0), 0);
    const vacantRatio = allRows.length > 0
      ? Math.round((vacantNow / allRows.length) * 100)
      : 0;
    return {
      total: allRows.length,
      vacantNow, availableSoon, held, booked,
      maintenance, removed, inactive, atRisk,
      totalSqft, sellableSqft, potentialRevenue, vacantRatio,
    };
  }, [allRows]);

  // ─── Grouped Summaries ─────────────────────────────────────
  const summaries = useMemo(() => {
    const today = startOfToday();
    const sellable = allRows.filter(r =>
      r.availability_status === 'VACANT_NOW' || r.availability_status === 'AVAILABLE_SOON'
    );

    // Top 5 cities by sellable vacant assets
    const cityMap = new Map<string, number>();
    for (const r of sellable) {
      const k = r.city || '—';
      cityMap.set(k, (cityMap.get(k) || 0) + 1);
    }
    const topCities = Array.from(cityMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top 5 media types by sellable vacant assets
    const typeMap = new Map<string, number>();
    for (const r of sellable) {
      const k = r.media_type || '—';
      typeMap.set(k, (typeMap.get(k) || 0) + 1);
    }
    const topTypes = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Becoming free in next 7 / 15 / 30 days
    const within = (days: number) => {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() + days);
      return allRows.filter(r => {
        if (r.availability_status !== 'AVAILABLE_SOON' || !r.available_from) return false;
        const d = new Date(r.available_from);
        return !isNaN(d.getTime()) && d >= today && d <= cutoff;
      }).length;
    };

    // Soonest availability — next 5 assets becoming free
    const soonest = allRows
      .filter(r => r.availability_status === 'AVAILABLE_SOON' && r.available_from)
      .map(r => ({
        asset_id: r.asset_id,
        code: r.media_asset_code || r.asset_id,
        location: r.location || r.area || '—',
        city: r.city || '—',
        available_from: r.available_from,
      }))
      .sort((a, b) => a.available_from.localeCompare(b.available_from))
      .slice(0, 5);

    return {
      topCities,
      topTypes,
      soonest,
      freeIn7: within(7),
      freeIn15: within(15),
      freeIn30: within(30),
    };
  }, [allRows]);

  // ─── Held rows for bulk selection ──────────────────────────
  const heldRows = useMemo(() => sortedRows.filter(r => r.availability_status === 'HELD' && r.hold_id), [sortedRows]);

  const isAllHeldSelected = heldRows.length > 0 && heldRows.every(r => selectedHoldIds.has(r.hold_id!));
  const isSomeHeldSelected = selectedHoldIds.size > 0;

  const toggleHoldSelection = (holdId: string) => {
    setSelectedHoldIds(prev => {
      const next = new Set(prev);
      if (next.has(holdId)) next.delete(holdId);
      else next.add(holdId);
      return next;
    });
  };

  const toggleAllHeld = () => {
    if (isAllHeldSelected) {
      setSelectedHoldIds(new Set());
    } else {
      setSelectedHoldIds(new Set(heldRows.map(r => r.hold_id!)));
    }
  };

  const handleBulkReleaseHolds = async (holdIds: string[]) => {
    if (holdIds.length === 0) return;
    setBulkReleasing(true);
    try {
      const { error } = await supabase
        .from("asset_holds")
        .update({ status: "RELEASED" })
        .in("id", holdIds);
      if (error) throw error;
      toast({ title: "Holds released", description: `${holdIds.length} hold(s) released successfully` });
      setSelectedHoldIds(new Set());
      loadAvailability();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBulkReleasing(false);
    }
  };

  // ─── Sort UI helpers ───────────────────────────────────────
  const handleSort = (column: SortColumn) => {
    let newDir: SortDirection = 'asc';
    if (sortConfig.column === column) {
      if (sortConfig.direction === 'asc') newDir = 'desc';
      else if (sortConfig.direction === 'desc') newDir = null;
    }
    setSortConfig({ column: newDir ? column : null, direction: newDir });
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortConfig.column !== column) return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-4 w-4 ml-1" />;
    return <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // ─── Status Badge ──────────────────────────────────────────
  const getStatusBadge = (row: AvailabilityRow) => {
    switch (row.availability_status) {
      case 'VACANT_NOW':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />Available
          </Badge>
        );
      case 'AVAILABLE_SOON':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />Available from {formatDateIN(row.available_from)}
          </Badge>
        );
      case 'HELD':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  <Shield className="h-3 w-3 mr-1" />Held/Blocked
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <div>
                  <strong>{row.hold_type}</strong>
                  {row.hold_client_name && <span> — {row.hold_client_name}</span>}
                  <br />
                  {formatDateIN(row.hold_start_date)} → {formatDateIN(row.hold_end_date)}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'MAINTENANCE':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  <Wrench className="h-3 w-3 mr-1" />Under Maintenance
                </Badge>
              </TooltipTrigger>
              {row.deactivation_reason && (
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {row.deactivation_reason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      case 'REMOVED':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-rose-100 text-rose-800 border-rose-200">
                  <Ban className="h-3 w-3 mr-1" />Removed
                </Badge>
              </TooltipTrigger>
              {row.deactivation_reason && (
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {row.deactivation_reason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      case 'INACTIVE':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-gray-200 text-gray-800 border-gray-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />Inactive
                </Badge>
              </TooltipTrigger>
              {row.deactivation_reason && (
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {row.deactivation_reason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />Booked
          </Badge>
        );
    }
  };

  // ─── Export (legacy) ────────────────────────────────────────
  const handleLegacyExportExcel = async () => {
    if (sortedRows.length === 0) {
      toast({ title: "No Data", description: "No rows to export", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      await generateAvailabilityReportExcel(sortedRows, startDate, endDate, company?.name || undefined);
      toast({ title: "Export Complete", description: "Excel downloaded successfully" });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: "Export Failed", description: "Could not generate Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // ─── Proposal PPT Export ───────────────────────────────────
  const handleProposalPpt = async () => {
    if (sortedRows.length === 0) return;
    if (sortedRows.length > 200) {
      const ok = window.confirm(`Large proposal (${sortedRows.length} assets). This may take a while. Continue?`);
      if (!ok) return;
    }
    setProposalExporting(true);
    try {
      await generateProposalPpt({
        rows: sortedRows,
        startDate,
        endDate,
        companyName: company?.name,
        themeColor: company?.theme_color,
        cityFilter: selectedCity,
        mediaTypeFilter: selectedMediaType,
        showCardRate: true, // TODO: gate by role when RBAC hook is available
      });
      toast({ title: "Proposal PPT Ready", description: `${sortedRows.length} asset proposal downloaded` });
    } catch (err) {
      console.error('Proposal PPT error:', err);
      toast({ title: "Export Failed", description: "Could not generate Proposal PPT", variant: "destructive" });
    } finally {
      setProposalExporting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Media Availability Report</h1>
            <p className="text-muted-foreground mt-1">
              Check asset availability for specific date ranges
            </p>
          </div>
          {sortedRows.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2"
                disabled={proposalExporting}
                onClick={handleProposalPpt}
              >
                {proposalExporting ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" />Generating...</>
                ) : (
                  <><Presentation className="h-4 w-4 text-orange-600" />Download Proposal PPT</>
                )}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setCustomExportOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Custom Fields Export
              </Button>
            </div>
          )}
        </div>

        {/* Global List View Toolbar */}
        {!lv.loading && (
          <ListToolbar
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search area, location, campaign..."
            fields={lv.catalog.fields}
            groups={lv.catalog.groups}
            selectedFields={lv.selectedFields}
            defaultFieldKeys={lv.catalog.defaultFieldKeys}
            onFieldsChange={lv.setSelectedFields}
            presets={lv.presets}
            activePreset={lv.activePreset}
            onPresetSelect={lv.applyPreset}
            onPresetSave={lv.saveCurrentAsView}
            onPresetUpdate={lv.updateCurrentView}
            onPresetDelete={lv.deletePreset}
            onPresetDuplicate={lv.duplicatePreset}
            onExportExcel={(fields) => handleExportExcel(sortedRows, fields)}
            onExportPdf={(fields) => handleExportPdf(sortedRows, fields)}
            onReset={lv.resetToDefaults}
          />
        )}

        {/* Quick Date Range Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm font-medium text-muted-foreground mr-1">Quick:</span>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuickRange(7)}>
            <Zap className="h-3.5 w-3.5" /> Today → +7 Days
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuickRange(15)}>
            <Zap className="h-3.5 w-3.5" /> Today → +15 Days
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuickRange('month')}>
            <Zap className="h-3.5 w-3.5" /> Today → +1 Month
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setQuickRange(90)}>
            <Zap className="h-3.5 w-3.5" /> Today → +3 Months
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              Search Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger><SelectValue placeholder="All Cities" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
                  <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {mediaTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={loadAvailability} disabled={loading || !startDate?.trim() || !endDate?.trim()} className="w-full">
                  {loading ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Checking...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" />Check Availability</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Tier 1: Primary KPI Strip — sellable vs blocked vs at-risk ─── */}
        {allRows.length > 0 && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-4">
            {/* Sellable Vacant Now (green) */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'VACANT_NOW' ? 'all' : 'VACANT_NOW')}
              className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${statusFilter === 'VACANT_NOW' ? 'ring-2 ring-emerald-500 border-emerald-500/50' : 'border-border hover:border-emerald-400/50'}`}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-300" />
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                  {counts.vacantRatio}%
                </Badge>
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 leading-none">
                {counts.vacantNow}
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground">Sellable Vacant Now</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {counts.sellableSqft.toLocaleString('en-IN', { maximumFractionDigits: 0 })} sq.ft · {formatCurrency(counts.potentialRevenue)}
              </div>
            </button>

            {/* Available Soon (blue) */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'AVAILABLE_SOON' ? 'all' : 'AVAILABLE_SOON')}
              className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${statusFilter === 'AVAILABLE_SOON' ? 'ring-2 ring-blue-500 border-blue-500/50' : 'border-border hover:border-blue-400/50'}`}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-300" />
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-400 leading-none">
                {counts.availableSoon}
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground">Available Soon</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Pre-bookable in range
              </div>
            </button>

            {/* Booked / Occupied (indigo) */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'BOOKED_THROUGH_RANGE' ? 'all' : 'BOOKED_THROUGH_RANGE')}
              className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${statusFilter === 'BOOKED_THROUGH_RANGE' ? 'ring-2 ring-indigo-500 border-indigo-500/50' : 'border-border hover:border-indigo-400/50'}`}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-300" />
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-indigo-700 dark:text-indigo-400 leading-none">
                {counts.booked}
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground">Booked / Occupied</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Active in selected range
              </div>
            </button>

            {/* Held / Blocked (amber) */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'HELD' ? 'all' : 'HELD')}
              className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${statusFilter === 'HELD' ? 'ring-2 ring-amber-500 border-amber-500/50' : 'border-border hover:border-amber-400/50'}`}
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-300" />
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 leading-none">
                {counts.held}
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground">Held / Blocked</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Operationally reserved
              </div>
            </button>

            {/* At Risk / Non-Bookable (rose) */}
            <div
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-rose-400/50 col-span-2 md:col-span-1"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-300" />
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-400 leading-none">
                {counts.atRisk}
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground">At Risk / Non-Bookable</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                <span>Maint <b className="text-foreground">{counts.maintenance}</b></span>
                <span>Removed <b className="text-foreground">{counts.removed}</b></span>
                <span>Inactive <b className="text-foreground">{counts.inactive}</b></span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tier 2: Forecast strip — Becoming Free in 7/15/30d + Total in Range ─── */}
        {allRows.length > 0 && (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`relative overflow-hidden rounded-xl border bg-card p-3.5 text-left transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary border-primary/50' : 'border-border hover:border-primary/40'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total in Range</span>
              </div>
              <div className="text-xl font-bold tracking-tight">{counts.total}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {counts.totalSqft.toLocaleString('en-IN', { maximumFractionDigits: 0 })} sq.ft considered
              </div>
            </button>

            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3.5 transition-all hover:shadow-md hover:border-teal-400/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="rounded-md bg-teal-500/10 p-1.5 text-teal-600 dark:text-teal-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Free in 7 Days</span>
              </div>
              <div className="text-xl font-bold tracking-tight text-teal-700 dark:text-teal-400">{summaries.freeIn7}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Pipeline this week</div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3.5 transition-all hover:shadow-md hover:border-cyan-400/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="rounded-md bg-cyan-500/10 p-1.5 text-cyan-600 dark:text-cyan-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Free in 15 Days</span>
              </div>
              <div className="text-xl font-bold tracking-tight text-cyan-700 dark:text-cyan-400">{summaries.freeIn15}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Short-term pipeline</div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3.5 transition-all hover:shadow-md hover:border-sky-400/50">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="rounded-md bg-sky-500/10 p-1.5 text-sky-600 dark:text-sky-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Free in 30 Days</span>
              </div>
              <div className="text-xl font-bold tracking-tight text-sky-700 dark:text-sky-400">{summaries.freeIn30}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Monthly pipeline</div>
            </div>
          </div>
        )}

        {/* ─── Grouped Summaries: Top Cities · Top Media Types · Soonest Availability ─── */}
        {allRows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {/* Top Cities */}
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  Top Cities by Sellable Vacant
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                {summaries.topCities.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No sellable inventory in range.</div>
                ) : (
                  <div className="space-y-2">
                    {summaries.topCities.map(([city, count]) => {
                      const max = summaries.topCities[0]?.[1] || 1;
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={city} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate font-medium text-foreground">{city}</span>
                            <span className="text-muted-foreground tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Media Types */}
            <Card className="border-border/60">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Top Media Types by Sellable Vacant
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                {summaries.topTypes.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No sellable inventory in range.</div>
                ) : (
                  <div className="space-y-2">
                    {summaries.topTypes.map(([type, count]) => {
                      const max = summaries.topTypes[0]?.[1] || 1;
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate font-medium text-foreground">{type}</span>
                            <span className="text-muted-foreground tabular-nums">{count}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Soonest Availability */}
            <Card className="border-border/60 md:col-span-2 lg:col-span-1">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-600" />
                  Soonest Availability
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                {summaries.soonest.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No upcoming availability detected.</div>
                ) : (
                  <div className="space-y-1.5">
                    {summaries.soonest.map((s) => (
                      <div
                        key={s.asset_id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate text-foreground">{s.code}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {s.location} · {s.city}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] border-teal-500/30 text-teal-700 dark:text-teal-400 font-medium">
                          {formatDateIN(s.available_from)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search bar + Column toggle */}
        {allRows.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search area, location, campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses ({allRows.length})</SelectItem>
                <SelectItem value="VACANT_NOW">Vacant Now ({counts.vacantNow})</SelectItem>
                <SelectItem value="AVAILABLE_SOON">Available Soon ({counts.availableSoon})</SelectItem>
                {counts.booked > 0 && <SelectItem value="BOOKED_THROUGH_RANGE">Booked ({counts.booked})</SelectItem>}
                {counts.held > 0 && <SelectItem value="HELD">Held/Blocked ({counts.held})</SelectItem>}
                {counts.maintenance > 0 && <SelectItem value="MAINTENANCE">Under Maintenance ({counts.maintenance})</SelectItem>}
                {counts.removed > 0 && <SelectItem value="REMOVED">Removed ({counts.removed})</SelectItem>}
                {counts.inactive > 0 && <SelectItem value="INACTIVE">Inactive ({counts.inactive})</SelectItem>}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Toggle Columns</span>
                  <Button variant="ghost" size="sm" onClick={resetColumns} className="h-7 px-2">
                    <RotateCcw className="h-3 w-3 mr-1" /> Reset
                  </Button>
                </div>
                <ScrollArea className="h-[280px]">
                  <div className="space-y-2">
                    {ALL_COLUMNS.map(col => (
                      <div key={col} className="flex items-center space-x-2">
                        <Checkbox id={`col-${col}`} checked={isColumnVisible(col)} onCheckedChange={() => toggleColumn(col)} />
                        <label htmlFor={`col-${col}`} className="text-sm cursor-pointer">
                          {COLUMN_LABELS[col] || col}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <div className="text-sm text-muted-foreground ml-auto">
              Showing {sortedRows.length} of {allRows.length} assets
            </div>
          </div>
        )}

        {/* Bulk Hold Release Bar */}
        {heldRows.length > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <Shield className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
              {heldRows.length} held asset{heldRows.length !== 1 ? 's' : ''}
            </span>
            {isSomeHeldSelected && (
              <span className="text-sm text-purple-600 dark:text-purple-300">
                ({selectedHoldIds.size} selected)
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isSomeHeldSelected && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={bulkReleasing}
                  onClick={() => handleBulkReleaseHolds(Array.from(selectedHoldIds))}
                  className="gap-1 border-purple-300 text-purple-700 hover:bg-purple-100"
                >
                  {bulkReleasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                  Release Selected ({selectedHoldIds.size})
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkReleasing}
                onClick={() => handleBulkReleaseHolds(heldRows.map(r => r.hold_id!))}
                className="gap-1"
              >
                {bulkReleasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Release All Held ({heldRows.length})
              </Button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <Card>
          <CardContent className="pt-6">
            {sortedRows.length === 0 && !loading ? (
              <div className="text-center py-12 text-muted-foreground">
                {allRows.length > 0
                  ? "No assets match your filters"
                  : "Click a quick range button or 'Check Availability' to load results"}
              </div>
            ) : loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading availability data...
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-md">
                <Table className="min-w-[1000px]">
                   <TableHeader>
                    <TableRow>
                      {heldRows.length > 0 && (
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={isAllHeldSelected}
                            onCheckedChange={toggleAllHeld}
                            aria-label="Select all held assets"
                          />
                        </TableHead>
                      )}
                      <TableHead className="whitespace-nowrap w-[50px] text-center">S.No</TableHead>
                      {isColumnVisible('area') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('area')}>
                          <div className="flex items-center">Area {getSortIcon('area')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('location') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap min-w-[200px]" onClick={() => handleSort('location')}>
                          <div className="flex items-center">Location {getSortIcon('location')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('direction') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('direction')}>
                          <div className="flex items-center">Direction {getSortIcon('direction')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('dimensions') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('dimensions')}>
                          <div className="flex items-center">Dimensions {getSortIcon('dimensions')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('sqft') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('sqft')}>
                          <div className="flex items-center">Sq.Ft {getSortIcon('sqft')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('illumination') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('illumination')}>
                          <div className="flex items-center">Illumination {getSortIcon('illumination')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('status') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('status')}>
                          <div className="flex items-center">Status {getSortIcon('status')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('availability_timeline') && (
                        <TableHead className="whitespace-nowrap min-w-[180px]">
                          Availability Timeline
                        </TableHead>
                      )}
                      {isColumnVisible('available_from') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('available_from')}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center">Available From {getSortIcon('available_from')}</div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                Available From = next day after booking end (inclusive booking rule).
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                      )}
                      {isColumnVisible('card_rate') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 text-right whitespace-nowrap" onClick={() => handleSort('card_rate')}>
                          <div className="flex items-center justify-end">Card Rate {getSortIcon('card_rate')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('asset_id') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('asset_id')}>
                          <div className="flex items-center">Asset ID {getSortIcon('asset_id')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('type') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('type')}>
                          <div className="flex items-center">Type {getSortIcon('type')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('city') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('city')}>
                          <div className="flex items-center">City {getSortIcon('city')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('booked_till') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('booked_till')}>
                          <div className="flex items-center">Booked Till {getSortIcon('booked_till')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('campaign') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap min-w-[160px]" onClick={() => handleSort('campaign')}>
                          <div className="flex items-center">Campaign {getSortIcon('campaign')}</div>
                        </TableHead>
                      )}
                      <TableHead className="whitespace-nowrap w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row, rowIndex) => (
                      <TableRow key={row.asset_id}>
                        {heldRows.length > 0 && (
                          <TableCell>
                            {row.availability_status === 'HELD' && row.hold_id ? (
                              <Checkbox
                                checked={selectedHoldIds.has(row.hold_id)}
                                onCheckedChange={() => toggleHoldSelection(row.hold_id!)}
                                aria-label={`Select hold for ${row.media_asset_code || row.asset_id}`}
                              />
                            ) : null}
                          </TableCell>
                        )}
                        <TableCell className="text-center whitespace-nowrap text-muted-foreground">{rowIndex + 1}</TableCell>
                        {isColumnVisible('area') && <TableCell className="whitespace-nowrap">{row.area}</TableCell>}
                        {isColumnVisible('location') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="min-w-[150px]">{row.location}</span>
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible('direction') && <TableCell className="whitespace-nowrap">{row.direction || '-'}</TableCell>}
                        {isColumnVisible('dimensions') && <TableCell className="whitespace-nowrap">{row.dimension || '-'}</TableCell>}
                        {isColumnVisible('sqft') && <TableCell className="whitespace-nowrap">{row.sqft || '-'}</TableCell>}
                        {isColumnVisible('illumination') && <TableCell className="whitespace-nowrap">{row.illumination || '-'}</TableCell>}
                        {isColumnVisible('status') && <TableCell>{getStatusBadge(row)}</TableCell>}
                        {isColumnVisible('availability_timeline') && (
                          <TableCell className="align-top py-2">
                            <div className="flex flex-col gap-0.5 text-xs leading-tight min-w-[170px]">
                              {buildAvailabilityTimeline(row).lines.map((ln, i) => (
                                <div key={i} className="flex gap-1">
                                  {ln.label && (
                                    <span className="text-muted-foreground">{ln.label}:</span>
                                  )}
                                  <span
                                    className={
                                      ln.label
                                        ? 'font-medium text-foreground truncate max-w-[140px]'
                                        : 'font-semibold text-foreground'
                                    }
                                    title={ln.value}
                                  >
                                    {ln.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        )}
                        {isColumnVisible('available_from') && (
                          <TableCell>
                            {row.availability_status === 'VACANT_NOW' ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                {formatDateIN(row.available_from)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                {formatDateIN(row.available_from)}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {isColumnVisible('card_rate') && (
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            {formatCurrency(row.card_rate)}
                          </TableCell>
                        )}
                        {isColumnVisible('asset_id') && (
                          <TableCell className="font-mono text-sm whitespace-nowrap">
                            {row.media_asset_code || row.asset_id}
                          </TableCell>
                        )}
                        {isColumnVisible('type') && (
                          <TableCell><Badge variant="outline">{row.media_type}</Badge></TableCell>
                        )}
                        {isColumnVisible('city') && <TableCell className="whitespace-nowrap">{row.city}</TableCell>}
                        {isColumnVisible('booked_till') && (
                          <TableCell className="whitespace-nowrap">
                            {formatDateIN(row.booked_till)}
                          </TableCell>
                        )}
                        {isColumnVisible('campaign') && (
                          <TableCell>
                            {row.current_campaign_name ? (
                              <div className="text-xs">
                                <div className="font-medium truncate max-w-[150px]">{row.current_campaign_name}</div>
                                <div className="text-muted-foreground truncate max-w-[150px]">{row.current_client_name}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        {/* Action column */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {row.availability_status === 'HELD' && row.hold_id ? (
                                <DropdownMenuItem onClick={() => {
                                  setReleaseTarget({ holdId: row.hold_id!, label: row.media_asset_code || row.asset_id, clientName: row.hold_client_name });
                                  setReleaseDialogOpen(true);
                                }}>
                                  <ShieldOff className="h-4 w-4 mr-2" />Release Hold
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => {
                                  setHoldTarget({ assetId: row.asset_id, label: row.media_asset_code || row.asset_id, bookingEnd: row.booked_till });
                                  setHoldDialogOpen(true);
                                }}>
                                  <Shield className="h-4 w-4 mr-2" />Block for Client
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {sortedRows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3 px-1">
                <strong>Note:</strong> If a booking ends on the 16th, the asset becomes available from the 17th. "Available From" = booking end date + 1 day.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Export Dialog */}
      <CustomExportDialog
        open={customExportOpen}
        onOpenChange={setCustomExportOpen}
        rows={sortedRows}
        startDate={startDate}
        endDate={endDate}
        companyName={company?.name}
      />

      {/* Hold Dialog */}
      <AssetHoldDialog
        open={holdDialogOpen}
        onOpenChange={setHoldDialogOpen}
        assetId={holdTarget.assetId}
        assetLabel={holdTarget.label}
        currentBookingEnd={holdTarget.bookingEnd}
        fallbackStartDate={startDate}
        onSuccess={loadAvailability}
      />

      {/* Release Hold Dialog */}
      <ReleaseHoldDialog
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        holdId={releaseTarget.holdId}
        assetLabel={releaseTarget.label}
        clientName={releaseTarget.clientName}
        onSuccess={loadAvailability}
      />
    </div>
  );
}

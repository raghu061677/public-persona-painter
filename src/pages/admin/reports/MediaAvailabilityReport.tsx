import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
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
import { format, addDays, addMonths } from "date-fns";
import { formatCurrency } from "@/utils/mediaAssets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useColumnPrefs } from "@/hooks/use-column-prefs";
import { generateAvailabilityReportExcel } from "@/lib/reports/generateAvailabilityReportExcel";

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
  availability_status: 'VACANT_NOW' | 'AVAILABLE_SOON' | 'BOOKED_THROUGH_RANGE';
  available_from: string; // date string
  booked_till: string | null;
  current_campaign_id: string | null;
  current_campaign_name: string | null;
  current_client_name: string | null;
  booking_start: string | null;
  booking_end: string | null;
}

// ─── Column definitions ──────────────────────────────────────
const ALL_COLUMNS = [
  'area', 'location', 'direction', 'dimensions', 'sqft',
  'illumination', 'status', 'available_from', 'card_rate',
  'asset_id', 'type', 'city', 'booked_till', 'campaign',
] as const;

const DEFAULT_VISIBLE = [
  'area', 'location', 'direction', 'dimensions', 'sqft',
  'illumination', 'status', 'available_from',
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
};

type SortColumn = 'asset_id' | 'location' | 'area' | 'available_from' | null;
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

  // ─── Load availability via RPC ─────────────────────────────
  const loadAvailability = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('fn_media_availability_range', {
        p_company_id: company.id,
        p_start: startDate,
        p_end: endDate,
        p_city: selectedCity === 'all' ? null : selectedCity,
        p_media_type: selectedMediaType === 'all' ? null : selectedMediaType,
      });

      if (error) throw error;
      setAllRows((data as AvailabilityRow[]) || []);
      toast({
        title: "Report Updated",
        description: `Found ${data?.length || 0} assets in range`,
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
      let aVal = '';
      let bVal = '';
      switch (sortConfig.column) {
        case 'asset_id': aVal = a.media_asset_code || a.asset_id; bVal = b.media_asset_code || b.asset_id; break;
        case 'location': aVal = a.location || ''; bVal = b.location || ''; break;
        case 'area': aVal = a.area || ''; bVal = b.area || ''; break;
        case 'available_from': aVal = a.available_from || ''; bVal = b.available_from || ''; break;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortConfig]);

  // ─── Counts ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const vacantNow = allRows.filter(r => r.availability_status === 'VACANT_NOW').length;
    const availableSoon = allRows.filter(r => r.availability_status === 'AVAILABLE_SOON').length;
    const totalSqft = allRows.reduce((s, r) => s + (Number(r.sqft) || 0), 0);
    const potentialRevenue = allRows
      .filter(r => r.availability_status === 'VACANT_NOW')
      .reduce((s, r) => s + (Number(r.card_rate) || 0), 0);
    return { total: allRows.length, vacantNow, availableSoon, totalSqft, potentialRevenue };
  }, [allRows]);

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
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VACANT_NOW':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />Available
          </Badge>
        );
      case 'AVAILABLE_SOON':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />Available Soon
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />Booked
          </Badge>
        );
    }
  };

  // ─── Export ────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (sortedRows.length === 0) {
      toast({ title: "No Data", description: "No rows to export", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      await generateAvailabilityReportExcel(sortedRows, startDate, endDate);
      toast({ title: "Export Complete", description: "Excel downloaded successfully" });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: "Export Failed", description: "Could not generate Excel", variant: "destructive" });
    } finally {
      setExporting(false);
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
          {allRows.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={exporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Filtered Data ({sortedRows.length} rows)</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

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
                <Button onClick={loadAvailability} disabled={loading} className="w-full">
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

        {/* Summary Cards */}
        {allRows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'all' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total in Range</div>
                <div className="text-3xl font-bold mt-1">{counts.total}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {counts.totalSqft.toFixed(0)} sq.ft total
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'VACANT_NOW' ? 'ring-2 ring-green-500' : 'hover:border-green-400'}`}
              onClick={() => setStatusFilter(statusFilter === 'VACANT_NOW' ? 'all' : 'VACANT_NOW')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">Vacant Now</span>
                </div>
                <div className="text-3xl font-bold mt-1 text-green-600">{counts.vacantNow}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(counts.potentialRevenue)} potential
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-colors ${statusFilter === 'AVAILABLE_SOON' ? 'ring-2 ring-yellow-500' : 'hover:border-yellow-400'}`}
              onClick={() => setStatusFilter(statusFilter === 'AVAILABLE_SOON' ? 'all' : 'AVAILABLE_SOON')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">Available Soon</span>
                </div>
                <div className="text-3xl font-bold mt-1 text-yellow-600">{counts.availableSoon}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pre-bookable within range
                </div>
              </CardContent>
            </Card>
            <Card className="hover:border-muted-foreground/30 transition-colors">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Date Range</div>
                <div className="text-lg font-semibold mt-1">
                  {format(new Date(startDate), 'dd MMM')} – {format(new Date(endDate), 'dd MMM yyyy')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)} days
                </div>
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
                      {isColumnVisible('direction') && <TableHead className="whitespace-nowrap">Direction</TableHead>}
                      {isColumnVisible('dimensions') && <TableHead className="whitespace-nowrap">Dimensions</TableHead>}
                      {isColumnVisible('sqft') && <TableHead className="whitespace-nowrap">Sq.Ft</TableHead>}
                      {isColumnVisible('illumination') && <TableHead className="whitespace-nowrap">Illumination</TableHead>}
                      {isColumnVisible('status') && <TableHead className="whitespace-nowrap">Status</TableHead>}
                      {isColumnVisible('available_from') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('available_from')}>
                          <div className="flex items-center">Available From {getSortIcon('available_from')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('card_rate') && <TableHead className="text-right whitespace-nowrap">Card Rate</TableHead>}
                      {isColumnVisible('asset_id') && (
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap" onClick={() => handleSort('asset_id')}>
                          <div className="flex items-center">Asset ID {getSortIcon('asset_id')}</div>
                        </TableHead>
                      )}
                      {isColumnVisible('type') && <TableHead className="whitespace-nowrap">Type</TableHead>}
                      {isColumnVisible('city') && <TableHead className="whitespace-nowrap">City</TableHead>}
                      {isColumnVisible('booked_till') && <TableHead className="whitespace-nowrap">Booked Till</TableHead>}
                      {isColumnVisible('campaign') && <TableHead className="whitespace-nowrap min-w-[160px]">Campaign</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRows.map((row) => (
                      <TableRow key={row.asset_id}>
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
                        {isColumnVisible('status') && <TableCell>{getStatusBadge(row.availability_status)}</TableCell>}
                        {isColumnVisible('available_from') && (
                          <TableCell>
                            {row.availability_status === 'VACANT_NOW' ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                {format(new Date(row.available_from), 'dd-MM-yyyy')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                {format(new Date(row.available_from), 'dd-MM-yyyy')}
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
                            {row.booked_till ? format(new Date(row.booked_till), 'dd-MM-yyyy') : '-'}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

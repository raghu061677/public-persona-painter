import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileSpreadsheet,
  Presentation,
  FileText,
  Columns,
  RotateCcw
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
import { 
  generateAvailabilityExcel, 
  generateAvailabilityPDF, 
  generateAvailabilityPPT,
  ExportTab 
} from "@/lib/reports/generateAvailabilityExports";
import { generateAvailabilityPPTWithImages } from "@/lib/reports/generateAvailabilityPPTWithImages";
import { useColumnPrefs } from "@/hooks/use-column-prefs";

// Column definitions for the availability tables
const ALL_COLUMNS = [
  'asset_id', 'type', 'location', 'area', 'city', 'dimensions', 'sqft', 
  'direction', 'illumination', 'status', 'card_rate', 'booking', 'available_from'
] as const;
const DEFAULT_VISIBLE = ['asset_id', 'type', 'location', 'area', 'status', 'card_rate', 'booking', 'available_from'];
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
  booking: 'Booking Info',
  available_from: 'Available From',
};

type SortColumn = 'asset_id' | 'location' | 'area' | 'available_from' | null;
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

interface BookingInfo {
  campaign_id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface AvailableAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string | null;
  illumination_type?: string | null;
  availability_status: 'available' | 'available_soon';
  next_available_from: string | null;
}

interface BookedAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  status: string;
  direction?: string | null;
  illumination_type?: string | null;
  availability_status: 'booked' | 'conflict';
  current_booking: BookingInfo | null;
  all_bookings: BookingInfo[];
  available_from: string | null;
}

interface AvailabilitySummary {
  total_assets: number;
  available_count: number;
  booked_count: number;
  available_soon_count: number;
  conflict_count: number;
  total_sqft_available: number;
  potential_revenue: number;
}

type DialogType = 'available' | 'booked' | 'soon' | 'conflict' | null;

export default function MediaAvailabilityReport() {
  const { company } = useCompany();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("available");
  
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [bookedAssets, setBookedAssets] = useState<BookedAsset[]>([]);
  const [availableSoonAssets, setAvailableSoonAssets] = useState<BookedAsset[]>([]);
  const [summary, setSummary] = useState<AvailabilitySummary | null>(null);
  
  const [cities, setCities] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  
  // Sort state for each tab
  const [availableSortConfig, setAvailableSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [bookedSortConfig, setBookedSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [soonSortConfig, setSoonSortConfig] = useState<SortConfig>({ column: null, direction: null });
  const [exporting, setExporting] = useState(false);
  const [showDialog, setShowDialog] = useState<DialogType>(null);
  
  // Column visibility
  const {
    visibleKeys,
    setVisibleKeys,
    reset: resetColumns,
  } = useColumnPrefs('availability-report', [...ALL_COLUMNS], DEFAULT_VISIBLE);
  
  const isColumnVisible = (col: string) => visibleKeys.includes(col);
  const toggleColumn = (col: string) => {
    if (visibleKeys.includes(col)) {
      setVisibleKeys(visibleKeys.filter(k => k !== col));
    } else {
      setVisibleKeys([...visibleKeys, col]);
    }
  };
  
  // Get conflict assets from booked assets
  const conflictAssets = useMemo(() => {
    return bookedAssets.filter(a => a.availability_status === 'conflict');
  }, [bookedAssets]);

  // Get non-conflict booked assets
  const nonConflictBookedAssets = useMemo(() => {
    return bookedAssets.filter(a => a.availability_status !== 'conflict');
  }, [bookedAssets]);

  const getExportTabFromActiveTab = (): ExportTab => {
    switch (activeTab) {
      case 'available': return 'available';
      case 'booked': return 'booked';
      case 'soon': return 'soon';
      default: return 'all';
    }
  };

  const handleExport = async (type: 'excel' | 'pdf' | 'ppt' | 'ppt-images', exportScope: 'current' | 'all' = 'current') => {
    if (!summary) {
      toast({ title: "No Data", description: "Please check availability first", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const exportTab: ExportTab = exportScope === 'all' ? 'all' : getExportTabFromActiveTab();
      const exportData = {
        availableAssets,
        bookedAssets,
        availableSoonAssets,
        conflictAssets,
        dateRange: `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}`,
        summary: {
          total_assets: summary.total_assets,
          available_count: summary.available_count,
          booked_count: summary.booked_count,
          available_soon_count: summary.available_soon_count,
          conflict_count: summary.conflict_count,
          potential_revenue: summary.potential_revenue,
        },
        exportTab,
        companyId: company?.id,
      };
      
      if (type === 'excel') {
        await generateAvailabilityExcel(exportData);
      } else if (type === 'pdf') {
        await generateAvailabilityPDF(exportData);
      } else if (type === 'ppt-images') {
        // Premium image-based PPT export (like Plans module)
        await generateAvailabilityPPTWithImages(exportData);
      } else {
        // Basic table-based PPT export
        await generateAvailabilityPPT(exportData);
      }
      
      const tabLabel = exportScope === 'all' ? 'All data' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      const exportTypeLabel = type === 'ppt-images' ? 'PPT (with images)' : type.toUpperCase();
      toast({ title: "Export Complete", description: `${exportTypeLabel} (${tabLabel}) downloaded successfully` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Could not generate the report", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportConflicts = async (type: 'excel' | 'pdf' | 'ppt') => {
    if (!summary || conflictAssets.length === 0) {
      toast({ title: "No Data", description: "No conflicts to export", variant: "destructive" });
      return;
    }
    setExporting(true);
    try {
      const exportData = {
        availableAssets: [],
        bookedAssets: [],
        availableSoonAssets: [],
        conflictAssets,
        dateRange: `${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}`,
        summary: {
          total_assets: summary.total_assets,
          available_count: summary.available_count,
          booked_count: summary.booked_count,
          available_soon_count: summary.available_soon_count,
          conflict_count: summary.conflict_count,
          potential_revenue: summary.potential_revenue,
        },
        exportTab: 'conflict' as ExportTab,
      };
      if (type === 'excel') await generateAvailabilityExcel(exportData);
      else if (type === 'pdf') await generateAvailabilityPDF(exportData);
      else await generateAvailabilityPPT(exportData);
      toast({ title: "Export Complete", description: `Conflicts ${type.toUpperCase()} downloaded successfully` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "Could not generate the report", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      loadFilters();
    }
  }, [company]);

  const loadFilters = async () => {
    if (!company?.id) return;
    
    const { data } = await supabase
      .from('media_assets')
      .select('city, media_type')
      .eq('company_id', company.id);
    
    if (data) {
      const uniqueCities = [...new Set(data.map(a => a.city).filter(Boolean))];
      const uniqueTypes = [...new Set(data.map(a => a.media_type).filter(Boolean))];
      setCities(uniqueCities);
      setMediaTypes(uniqueTypes);
    }
  };

  const loadAvailability = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('get-media-availability', {
        body: {
          company_id: company.id,
          start_date: startDate,
          end_date: endDate,
          city: selectedCity,
          media_type: selectedMediaType,
        }
      });

      if (error) throw error;

      setAvailableAssets(data.available_assets || []);
      setBookedAssets(data.booked_assets || []);
      setAvailableSoonAssets(data.available_soon_assets || []);
      setSummary(data.summary || null);

      toast({
        title: "Report Updated",
        description: `Found ${data.summary?.available_count || 0} available assets`,
      });
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: "Failed to load availability report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    switch (range) {
      case 'next-week':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(addDays(today, 7), 'yyyy-MM-dd'));
        break;
      case 'next-15-days':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(addDays(today, 15), 'yyyy-MM-dd'));
        break;
      case 'next-month':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(addMonths(today, 1), 'yyyy-MM-dd'));
        break;
      case 'next-quarter':
        setStartDate(format(today, 'yyyy-MM-dd'));
        setEndDate(format(addMonths(today, 3), 'yyyy-MM-dd'));
        break;
    }
  };

  const filterBySearchAvailable = (assets: AvailableAsset[]) => {
    if (!searchTerm) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a => 
      a.id?.toLowerCase().includes(term) ||
      a.media_asset_code?.toLowerCase().includes(term) ||
      a.city?.toLowerCase().includes(term) ||
      a.area?.toLowerCase().includes(term) ||
      a.location?.toLowerCase().includes(term) ||
      a.media_type?.toLowerCase().includes(term)
    );
  };

  const filterBySearchBooked = (assets: BookedAsset[]) => {
    if (!searchTerm) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a =>
      a.id?.toLowerCase().includes(term) ||
      a.media_asset_code?.toLowerCase().includes(term) ||
      a.city?.toLowerCase().includes(term) ||
      a.area?.toLowerCase().includes(term) ||
      a.location?.toLowerCase().includes(term) ||
      a.media_type?.toLowerCase().includes(term)
    );
  };

  const getAvailableStatusBadge = (asset: AvailableAsset) => {
    switch (asset.availability_status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />Available
        </Badge>;
      case 'available_soon':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />Available Soon
        </Badge>;
      default:
        return null;
    }
  };

  const getBookedStatusBadge = (asset: BookedAsset) => {
    switch (asset.availability_status) {
      case 'booked':
        return <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />Booked
        </Badge>;
      case 'conflict':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          <AlertTriangle className="h-3 w-3 mr-1" />Conflict
        </Badge>;
      default:
        return null;
    }
  };

  // Sorting helpers
  const handleSort = (
    column: SortColumn,
    currentConfig: SortConfig,
    setConfig: React.Dispatch<React.SetStateAction<SortConfig>>
  ) => {
    let newDirection: SortDirection = 'asc';
    if (currentConfig.column === column) {
      if (currentConfig.direction === 'asc') newDirection = 'desc';
      else if (currentConfig.direction === 'desc') newDirection = null;
    }
    setConfig({ column: newDirection ? column : null, direction: newDirection });
  };

  const getSortIcon = (column: SortColumn, config: SortConfig) => {
    if (config.column !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    if (config.direction === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    if (config.direction === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
  };

  const sortAssets = <T extends AvailableAsset | BookedAsset>(assets: T[], config: SortConfig): T[] => {
    if (!config.column || !config.direction) return assets;
    
    return [...assets].sort((a, b) => {
      let aVal: string | null = '';
      let bVal: string | null = '';
      
      switch (config.column) {
        case 'asset_id':
          aVal = a.media_asset_code || a.id;
          bVal = b.media_asset_code || b.id;
          break;
        case 'location':
          aVal = a.location || '';
          bVal = b.location || '';
          break;
        case 'area':
          aVal = a.area || '';
          bVal = b.area || '';
          break;
        case 'available_from':
          aVal = (a as BookedAsset).available_from || '';
          bVal = (b as BookedAsset).available_from || '';
          break;
        default:
          return 0;
      }
      
      const comparison = (aVal || '').localeCompare(bVal || '');
      return config.direction === 'asc' ? comparison : -comparison;
    });
  };

  const filteredAvailable = filterBySearchAvailable(availableAssets);
  const filteredBooked = filterBySearchBooked(nonConflictBookedAssets);
  const filteredAvailableSoon = filterBySearchBooked(availableSoonAssets);

  // Apply sorting
  const sortedAvailable = useMemo(() => sortAssets(filteredAvailable, availableSortConfig), [filteredAvailable, availableSortConfig]);
  const sortedBooked = useMemo(() => sortAssets(filteredBooked, bookedSortConfig), [filteredBooked, bookedSortConfig]);
  const sortedAvailableSoon = useMemo(() => sortAssets(filteredAvailableSoon, soonSortConfig), [filteredAvailableSoon, soonSortConfig]);

  // Render asset dialog content
  const renderDialogAssets = (type: DialogType) => {
    let assets: (AvailableAsset | BookedAsset)[] = [];
    let title = "";
    let icon = null;
    let colorClass = "";

    switch (type) {
      case 'available':
        assets = sortedAvailable;
        title = `Available Assets (${assets.length})`;
        icon = <CheckCircle2 className="h-5 w-5 text-green-600" />;
        colorClass = "border-green-200";
        break;
      case 'booked':
        assets = sortedBooked;
        title = `Booked Assets (${assets.length})`;
        icon = <XCircle className="h-5 w-5 text-red-600" />;
        colorClass = "border-red-200";
        break;
      case 'soon':
        assets = sortedAvailableSoon;
        title = `Available Soon (${assets.length})`;
        icon = <Clock className="h-5 w-5 text-yellow-600" />;
        colorClass = "border-yellow-200";
        break;
      case 'conflict':
        assets = conflictAssets;
        title = `Booking Conflicts (${assets.length})`;
        icon = <AlertTriangle className="h-5 w-5 text-orange-600" />;
        colorClass = "border-orange-200";
        break;
    }

    return (
      <Dialog open={showDialog === type} onOpenChange={(open) => setShowDialog(open ? type : null)}>
        {/*
          NOTE: Use a fixed container height + min-h-0 on the scroll region.
          This prevents flex overflow issues where the content cannot scroll
          (commonly seen when cards are taller than the available viewport).
        */}
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {icon}
              {title}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0 overscroll-contain">
            <div className="space-y-3 pr-4 pb-4">
              {assets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No assets found</p>
              ) : (
                assets.map((asset) => {
                  const bookedAsset = asset as BookedAsset;
                  const isConflict = type === 'conflict';
                  const isBooked = type === 'booked' || type === 'soon';
                  
                  return (
                    <Card key={asset.id} className={colorClass}>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{asset.media_asset_code || asset.id}</h4>
                            <p className="text-sm text-muted-foreground">{asset.location}</p>
                            <p className="text-xs text-muted-foreground">{asset.city}, {asset.area}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-1">{asset.media_type}</Badge>
                            <p className="text-sm font-medium">{formatCurrency(asset.card_rate)}</p>
                          </div>
                        </div>
                        
                        {/* Extra info row */}
                        <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                          {asset.dimensions && <span>Dim: {asset.dimensions}</span>}
                          {asset.total_sqft && <span>Sq.Ft: {asset.total_sqft}</span>}
                          {asset.direction && <span>Dir: {asset.direction}</span>}
                          {asset.illumination_type && <span>Illum: {asset.illumination_type}</span>}
                        </div>
                        
                        {/* Booking info for booked/soon types */}
                        {isBooked && bookedAsset.current_booking && (
                          <div className="mt-2 bg-muted/50 rounded p-2 text-sm">
                            <div className="font-medium">{bookedAsset.current_booking.campaign_name}</div>
                            <p className="text-xs text-muted-foreground">{bookedAsset.current_booking.client_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(bookedAsset.current_booking.start_date), 'dd MMM')} - {format(new Date(bookedAsset.current_booking.end_date), 'dd MMM yyyy')}
                            </p>
                          </div>
                        )}
                        
                        {/* Conflict details */}
                        {isConflict && bookedAsset.all_bookings && bookedAsset.all_bookings.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Overlapping Campaigns ({bookedAsset.all_bookings.length}):</p>
                            {bookedAsset.all_bookings.map((booking, idx) => (
                              <div key={idx} className="bg-muted/50 rounded p-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{booking.campaign_name}</span>
                                  <Badge variant="outline" className="text-xs">{booking.status}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{booking.client_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(booking.start_date), 'dd MMM yyyy')} - {format(new Date(booking.end_date), 'dd MMM yyyy')}
                                </p>
                                {/* Campaign ID for easy identification */}
                                <p className="text-xs font-mono text-muted-foreground mt-1">
                                  ID: <span className="select-all">{booking.campaign_id}</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Media Availability Report</h1>
            <p className="text-muted-foreground mt-1">
              Check asset availability for specific date ranges
            </p>
          </div>
          {summary && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={exporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? "Exporting..." : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Export Current Tab ({activeTab})</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('excel', 'current')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel ({activeTab})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('ppt-images', 'current')}>
                  <Presentation className="h-4 w-4 mr-2 text-primary" />
                  <span className="font-medium">PPT with Images ({activeTab})</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('ppt', 'current')}>
                  <Presentation className="h-4 w-4 mr-2" />
                  PPT Table Only ({activeTab})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf', 'current')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF ({activeTab})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Export All Data</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport('excel', 'all')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel (All)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('ppt-images', 'all')}>
                  <Presentation className="h-4 w-4 mr-2 text-primary" />
                  <span className="font-medium">PPT with Images (All)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('ppt', 'all')}>
                  <Presentation className="h-4 w-4 mr-2" />
                  PPT Table Only (All)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf', 'all')}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF (All)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Search Criteria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {mediaTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  onClick={loadAvailability} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Check Availability
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Quick date range buttons */}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('next-week')}>
                Next Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('next-15-days')}>
                Next 15 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('next-month')}>
                Next Month
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickDateRange('next-quarter')}>
                Next Quarter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards - All Clickable */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card 
              className="cursor-pointer hover:border-green-400 transition-colors"
              onClick={() => setShowDialog('available')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-green-600">{summary.available_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(summary.potential_revenue)} potential • Click to view
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:border-red-400 transition-colors"
              onClick={() => setShowDialog('booked')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div className="text-sm text-muted-foreground">Booked</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-red-600">{summary.booked_count - summary.conflict_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  During selected period • Click to view
                </div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:border-yellow-400 transition-colors"
              onClick={() => setShowDialog('soon')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div className="text-sm text-muted-foreground">Available Soon</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-yellow-600">{summary.available_soon_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Becomes free during period • Click to view
                </div>
              </CardContent>
            </Card>
            <Card 
              className={summary.conflict_count > 0 ? "cursor-pointer hover:border-orange-400 transition-colors" : ""}
              onClick={() => summary.conflict_count > 0 && setShowDialog('conflict')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div className="text-sm text-muted-foreground">Conflicts</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-orange-600">{summary.conflict_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {summary.conflict_count > 0 ? "Click to view details" : "Multiple bookings overlap"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Column Toggle */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, location, city, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Column Visibility Toggle */}
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
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {ALL_COLUMNS.map((col) => (
                    <div key={col} className="flex items-center space-x-2">
                      <Checkbox
                        id={`col-${col}`}
                        checked={isColumnVisible(col)}
                        onCheckedChange={() => toggleColumn(col)}
                      />
                      <label
                        htmlFor={`col-${col}`}
                        className="text-sm cursor-pointer"
                      >
                        {COLUMN_LABELS[col] || col}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Results Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="available" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Available ({filteredAvailable.length})
            </TabsTrigger>
            <TabsTrigger value="booked" className="gap-2">
              <XCircle className="h-4 w-4" />
              Booked ({filteredBooked.length})
            </TabsTrigger>
            <TabsTrigger value="soon" className="gap-2">
              <Clock className="h-4 w-4" />
              Available Soon ({filteredAvailableSoon.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <Card>
              <CardContent className="pt-6">
                {sortedAvailable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No available assets for selected period" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-md">
                    <Table className="min-w-[1200px]">
                      <TableHeader>
                        <TableRow>
                          {isColumnVisible('asset_id') && (
                            <TableHead 
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('asset_id', availableSortConfig, setAvailableSortConfig)}
                            >
                              <div className="flex items-center">
                                Asset ID {getSortIcon('asset_id', availableSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('type') && <TableHead className="whitespace-nowrap">Type</TableHead>}
                          {isColumnVisible('city') && <TableHead className="whitespace-nowrap">City</TableHead>}
                          {isColumnVisible('location') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap min-w-[200px]"
                              onClick={() => handleSort('location', availableSortConfig, setAvailableSortConfig)}
                            >
                              <div className="flex items-center">
                                Location {getSortIcon('location', availableSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('area') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('area', availableSortConfig, setAvailableSortConfig)}
                            >
                              <div className="flex items-center">
                                Area {getSortIcon('area', availableSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('dimensions') && <TableHead className="whitespace-nowrap">Dimensions</TableHead>}
                          {isColumnVisible('sqft') && <TableHead className="whitespace-nowrap">Sq.Ft</TableHead>}
                          {isColumnVisible('direction') && <TableHead className="whitespace-nowrap">Direction</TableHead>}
                          {isColumnVisible('illumination') && <TableHead className="whitespace-nowrap">Illumination</TableHead>}
                          {isColumnVisible('status') && <TableHead className="whitespace-nowrap">Status</TableHead>}
                          {isColumnVisible('card_rate') && <TableHead className="text-right whitespace-nowrap">Card Rate</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAvailable.map((asset) => (
                          <TableRow key={asset.id}>
                            {isColumnVisible('asset_id') && (
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {asset.media_asset_code || asset.id}
                              </TableCell>
                            )}
                            {isColumnVisible('type') && (
                              <TableCell>
                                <Badge variant="outline">{asset.media_type}</Badge>
                              </TableCell>
                            )}
                            {isColumnVisible('city') && (
                              <TableCell className="whitespace-nowrap">{asset.city}</TableCell>
                            )}
                            {isColumnVisible('location') && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="min-w-[150px]">{asset.location}</span>
                                </div>
                              </TableCell>
                            )}
                            {isColumnVisible('area') && (
                              <TableCell className="whitespace-nowrap">{asset.area}</TableCell>
                            )}
                            {isColumnVisible('dimensions') && (
                              <TableCell className="whitespace-nowrap">{asset.dimensions || '-'}</TableCell>
                            )}
                            {isColumnVisible('sqft') && (
                              <TableCell className="whitespace-nowrap">{asset.total_sqft || '-'}</TableCell>
                            )}
                            {isColumnVisible('direction') && (
                              <TableCell className="whitespace-nowrap">{asset.direction || '-'}</TableCell>
                            )}
                            {isColumnVisible('illumination') && (
                              <TableCell className="whitespace-nowrap">{asset.illumination_type || '-'}</TableCell>
                            )}
                            {isColumnVisible('status') && (
                              <TableCell>{getAvailableStatusBadge(asset)}</TableCell>
                            )}
                            {isColumnVisible('card_rate') && (
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {formatCurrency(asset.card_rate)}
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
          </TabsContent>

          <TabsContent value="booked">
            <Card>
              <CardContent className="pt-6">
                {sortedBooked.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No booked assets for selected period" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-md">
                    <Table className="min-w-[1200px]">
                      <TableHeader>
                        <TableRow>
                          {isColumnVisible('asset_id') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('asset_id', bookedSortConfig, setBookedSortConfig)}
                            >
                              <div className="flex items-center">
                                Asset ID {getSortIcon('asset_id', bookedSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('type') && <TableHead className="whitespace-nowrap">Type</TableHead>}
                          {isColumnVisible('city') && <TableHead className="whitespace-nowrap">City</TableHead>}
                          {isColumnVisible('location') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap min-w-[200px]"
                              onClick={() => handleSort('location', bookedSortConfig, setBookedSortConfig)}
                            >
                              <div className="flex items-center">
                                Location {getSortIcon('location', bookedSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('area') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('area', bookedSortConfig, setBookedSortConfig)}
                            >
                              <div className="flex items-center">
                                Area {getSortIcon('area', bookedSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('dimensions') && <TableHead className="whitespace-nowrap">Dimensions</TableHead>}
                          {isColumnVisible('sqft') && <TableHead className="whitespace-nowrap">Sq.Ft</TableHead>}
                          {isColumnVisible('direction') && <TableHead className="whitespace-nowrap">Direction</TableHead>}
                          {isColumnVisible('illumination') && <TableHead className="whitespace-nowrap">Illumination</TableHead>}
                          {isColumnVisible('booking') && <TableHead className="whitespace-nowrap min-w-[180px]">Current Booking</TableHead>}
                          {isColumnVisible('available_from') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('available_from', bookedSortConfig, setBookedSortConfig)}
                            >
                              <div className="flex items-center">
                                Available From {getSortIcon('available_from', bookedSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('card_rate') && <TableHead className="text-right whitespace-nowrap">Card Rate</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedBooked.map((asset) => (
                          <TableRow key={asset.id}>
                            {isColumnVisible('asset_id') && (
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {asset.media_asset_code || asset.id}
                              </TableCell>
                            )}
                            {isColumnVisible('type') && (
                              <TableCell>
                                <Badge variant="outline">{asset.media_type}</Badge>
                              </TableCell>
                            )}
                            {isColumnVisible('city') && (
                              <TableCell className="whitespace-nowrap">{asset.city}</TableCell>
                            )}
                            {isColumnVisible('location') && (
                              <TableCell>
                                <span className="min-w-[150px] block">{asset.location}</span>
                              </TableCell>
                            )}
                            {isColumnVisible('area') && (
                              <TableCell className="whitespace-nowrap">{asset.area}</TableCell>
                            )}
                            {isColumnVisible('dimensions') && (
                              <TableCell className="whitespace-nowrap">{asset.dimensions || '-'}</TableCell>
                            )}
                            {isColumnVisible('sqft') && (
                              <TableCell className="whitespace-nowrap">{asset.total_sqft || '-'}</TableCell>
                            )}
                            {isColumnVisible('direction') && (
                              <TableCell className="whitespace-nowrap">{asset.direction || '-'}</TableCell>
                            )}
                            {isColumnVisible('illumination') && (
                              <TableCell className="whitespace-nowrap">{asset.illumination_type || '-'}</TableCell>
                            )}
                            {isColumnVisible('booking') && (
                              <TableCell>
                                {asset.current_booking ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{asset.current_booking.campaign_name}</div>
                                    <div className="text-muted-foreground">
                                      {asset.current_booking.client_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(asset.current_booking.start_date), 'dd MMM')} - {format(new Date(asset.current_booking.end_date), 'dd MMM yyyy')}
                                    </div>
                                  </div>
                                ) : '-'}
                              </TableCell>
                            )}
                            {isColumnVisible('available_from') && (
                              <TableCell>
                                {asset.available_from ? (
                                  <Badge variant="outline" className="bg-green-50">
                                    {format(new Date(asset.available_from), 'dd MMM yyyy')}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                            )}
                            {isColumnVisible('card_rate') && (
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {formatCurrency(asset.card_rate)}
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
          </TabsContent>

          <TabsContent value="soon">
            <Card>
              <CardContent className="pt-6">
                {sortedAvailableSoon.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No assets becoming available during selected period" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-md">
                    <Table className="min-w-[1200px]">
                      <TableHeader>
                        <TableRow>
                          {isColumnVisible('asset_id') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('asset_id', soonSortConfig, setSoonSortConfig)}
                            >
                              <div className="flex items-center">
                                Asset ID {getSortIcon('asset_id', soonSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('type') && <TableHead className="whitespace-nowrap">Type</TableHead>}
                          {isColumnVisible('city') && <TableHead className="whitespace-nowrap">City</TableHead>}
                          {isColumnVisible('location') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap min-w-[200px]"
                              onClick={() => handleSort('location', soonSortConfig, setSoonSortConfig)}
                            >
                              <div className="flex items-center">
                                Location {getSortIcon('location', soonSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('area') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('area', soonSortConfig, setSoonSortConfig)}
                            >
                              <div className="flex items-center">
                                Area {getSortIcon('area', soonSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('dimensions') && <TableHead className="whitespace-nowrap">Dimensions</TableHead>}
                          {isColumnVisible('sqft') && <TableHead className="whitespace-nowrap">Sq.Ft</TableHead>}
                          {isColumnVisible('direction') && <TableHead className="whitespace-nowrap">Direction</TableHead>}
                          {isColumnVisible('illumination') && <TableHead className="whitespace-nowrap">Illumination</TableHead>}
                          {isColumnVisible('booking') && <TableHead className="whitespace-nowrap">Booking Ends</TableHead>}
                          {isColumnVisible('available_from') && (
                            <TableHead
                              className="cursor-pointer select-none hover:bg-muted/50 whitespace-nowrap"
                              onClick={() => handleSort('available_from', soonSortConfig, setSoonSortConfig)}
                            >
                              <div className="flex items-center">
                                Available From {getSortIcon('available_from', soonSortConfig)}
                              </div>
                            </TableHead>
                          )}
                          {isColumnVisible('card_rate') && <TableHead className="text-right whitespace-nowrap">Card Rate</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAvailableSoon.map((asset) => (
                          <TableRow key={asset.id}>
                            {isColumnVisible('asset_id') && (
                              <TableCell className="font-mono text-sm whitespace-nowrap">
                                {asset.media_asset_code || asset.id}
                              </TableCell>
                            )}
                            {isColumnVisible('type') && (
                              <TableCell>
                                <Badge variant="outline">{asset.media_type}</Badge>
                              </TableCell>
                            )}
                            {isColumnVisible('city') && (
                              <TableCell className="whitespace-nowrap">{asset.city}</TableCell>
                            )}
                            {isColumnVisible('location') && (
                              <TableCell>
                                <span className="min-w-[150px] block">{asset.location}</span>
                              </TableCell>
                            )}
                            {isColumnVisible('area') && (
                              <TableCell className="whitespace-nowrap">{asset.area}</TableCell>
                            )}
                            {isColumnVisible('dimensions') && (
                              <TableCell className="whitespace-nowrap">{asset.dimensions || '-'}</TableCell>
                            )}
                            {isColumnVisible('sqft') && (
                              <TableCell className="whitespace-nowrap">{asset.total_sqft || '-'}</TableCell>
                            )}
                            {isColumnVisible('direction') && (
                              <TableCell className="whitespace-nowrap">{asset.direction || '-'}</TableCell>
                            )}
                            {isColumnVisible('illumination') && (
                              <TableCell className="whitespace-nowrap">{asset.illumination_type || '-'}</TableCell>
                            )}
                            {isColumnVisible('booking') && (
                              <TableCell>
                                {asset.current_booking ? (
                                  <span>{format(new Date(asset.current_booking.end_date), 'dd MMM yyyy')}</span>
                                ) : '-'}
                              </TableCell>
                            )}
                            {isColumnVisible('available_from') && (
                              <TableCell>
                                {asset.available_from ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    {format(new Date(asset.available_from), 'dd MMM yyyy')}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                            )}
                            {isColumnVisible('card_rate') && (
                              <TableCell className="text-right font-medium whitespace-nowrap">
                                {formatCurrency(asset.card_rate)}
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
          </TabsContent>
        </Tabs>
        
        {/* Dialogs for each type */}
        {renderDialogAssets('available')}
        {renderDialogAssets('booked')}
        {renderDialogAssets('soon')}
        {renderDialogAssets('conflict')}
      </div>
    </div>
  );
}

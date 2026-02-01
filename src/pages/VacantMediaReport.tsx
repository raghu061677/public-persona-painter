import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Calendar,
  Download,
  FileSpreadsheet,
  Presentation,
  Loader2,
  ChevronDown,
  Users,
} from "lucide-react";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";
import { 
  generateClientAvailabilityExcel, 
  generateClientAvailabilityPPT,
  validateExportData,
  type ClientAvailabilityExportData 
} from "@/lib/reports/generateClientAvailabilityExports";

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

// Combined Client View Asset type
interface ClientViewAsset {
  id: string;
  media_asset_code: string | null;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string | null;
  card_rate: number;
  total_sqft: number | null;
  direction: string | null;
  illumination_type: string | null;
  status: 'Available' | 'Available Soon';
  available_from: string;
  originalAsset: AvailableAsset | BookedAsset;
}

// Default column order for tables
const DEFAULT_COLUMNS = [
  { key: 'area', label: 'Area' },
  { key: 'location', label: 'Location' },
  { key: 'direction', label: 'Direction' },
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'sqft', label: 'Sq.Ft' },
  { key: 'illumination', label: 'Illumination' },
  { key: 'card_rate', label: 'Card Rate' },
  { key: 'status', label: 'Status' },
] as const;

export default function VacantMediaReport() {
  const { company } = useCompany();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [bookedAssets, setBookedAssets] = useState<BookedAsset[]>([]);
  const [availableSoonAssets, setAvailableSoonAssets] = useState<BookedAsset[]>([]);
  const [summary, setSummary] = useState<AvailabilitySummary | null>(null);
  
  const [cities, setCities] = useState<string[]>([]);
  const [mediaTypes, setMediaTypes] = useState<string[]>([]);
  
  // Export state
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    if (company?.id) {
      loadFilters();
    }
  }, [company]);

  const loadFilters = async () => {
    if (!company?.id) return;
    
    try {
      const { data } = await supabase
        .from('media_assets')
        .select('city, media_type')
        .eq('company_id', company.id);
      
      if (data) {
        const uniqueCities = [...new Set(data.map(a => a.city).filter(Boolean))] as string[];
        const uniqueTypes = [...new Set(data.map(a => a.media_type).filter(Boolean))] as string[];
        setCities(uniqueCities);
        setMediaTypes(uniqueTypes);
      }
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  const fetchAvailability = async () => {
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

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch availability');
      }

      // Handle null-safe responses
      setAvailableAssets(data?.available_assets || []);
      setBookedAssets(data?.booked_assets || []);
      setAvailableSoonAssets(data?.available_soon_assets || []);
      setSummary(data?.summary || {
        total_assets: 0,
        available_count: 0,
        booked_count: 0,
        available_soon_count: 0,
        conflict_count: 0,
        total_sqft_available: 0,
        potential_revenue: 0,
      });

      toast({
        title: "Report Updated",
        description: `Found ${data?.summary?.available_count || 0} available, ${data?.summary?.available_soon_count || 0} available soon`,
      });
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load availability report",
        variant: "destructive",
      });
      setAvailableAssets([]);
      setBookedAssets([]);
      setAvailableSoonAssets([]);
      setSummary({
        total_assets: 0,
        available_count: 0,
        booked_count: 0,
        available_soon_count: 0,
        conflict_count: 0,
        total_sqft_available: 0,
        potential_revenue: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = <T extends { id: string; media_asset_code?: string | null; city?: string; area?: string; location?: string; media_type?: string }>(assets: T[]): T[] => {
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

  const filteredAvailable = filterAssets(availableAssets);
  const filteredBooked = filterAssets(bookedAssets);
  const filteredAvailableSoon = filterAssets(availableSoonAssets);

  // Build Client View combined list
  const clientViewAssets = useMemo((): ClientViewAsset[] => {
    const result: ClientViewAsset[] = [];
    
    // Add Available assets (available_from = rangeStart)
    for (const asset of filteredAvailable) {
      result.push({
        id: asset.id,
        media_asset_code: asset.media_asset_code,
        city: asset.city,
        area: asset.area,
        location: asset.location,
        media_type: asset.media_type,
        dimensions: asset.dimensions,
        card_rate: asset.card_rate,
        total_sqft: asset.total_sqft,
        direction: asset.direction || null,
        illumination_type: asset.illumination_type || null,
        status: 'Available',
        available_from: startDate,
        originalAsset: asset,
      });
    }
    
    // Add Available Soon assets (available_from = computed date)
    for (const asset of filteredAvailableSoon) {
      result.push({
        id: asset.id,
        media_asset_code: asset.media_asset_code,
        city: asset.city,
        area: asset.area,
        location: asset.location,
        media_type: asset.media_type,
        dimensions: asset.dimensions,
        card_rate: asset.card_rate,
        total_sqft: asset.total_sqft,
        direction: asset.direction || null,
        illumination_type: asset.illumination_type || null,
        status: 'Available Soon',
        available_from: asset.available_from || startDate,
        originalAsset: asset,
      });
    }
    
    // Sort: Available first, then Available Soon by available_from date, then by area/location
    result.sort((a, b) => {
      // Status sort (Available first)
      if (a.status !== b.status) {
        return a.status === 'Available' ? -1 : 1;
      }
      // Available_from sort (earliest first)
      if (a.available_from !== b.available_from) {
        return a.available_from.localeCompare(b.available_from);
      }
      // Area, then Location
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      return a.location.localeCompare(b.location);
    });
    
    return result;
  }, [filteredAvailable, filteredAvailableSoon, startDate]);

  const getAssetDisplayId = (asset: AvailableAsset | BookedAsset | ClientViewAsset) => {
    return asset.media_asset_code || asset.id;
  };

  // Prepare export data from current availability results
  const prepareExportData = (): ClientAvailabilityExportData | null => {
    if (!summary) {
      toast({
        title: "No Data",
        description: "Run Check Availability first to load assets",
        variant: "destructive",
      });
      return null;
    }

    const exportData: ClientAvailabilityExportData = {
      availableAssets,
      availableSoonAssets,
      summary,
      filters: {
        startDate,
        endDate,
        city: selectedCity,
        mediaType: selectedMediaType,
      },
      companyId: company?.id,
    };

    // Validate counts match
    const validation = validateExportData(exportData);
    if (!validation.valid) {
      toast({
        title: "Data Mismatch",
        description: validation.error,
        variant: "destructive",
      });
      console.error("Export validation failed:", {
        availableCount: availableAssets.length,
        availableSoonCount: availableSoonAssets.length,
        summaryAvailable: summary.available_count,
        summaryAvailableSoon: summary.available_soon_count,
      });
      return null;
    }

    return exportData;
  };

  const handleClientExcelExport = async () => {
    const exportData = prepareExportData();
    if (!exportData) return;

    setExporting('excel');
    try {
      await generateClientAvailabilityExcel(exportData);
      toast({
        title: "Export Complete",
        description: "Client Availability Excel has been downloaded",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate Excel",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const handleClientPPTExport = async () => {
    const exportData = prepareExportData();
    if (!exportData) return;

    setExporting('ppt');
    try {
      await generateClientAvailabilityPPT(exportData);
      toast({
        title: "Export Complete",
        description: "Client Availability PPT has been downloaded",
      });
    } catch (error) {
      console.error('PPT export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to generate PPT",
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  };

  const hasAvailabilityData = summary && (summary.available_count > 0 || summary.available_soon_count > 0);
  const clientViewCount = clientViewAssets.length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vacant Media Report</h1>
            <p className="text-muted-foreground mt-1">
              Check asset availability for specific date ranges
            </p>
          </div>
          
          {/* Client Availability Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                disabled={!hasAvailabilityData || !!exporting}
                title={!hasAvailabilityData ? "Run Check Availability first" : "Export for client"}
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Client Export
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px]">
              <DropdownMenuItem onClick={handleClientExcelExport} disabled={!!exporting}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                Client Availability (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClientPPTExport} disabled={!!exporting}>
                <Presentation className="h-4 w-4 mr-2 text-orange-600" />
                Client Availability (PPT)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                <p>Includes: Available + Available Soon</p>
                <p className="mt-0.5">
                  {summary ? `${summary.available_count + summary.available_soon_count} assets` : 'Run availability check'}
                </p>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  onClick={fetchAvailability} 
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
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-green-600">{summary.available_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(summary.potential_revenue)} potential
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div className="text-sm text-muted-foreground">Booked</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-red-600">{summary.booked_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  During selected period
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div className="text-sm text-muted-foreground">Available Soon</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-yellow-600">{summary.available_soon_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Becomes free during period
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div className="text-sm text-muted-foreground">Conflicts</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-orange-600">{summary.conflict_count}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Multiple bookings overlap
                </div>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div className="text-sm text-muted-foreground">Client View</div>
                </div>
                <div className="text-3xl font-bold mt-2 text-primary">
                  {summary.available_count + summary.available_soon_count}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total shareable assets
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, type, city, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="client" className="space-y-4">
          <TabsList>
            <TabsTrigger value="client" className="gap-2">
              <Users className="h-4 w-4" />
              Client View ({clientViewCount})
            </TabsTrigger>
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

          {/* Client View Tab - Combined Available + Available Soon */}
          <TabsContent value="client">
            <Card>
              <CardContent className="pt-6">
                {clientViewAssets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No assets available for client sharing" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead className="text-right">Sq.Ft</TableHead>
                          <TableHead>Illumination</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Available From</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientViewAssets.map((asset, index) => (
                          <TableRow 
                            key={asset.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="font-medium">{asset.area || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{asset.location || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{asset.direction || '-'}</TableCell>
                            <TableCell>{asset.dimensions || '-'}</TableCell>
                            <TableCell className="text-right">
                              {asset.total_sqft ? asset.total_sqft.toFixed(0) : '-'}
                            </TableCell>
                            <TableCell>{asset.illumination_type || 'Non-lit'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(asset.card_rate)}
                            </TableCell>
                            <TableCell>
                              {asset.status === 'Available' ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Available
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Available Soon
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">
                                {format(new Date(asset.available_from), 'dd-MM-yyyy')}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Available Tab */}
          <TabsContent value="available">
            <Card>
              <CardContent className="pt-6">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No available assets for selected period" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead className="text-right">Sq.Ft</TableHead>
                          <TableHead>Illumination</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailable.map((asset, index) => (
                          <TableRow 
                            key={asset.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="font-medium">{asset.area || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{asset.location || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{asset.direction || '-'}</TableCell>
                            <TableCell>{asset.dimensions || '-'}</TableCell>
                            <TableCell className="text-right">
                              {asset.total_sqft ? asset.total_sqft.toFixed(0) : '-'}
                            </TableCell>
                            <TableCell>{asset.illumination_type || 'Non-lit'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(asset.card_rate)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Available
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booked Tab */}
          <TabsContent value="booked">
            <Card>
              <CardContent className="pt-6">
                {filteredBooked.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No booked assets for selected period" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead>Booked For</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Available From</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBooked.map((asset, index) => (
                          <TableRow 
                            key={asset.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="font-medium">{asset.area || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{asset.location || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{asset.direction || '-'}</TableCell>
                            <TableCell>{asset.dimensions || '-'}</TableCell>
                            <TableCell>
                              {asset.current_booking ? (
                                <div className="text-sm">
                                  <div className="font-medium">{asset.current_booking.campaign_name}</div>
                                  <div className="text-muted-foreground">
                                    {asset.current_booking.client_name}
                                  </div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                asset.availability_status === 'conflict' 
                                  ? "bg-orange-100 text-orange-800 border-orange-200"
                                  : "bg-red-100 text-red-800 border-red-200"
                              }>
                                {asset.availability_status === 'conflict' ? (
                                  <><AlertTriangle className="h-3 w-3 mr-1" />Conflict</>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" />Booked</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {asset.available_from ? (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(asset.available_from), 'dd-MM-yyyy')}
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Available Soon Tab */}
          <TabsContent value="soon">
            <Card>
              <CardContent className="pt-6">
                {filteredAvailableSoon.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {summary ? "No assets becoming available during selected period" : "Click 'Check Availability' to load results"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Area</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead className="text-right">Sq.Ft</TableHead>
                          <TableHead>Illumination</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                          <TableHead>Current Booking</TableHead>
                          <TableHead>Available From</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailableSoon.map((asset, index) => (
                          <TableRow 
                            key={asset.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="font-medium">{asset.area || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{asset.location || '-'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{asset.direction || '-'}</TableCell>
                            <TableCell>{asset.dimensions || '-'}</TableCell>
                            <TableCell className="text-right">
                              {asset.total_sqft ? asset.total_sqft.toFixed(0) : '-'}
                            </TableCell>
                            <TableCell>{asset.illumination_type || 'Non-lit'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(asset.card_rate)}
                            </TableCell>
                            <TableCell>
                              {asset.current_booking ? (
                                <div className="text-sm">
                                  <div className="font-medium">{asset.current_booking.campaign_name}</div>
                                  <div className="text-muted-foreground">
                                    Until: {format(new Date(asset.current_booking.end_date), 'dd-MM-yyyy')}
                                  </div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {asset.available_from ? (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(asset.available_from), 'dd-MM-yyyy')}
                                </Badge>
                              ) : '-'}
                            </TableCell>
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
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Calendar
} from "lucide-react";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";

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
        description: `Found ${data?.summary?.available_count || 0} available assets`,
      });
    } catch (error) {
      console.error('Error loading availability:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load availability report",
        variant: "destructive",
      });
      // Set default empty state on error
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

  const getAssetDisplayId = (asset: AvailableAsset | BookedAsset) => {
    return asset.media_asset_code || asset.id;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Vacant Media Report</h1>
          <p className="text-muted-foreground mt-1">
            Check asset availability for specific date ranges
          </p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
        <Tabs defaultValue="available" className="space-y-4">
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
                          <TableHead>Asset ID</TableHead>
                          <TableHead>Media Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailable.map((asset, index) => (
                          <TableRow 
                            key={asset.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="font-mono text-sm font-medium">
                              {getAssetDisplayId(asset)}
                            </TableCell>
                            <TableCell>{asset.media_type}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {asset.location || asset.area}
                              </div>
                            </TableCell>
                            <TableCell>{asset.city}</TableCell>
                            <TableCell>{asset.dimensions || '-'}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Available
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(asset.card_rate)}
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
                          <TableHead>Asset ID</TableHead>
                          <TableHead>Media Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>City</TableHead>
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
                            <TableCell className="font-mono text-sm font-medium">
                              {getAssetDisplayId(asset)}
                            </TableCell>
                            <TableCell>{asset.media_type}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {asset.location || asset.area}
                              </div>
                            </TableCell>
                            <TableCell>{asset.city}</TableCell>
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
                                  {format(new Date(asset.available_from), 'MMM dd, yyyy')}
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
                          <TableHead>Asset ID</TableHead>
                          <TableHead>Media Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Current Booking</TableHead>
                          <TableHead>Available From</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailableSoon.map((asset, index) => (
                          <TableRow 
                            key={asset.id}
                            className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                          >
                            <TableCell className="font-mono text-sm font-medium">
                              {getAssetDisplayId(asset)}
                            </TableCell>
                            <TableCell>{asset.media_type}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {asset.location || asset.area}
                              </div>
                            </TableCell>
                            <TableCell>{asset.city}</TableCell>
                            <TableCell>
                              {asset.current_booking ? (
                                <div className="text-sm">
                                  <div className="font-medium">{asset.current_booking.campaign_name}</div>
                                  <div className="text-muted-foreground">
                                    Until: {format(new Date(asset.current_booking.end_date), 'MMM dd, yyyy')}
                                  </div>
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {asset.available_from ? (
                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {format(new Date(asset.available_from), 'MMM dd, yyyy')}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(asset.card_rate)}
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

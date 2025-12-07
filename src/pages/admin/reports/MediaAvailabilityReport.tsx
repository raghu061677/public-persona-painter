import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  RefreshCw
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

export default function MediaAvailabilityReport() {
  const { company } = useCompany();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const getStatusBadge = (asset: AvailableAsset | BookedAsset) => {
    if ('availability_status' in asset) {
      switch (asset.availability_status) {
        case 'available':
          return <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />Available
          </Badge>;
        case 'available_soon':
          return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />Available Soon
          </Badge>;
        case 'booked':
          return <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />Booked
          </Badge>;
        case 'conflict':
          return <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />Conflict
          </Badge>;
      }
    }
    return null;
  };

  const filteredAvailable = filterBySearchAvailable(availableAssets);
  const filteredBooked = filterBySearchBooked(bookedAssets);
  const filteredAvailableSoon = filterBySearchBooked(availableSoonAssets);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Media Availability Report</h1>
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

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
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
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, location, city, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Tabs */}
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
                          <TableHead>Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Dimensions</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailable.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-mono text-sm">
                              {asset.media_asset_code || asset.id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{asset.media_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="max-w-[200px] truncate">{asset.location}</span>
                              </div>
                            </TableCell>
                            <TableCell>{asset.city}, {asset.area}</TableCell>
                            <TableCell>{asset.dimensions || '-'}</TableCell>
                            <TableCell>{getAvailableStatusBadge(asset)}</TableCell>
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
                          <TableHead>Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Current Booking</TableHead>
                          <TableHead>Available From</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBooked.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-mono text-sm">
                              {asset.media_asset_code || asset.id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{asset.media_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="max-w-[150px] truncate block">{asset.location}</span>
                            </TableCell>
                            <TableCell>{getBookedStatusBadge(asset)}</TableCell>
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
                            <TableCell>
                              {asset.available_from ? (
                                <Badge variant="outline" className="bg-green-50">
                                  {format(new Date(asset.available_from), 'dd MMM yyyy')}
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
                          <TableHead>Type</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Current Booking Ends</TableHead>
                          <TableHead>Available From</TableHead>
                          <TableHead className="text-right">Card Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailableSoon.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell className="font-mono text-sm">
                              {asset.media_asset_code || asset.id}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{asset.media_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="max-w-[200px] truncate block">{asset.location}</span>
                            </TableCell>
                            <TableCell>
                              {asset.current_booking ? (
                                <span>{format(new Date(asset.current_booking.end_date), 'dd MMM yyyy')}</span>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              {asset.available_from ? (
                                <Badge className="bg-green-100 text-green-800">
                                  {format(new Date(asset.available_from), 'dd MMM yyyy')}
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

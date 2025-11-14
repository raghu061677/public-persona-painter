import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Building2, ArrowRight, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { logActivity } from "@/utils/activityLogger";

interface MarketplaceAsset {
  id: string;
  city: string;
  area: string;
  location: string;
  media_type: string;
  dimensions: string;
  card_rate: number;
  status: string;
  image_urls: string[];
  company_id: string;
  company_name?: string;
  company_type?: string;
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { company, isPlatformAdmin } = useCompany();
  const [assets, setAssets] = useState<MarketplaceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedMediaType, setSelectedMediaType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("Available");
  
  // Booking dialog state
  const [bookingDialog, setBookingDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MarketplaceAsset | null>(null);
  const [bookingForm, setBookingForm] = useState({
    startDate: "",
    endDate: "",
    proposedRate: "",
    campaignName: "",
    clientName: "",
    notes: "",
  });

  useEffect(() => {
    fetchMarketplaceAssets();
  }, [selectedCity, selectedMediaType, selectedStatus]);

  const fetchMarketplaceAssets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('media_assets')
        .select(`
          *,
          companies:company_id (
            name,
            type
          )
        `)
        .eq('is_public', true);

      if (selectedCity !== "all") {
        query = query.eq('city', selectedCity);
      }
      if (selectedMediaType !== "all") {
        query = query.eq('media_type', selectedMediaType);
      }
      if (selectedStatus !== "all") {
        query = query.eq('status', selectedStatus as any);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAssets = data?.map((asset: any) => ({
        ...asset,
        company_name: asset.companies?.name,
        company_type: asset.companies?.type,
      })) || [];

      setAssets(formattedAssets);
    } catch (error: any) {
      console.error('Error fetching marketplace assets:', error);
      toast({
        title: "Error",
        description: "Failed to load marketplace assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    const searchLower = searchQuery.toLowerCase();
    return (
      asset.id.toLowerCase().includes(searchLower) ||
      asset.location.toLowerCase().includes(searchLower) ||
      asset.area.toLowerCase().includes(searchLower) ||
      asset.city.toLowerCase().includes(searchLower) ||
      asset.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const cities = Array.from(new Set(assets.map(a => a.city))).sort();
  const mediaTypes = Array.from(new Set(assets.map(a => a.media_type))).sort();

  const canRequestBooking = company?.type === 'agency' || isPlatformAdmin;

  const handleBookingRequest = async () => {
    if (!selectedAsset || !company?.id) return;

    if (!bookingForm.startDate || !bookingForm.endDate || !bookingForm.proposedRate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from('booking_requests' as any).insert({
        asset_id: selectedAsset.id,
        requester_company_id: company.id,
        owner_company_id: selectedAsset.company_id,
        requested_by: (await supabase.auth.getUser()).data.user?.id,
        start_date: bookingForm.startDate,
        end_date: bookingForm.endDate,
        proposed_rate: parseFloat(bookingForm.proposedRate),
        campaign_name: bookingForm.campaignName || null,
        client_name: bookingForm.clientName || null,
        notes: bookingForm.notes || null,
      });

      if (error) throw error;

      await logActivity(
        'create',
        'booking_request',
        selectedAsset.id,
        `Booking request for ${selectedAsset.id}`,
        { asset_id: selectedAsset.id, company_id: selectedAsset.company_id }
      );

      toast({
        title: "Success",
        description: "Booking request sent successfully",
      });

      setBookingDialog(false);
      setSelectedAsset(null);
      setBookingForm({
        startDate: "",
        endDate: "",
        proposedRate: "",
        campaignName: "",
        clientName: "",
        notes: "",
      });
    } catch (error: any) {
      console.error('Error creating booking request:', error);
      toast({
        title: "Error",
        description: "Failed to send booking request",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Marketplace</h2>
          <p className="text-muted-foreground">
            Browse and book public OOH media assets from multiple media owners
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by location, area, city, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Media Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {mediaTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Booked">Booked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading marketplace assets...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No assets found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="p-0">
                {asset.image_urls?.[0] ? (
                  <img
                    src={asset.image_urls[0]}
                    alt={asset.location}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center rounded-t-lg">
                    <Building2 className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{asset.id}</h3>
                    <p className="text-sm text-muted-foreground">{asset.media_type}</p>
                  </div>
                  <Badge variant={asset.status === 'Available' ? 'default' : 'secondary'}>
                    {asset.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{asset.area}, {asset.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {asset.company_name || 'Unknown Owner'}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{asset.location}</p>
                  <p className="font-semibold">Dimensions: {asset.dimensions}</p>
                  <p className="text-lg font-bold text-primary">
                    ₹{asset.card_rate.toLocaleString()}/month
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => navigate(`/admin/media-assets/${asset.id}`)}
                  >
                    View Details
                  </Button>
                  {canRequestBooking && asset.status === 'Available' && asset.company_id !== company?.id && (
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setBookingForm(prev => ({
                          ...prev,
                          proposedRate: asset.card_rate.toString(),
                        }));
                        setBookingDialog(true);
                      }}
                    >
                      Request Booking
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Request Dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Booking</DialogTitle>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{selectedAsset.id}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAsset.location}, {selectedAsset.area}, {selectedAsset.city}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={bookingForm.startDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={bookingForm.endDate}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposedRate">Proposed Rate (₹/month) *</Label>
                  <Input
                    id="proposedRate"
                    type="number"
                    placeholder="Enter proposed rate"
                    value={bookingForm.proposedRate}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, proposedRate: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Card Rate: ₹{selectedAsset.card_rate.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    placeholder="Enter campaign name"
                    value={bookingForm.campaignName}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, campaignName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="Enter client name"
                    value={bookingForm.clientName}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, clientName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Enter any additional information..."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBookingRequest}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

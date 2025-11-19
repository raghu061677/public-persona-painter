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
  category: string;
  dimensions: string;
  total_sqft: number | null;
  direction: string | null;
  illumination: string | null;
  status: string;
  image_urls: string[];
  images: any;
  latitude: number | null;
  longitude: number | null;
  google_street_view_url: string | null;
  is_multi_face: boolean | null;
  faces: any;
  company_id: string;
  company_name: string;
  company_city: string | null;
  company_phone: string | null;
  company_email: string | null;
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
      // Use the secure public view that excludes pricing and vendor details
      let query = supabase
        .from('public_media_assets_safe')
        .select('*');

      if (selectedCity !== "all") {
        query = query.eq('city', selectedCity);
      }
      if (selectedMediaType !== "all") {
        query = query.eq('media_type', selectedMediaType);
      }
      if (selectedStatus !== "all") {
        query = query.eq('status', selectedStatus as any);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAssets(data || []);
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
    if (!selectedAsset || !bookingForm.startDate || !bookingForm.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // If user is authenticated and part of a company, create booking request
      if (company?.id) {
        const { data, error } = await supabase
          .from('booking_requests')
          .insert({
            asset_id: selectedAsset.id,
            owner_company_id: selectedAsset.company_id,
            requester_company_id: company.id,
            requested_by: (await supabase.auth.getUser()).data.user?.id || '',
            start_date: bookingForm.startDate,
            end_date: bookingForm.endDate,
            proposed_rate: parseFloat(bookingForm.proposedRate) || 0,
            campaign_name: bookingForm.campaignName,
            client_name: bookingForm.clientName,
            notes: bookingForm.notes,
            status: 'pending',
          });

        if (error) throw error;

        await logActivity(
          'create',
          'booking_request',
          selectedAsset.id,
          `Booking request for ${selectedAsset.id}`,
          { asset_id: selectedAsset.id }
        );
      } else {
        // For public users without login, create a lead in the Matrix company
        const { data: matrixCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('name', 'Matrix Network Solutions')
          .single();

        if (!matrixCompany) {
          throw new Error('Matrix Network Solutions company not found');
        }

        // Create a lead from the marketplace enquiry
        const { error: leadError } = await supabase
          .from('leads')
          .insert({
            company_id: matrixCompany.id,
            name: bookingForm.clientName,
            company: bookingForm.clientName,
            requirement: `Marketplace Enquiry for Asset ${selectedAsset.id} - ${selectedAsset.media_type} in ${selectedAsset.area}\nCampaign: ${bookingForm.campaignName}\nDates: ${bookingForm.startDate} to ${bookingForm.endDate}\nProposed Rate: ${bookingForm.proposedRate}\nNotes: ${bookingForm.notes}`,
            location: `${selectedAsset.area}, ${selectedAsset.city}`,
            source: 'Go-Ads Website - Marketplace',
            status: 'New',
            metadata: {
              asset_id: selectedAsset.id,
              campaign_name: bookingForm.campaignName,
              start_date: bookingForm.startDate,
              end_date: bookingForm.endDate,
              proposed_rate: bookingForm.proposedRate,
            }
          });

        if (leadError) throw leadError;
      }

      toast({
        title: "Enquiry Submitted",
        description: company?.id 
          ? "Your booking request has been sent to the media owner"
          : "Thank you for your enquiry! Our team will contact you soon.",
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
      console.error('Error submitting enquiry:', error);
      toast({
        title: "Error",
        description: error.message,
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
                  <Badge variant="secondary" className="mt-2">
                    Contact for Pricing
                  </Badge>
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
                          proposedRate: "",
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
                    required
                  />
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

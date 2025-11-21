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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MapPin, Building2, ArrowRight, Calendar, FileDown, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { logActivity } from "@/utils/activityLogger";
import { generateMarketplacePPT } from "@/lib/marketplace/generateMarketplacePPT";
import { format } from "date-fns";

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
  
  // Multi-select state
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Quote request dialog state
  const [quoteDialog, setQuoteDialog] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
    campaignStartDate: "",
    campaignEndDate: "",
    budget: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  // Handle asset selection toggle
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
    }
  };

  // Handle download PPT
  const handleDownloadPPT = async () => {
    if (selectedAssets.size === 0) {
      toast({
        title: "No Assets Selected",
        description: "Please select at least one asset to download the proposal",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const selectedAssetData = assets.filter(a => selectedAssets.has(a.id));
      
      const pptBlob = await generateMarketplacePPT(selectedAssetData);
      
      // Create download link
      const url = URL.createObjectURL(pptBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GoAds_Media_Proposal_${format(new Date(), 'yyyy-MM-dd')}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Proposal Downloaded",
        description: `Successfully downloaded proposal with ${selectedAssets.size} assets`,
      });
    } catch (error: any) {
      console.error('Error generating PPT:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate proposal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle quote request
  const handleQuoteRequest = async () => {
    if (selectedAssets.size === 0) {
      toast({
        title: "No Assets Selected",
        description: "Please select at least one asset",
        variant: "destructive",
      });
      return;
    }

    if (!quoteForm.name || !quoteForm.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in your name and email",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the owner company ID from the first selected asset
      const firstAssetId = Array.from(selectedAssets)[0];
      const firstAsset = assets.find(a => a.id === firstAssetId);
      
      if (!firstAsset) {
        throw new Error('Asset not found');
      }

      if (!firstAsset.company_id) {
        throw new Error('Asset owner information not available');
      }

      const ownerCompanyId = firstAsset.company_id;

      // Create marketplace inquiry
      const { data: inquiry, error: inquiryError } = await supabase
        .from('marketplace_inquiries')
        .insert({
          company_id: ownerCompanyId,
          name: quoteForm.name,
          company_name: quoteForm.company || null,
          email: quoteForm.email,
          phone: quoteForm.phone || null,
          message: quoteForm.message || null,
          campaign_start_date: quoteForm.campaignStartDate || null,
          campaign_end_date: quoteForm.campaignEndDate || null,
          budget: quoteForm.budget ? parseFloat(quoteForm.budget) : null,
          status: 'new',
        })
        .select()
        .single();

      if (inquiryError) throw inquiryError;

      // Link selected assets to the inquiry
      const inquiryAssets = Array.from(selectedAssets).map(assetId => ({
        inquiry_id: inquiry.id,
        asset_id: assetId,
      }));

      const { error: assetsError } = await supabase
        .from('marketplace_inquiry_assets')
        .insert(inquiryAssets);

      if (assetsError) throw assetsError;

      // Create notification for admins of the owner company
      const { data: adminUsers } = await supabase
        .from('company_users')
        .select('user_id')
        .eq('company_id', ownerCompanyId)
        .eq('role', 'admin');

      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          title: 'New Marketplace Quote Request',
          message: `${quoteForm.name} requested pricing for ${selectedAssets.size} assets`,
          type: 'marketplace_inquiry',
          entity_id: inquiry.id,
          entity_type: 'marketplace_inquiry',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: "Quote Request Submitted",
        description: "Thank you! Our team will contact you soon with pricing details.",
      });

      // Reset form and close dialog
      setQuoteDialog(false);
      setSelectedAssets(new Set());
      setQuoteForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        message: "",
        campaignStartDate: "",
        campaignEndDate: "",
        budget: "",
      });
    } catch (error: any) {
      console.error('Error submitting quote request:', error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
        // For public users without login, create a lead in the asset owner's company
        const ownerCompanyId = selectedAsset.company_id;
        
        if (!ownerCompanyId) {
          throw new Error('Unable to determine asset owner company');
        }

        // Create a lead from the marketplace enquiry
        const { error: leadError } = await supabase
          .from('leads')
          .insert({
            company_id: ownerCompanyId,
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
        <>
          {/* Selection toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <Label htmlFor="select-all" className="cursor-pointer">
                Select All ({selectedAssets.size} of {filteredAssets.length})
              </Label>
            </div>
            
            {selectedAssets.size > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadPPT}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Download Proposal
                    </>
                  )}
                </Button>
                <Button onClick={() => setQuoteDialog(true)}>
                  <Send className="mr-2 h-4 w-4" />
                  Request Quote
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="hover:shadow-lg transition-shadow relative group">
              {/* Selection checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <Checkbox
                  checked={selectedAssets.has(asset.id)}
                  onCheckedChange={() => toggleAssetSelection(asset.id)}
                  className="bg-white border-2 shadow-sm"
                />
              </div>
              
              <CardHeader className="p-0">
                {asset.image_urls && asset.image_urls.length > 0 && asset.image_urls[0] ? (
                  <img
                    src={asset.image_urls[0]}
                    alt={asset.location}
                    className="w-full h-36 object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-36 bg-muted flex items-center justify-center rounded-t-lg">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base leading-tight truncate">{asset.id}</h3>
                    <p className="text-xs text-muted-foreground font-medium truncate">{asset.media_type}</p>
                  </div>
                  <Badge variant={asset.status === 'Available' ? 'default' : 'secondary'} className="text-xs flex-shrink-0">
                    {asset.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{asset.area}, {asset.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">
                      {asset.company_name || 'Unknown Owner'}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-1">{asset.location}</p>
                  <p className="font-semibold text-xs">Dimensions: {asset.dimensions}</p>
                  <Badge variant="secondary" className="text-xs">
                    Contact for Pricing
                  </Badge>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => navigate(`/marketplace/asset/${asset.id}`)}
                  >
                    View Details
                  </Button>
                  {canRequestBooking && asset.status === 'Available' && asset.company_id !== company?.id && (
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setBookingForm(prev => ({
                          ...prev,
                          proposedRate: "",
                        }));
                        setBookingDialog(true);
                      }}
                    >
                      Request
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        </>
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

      {/* Quote Request Dialog */}
      <Dialog open={quoteDialog} onOpenChange={setQuoteDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Quote for {selectedAssets.size} Assets</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quote-name">Name *</Label>
              <Input
                id="quote-name"
                placeholder="Your full name"
                value={quoteForm.name}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-company">Company</Label>
              <Input
                id="quote-company"
                placeholder="Company name (optional)"
                value={quoteForm.company}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, company: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-email">Email *</Label>
              <Input
                id="quote-email"
                type="email"
                placeholder="your.email@example.com"
                value={quoteForm.email}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-phone">Phone</Label>
              <Input
                id="quote-phone"
                type="tel"
                placeholder="+91-XXXXXXXXXX"
                value={quoteForm.phone}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quote-start">Campaign Start</Label>
                <Input
                  id="quote-start"
                  type="date"
                  value={quoteForm.campaignStartDate}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, campaignStartDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-end">Campaign End</Label>
                <Input
                  id="quote-end"
                  type="date"
                  value={quoteForm.campaignEndDate}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, campaignEndDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-budget">Budget (₹)</Label>
              <Input
                id="quote-budget"
                type="number"
                placeholder="Approximate budget"
                value={quoteForm.budget}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, budget: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-message">Additional Message</Label>
              <Textarea
                id="quote-message"
                placeholder="Tell us more about your requirements..."
                rows={3}
                value={quoteForm.message}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Selected Assets: {selectedAssets.size}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuoteRequest} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

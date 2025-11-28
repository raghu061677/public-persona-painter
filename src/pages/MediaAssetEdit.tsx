import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Combobox } from "@/components/ui/combobox";
import { VendorDetailsForm } from "@/components/media-assets/vendor-details-form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { parseDimensions, buildSearchTokens } from "@/utils/mediaAssets";
import { buildStreetViewUrl } from "@/lib/streetview";
import { ArrowLeft, Save, Calendar as CalendarIcon, ExternalLink, HelpCircle, MapPin, DollarSign, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { PhotoUploadSection } from "@/components/media-assets/PhotoUploadSection";
import { UnifiedPhotoGallery } from "@/components/common/UnifiedPhotoGallery";

export default function MediaAssetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [municipalAuthorities, setMunicipalAuthorities] = useState<{ label: string; value: string }[]>([]);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit media assets",
        variant: "destructive",
      });
      navigate('/admin/media-assets');
      return;
    }
    fetchAsset();
  }, [id, isAdmin]);

  // Fetch municipal authorities
  useEffect(() => {
    async function fetchAuthorities() {
      const { data } = await supabase
        .from('media_assets')
        .select('municipal_authority')
        .not('municipal_authority', 'is', null)
        .limit(100);
      
      if (data) {
        const unique = Array.from(new Set(data.map(d => d.municipal_authority).filter(Boolean)));
        setMunicipalAuthorities(unique.map(auth => ({ label: auth as string, value: auth as string })));
      }
    }
    fetchAuthorities();
  }, []);

  // Auto-update total_sqft when dimensions change
  useEffect(() => {
    if (formData?.dimensions) {
      const parsed = parseDimensions(formData.dimensions);
      if (parsed.totalSqft !== formData.total_sqft) {
        setFormData((prev: any) => ({ 
          ...prev, 
          total_sqft: parsed.totalSqft,
          is_multi_face: parsed.isMultiFace,
          faces: parsed.faces,
        }));
      }
    }
  }, [formData?.dimensions]);

  // Auto-update Street View URL when lat/lng changes
  useEffect(() => {
    if (formData) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat && lng) {
        const url = buildStreetViewUrl(lat, lng);
        if (formData.google_street_view_url !== url) {
          setFormData((prev: any) => ({ ...prev, google_street_view_url: url }));
        }
      }
    }
  }, [formData?.latitude, formData?.longitude]);

  const fetchAsset = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Error",
        description: "Failed to fetch asset details",
        variant: "destructive",
      });
      navigate('/admin/media-assets');
    } else {
      // Fetch photos from media_photos table
      const { data: photosData } = await supabase
        .from('media_photos')
        .select('*')
        .eq('asset_id', id)
        .order('uploaded_at', { ascending: false });

      // Transform photos data to match expected format
      const photos = photosData?.map(photo => {
        const metadata = photo.metadata as Record<string, any> | null;
        return {
          id: photo.id,
          photo_url: photo.photo_url,
          category: photo.category,
          uploaded_at: photo.uploaded_at,
          latitude: metadata?.latitude,
          longitude: metadata?.longitude,
          validation_score: metadata?.validation_score,
          validation_issues: metadata?.validation_issues,
          validation_suggestions: metadata?.validation_suggestions,
        };
      }) || [];

      // Convert numeric values to strings for form inputs
      const formattedData = {
        ...data,
        latitude: data.latitude?.toString() || "",
        longitude: data.longitude?.toString() || "",
        card_rate: data.card_rate?.toString() || "",
        base_rent: data.base_rent?.toString() || "",
        base_margin: data.base_margin?.toString() || "",
        gst_percent: data.gst_percent?.toString() || "18",
        printing_charges: data.printing_charges?.toString() || "",
        mounting_charges: data.mounting_charges?.toString() || "",
        concession_fee: data.concession_fee?.toString() || "",
        ad_tax: data.ad_tax?.toString() || "",
        electricity: data.electricity?.toString() || "",
        maintenance: data.maintenance?.toString() || "",
        vendor_details: data.vendor_details || {},
        consumer_name: data.consumer_name || "",
        service_number: data.service_number || "",
        unique_service_number: data.unique_service_number || "",
        ero: data.ero || "",
        section_name: data.section_name || "",
        images: {
          photos: photos,
        },
      };
      setFormData(formattedData);
    }
    setFetching(false);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const parsed = parseDimensions(formData.dimensions);
      const search_tokens = buildSearchTokens([
        formData.id,
        formData.media_id,
        formData.city,
        formData.area,
        formData.location,
      ]);

      const { error } = await supabase
        .from('media_assets')
        .update({
          media_type: formData.media_type,
          media_id: formData.media_id || null,
          status: formData.status,
          category: formData.category,
          location: formData.location,
          area: formData.area,
          city: formData.city,
          district: formData.district || null,
          state: formData.state || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          direction: formData.direction || null,
          google_street_view_url: formData.google_street_view_url || null,
          dimensions: formData.dimensions,
          total_sqft: parsed.totalSqft,
          illumination: formData.illumination || null,
          is_multi_face: parsed.isMultiFace,
          faces: parsed.faces,
          card_rate: parseFloat(formData.card_rate),
          base_rent: formData.base_rent ? parseFloat(formData.base_rent) : null,
          base_margin: formData.base_margin ? parseFloat(formData.base_margin) : null,
          gst_percent: parseFloat(formData.gst_percent),
          printing_charges: formData.printing_charges ? parseFloat(formData.printing_charges) : null,
          mounting_charges: formData.mounting_charges ? parseFloat(formData.mounting_charges) : null,
          concession_fee: formData.concession_fee ? parseFloat(formData.concession_fee) : null,
          ad_tax: formData.ad_tax ? parseFloat(formData.ad_tax) : null,
          electricity: formData.electricity ? parseFloat(formData.electricity) : null,
          maintenance: formData.maintenance ? parseFloat(formData.maintenance) : null,
          ownership: formData.ownership,
          municipal_authority: formData.municipal_authority || null,
          is_public: formData.is_public,
          vendor_details: formData.ownership === 'rented' ? formData.vendor_details : null,
          search_tokens,
          // Power details
          consumer_name: formData.consumer_name || null,
          service_number: formData.service_number || null,
          unique_service_number: formData.unique_service_number || null,
          ero: formData.ero || null,
          section_name: formData.section_name || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media asset updated successfully",
      });
      navigate(`/admin/media-assets/${id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };


  if (fetching) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return null;
  }

  const showPowerFields = formData.illumination && ['Frontlit', 'Backlit', 'Digital'].includes(formData.illumination);

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Enhanced Header */}
          <div className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 border border-primary/20 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => navigate(`/admin/media-assets/${id}`)} 
                  type="button"
                  className="bg-background/80 hover:bg-background"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Edit Media Asset
                  </h1>
                  <p className="text-sm text-muted-foreground font-mono mt-1 flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    {formData.id}
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={loading} size="lg" className="shadow-lg">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Basic Information</CardTitle>
                      <CardDescription>Essential asset details and classification</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="form-grid pt-6">
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Asset ID</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Unique system-generated identifier</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input value={formData.id} readOnly disabled />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Municipal Ref. ID</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Reference ID from municipal authority (if applicable)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      value={formData.media_id} 
                      onChange={(e) => updateField('media_id', e.target.value)}
                      placeholder="Optional reference number"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label className="form-label-required">Media Type</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Type of media (e.g., Billboard, Hoarding, Bus Shelter)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      required 
                      value={formData.media_type} 
                      onChange={(e) => updateField('media_type', e.target.value)}
                      placeholder="e.g., Billboard"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Category</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>OOH: Traditional outdoor<br/>DOOH: Digital outdoor<br/>Transit: Mobile media</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OOH">OOH</SelectItem>
                        <SelectItem value="DOOH">DOOH</SelectItem>
                        <SelectItem value="Transit">Transit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Illumination</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Lighting type affects power bill tracking</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.illumination || ''} onValueChange={(v) => updateField('illumination', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non-lit">Non-lit</SelectItem>
                        <SelectItem value="Frontlit">Frontlit</SelectItem>
                        <SelectItem value="Backlit">Backlit</SelectItem>
                        <SelectItem value="Digital">Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Status</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Current availability status of the asset</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Booked">Booked</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="overflow-hidden border-accent/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-accent/5 via-primary/5 to-accent/5 border-b">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-accent/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Location Details</CardTitle>
                      <CardDescription>Geographic information and coordinates</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="form-grid pt-6">
                  <div className="md:col-span-2 input-group">
                    <div className="flex items-center gap-2">
                      <Label className="form-label-required">Location</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Specific address or landmark description</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      required 
                      value={formData.location} 
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="e.g., Opposite Central Mall, Main Road"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label className="form-label-required">Area</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Locality or neighborhood name</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      required 
                      value={formData.area} 
                      onChange={(e) => updateField('area', e.target.value)}
                      placeholder="e.g., Banjara Hills"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label className="form-label-required">City</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>City where the asset is located</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      required 
                      value={formData.city} 
                      onChange={(e) => updateField('city', e.target.value)}
                      placeholder="e.g., Hyderabad"
                    />
                  </div>
                  <div className="input-group">
                    <Label>District</Label>
                    <Input 
                      value={formData.district || ''} 
                      onChange={(e) => updateField('district', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <Label>State</Label>
                    <Input 
                      value={formData.state || ''} 
                      onChange={(e) => updateField('state', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Latitude</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>GPS coordinates for map display</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      step="any" 
                      value={formData.latitude} 
                      onChange={(e) => updateField('latitude', e.target.value)}
                      placeholder="e.g., 17.4065"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Longitude</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>GPS coordinates for map display</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      step="any" 
                      value={formData.longitude} 
                      onChange={(e) => updateField('longitude', e.target.value)}
                      placeholder="e.g., 78.4772"
                    />
                  </div>
                  <div className="md:col-span-2 input-group">
                    <div className="flex items-center gap-2">
                      <Label>Direction</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Direction the hoarding faces (helpful for visibility assessment)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      value={formData.direction || ''} 
                      onChange={(e) => updateField('direction', e.target.value)} 
                      placeholder="e.g., Towards City Center"
                    />
                  </div>
                  <div className="md:col-span-2 input-group">
                    <div className="flex items-center gap-2">
                      <Label>Google Street View URL</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-generated from lat/long for virtual site view</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        value={formData.google_street_view_url || ''} 
                        onChange={(e) => updateField('google_street_view_url', e.target.value)}
                        placeholder="Auto-generated from coordinates"
                      />
                      {formData.google_street_view_url && (
                        <Button variant="ghost" size="icon" asChild type="button">
                          <a href={formData.google_street_view_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specifications */}
              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Specifications</CardTitle>
                      <CardDescription>Physical dimensions and area calculations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="form-grid pt-6">
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label className="form-label-required">Dimensions (W×H)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Width × Height in feet<br/>Multi-face: Use hyphen (e.g., 25x5-12x3)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      required 
                      value={formData.dimensions} 
                      onChange={(e) => updateField('dimensions', e.target.value)} 
                      placeholder="e.g., 40x20 or 25x5-12x3"
                    />
                    <p className="form-helper-text">Format: Width×Height (e.g., 40x20)</p>
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Total Sq.Ft</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-calculated from dimensions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input value={formData.total_sqft || 0} readOnly disabled className="bg-muted/50" />
                  </div>
                  
                  {formData.is_multi_face && formData.faces?.length > 0 && (
                    <div className="md:col-span-2 space-y-3 rounded-xl border border-accent/30 p-4 bg-gradient-to-br from-accent/5 to-primary/5">
                      <h4 className="font-semibold text-sm flex items-center gap-2 text-accent">
                        <FileText className="h-4 w-4" />
                        Face Breakdown
                      </h4>
                      <div className="space-y-2">
                        {formData.faces.map((face: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm p-3 rounded-lg bg-background border border-border shadow-sm">
                            <span className="font-medium">{face.label}</span>
                            <span className="text-muted-foreground">{face.width}ft × {face.height}ft</span>
                            <span className="font-semibold text-primary">{(face.width * face.height).toFixed(2)} sq.ft</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financials */}
              <Card className="overflow-hidden border-green-500/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 border-b">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Financials & Ownership</CardTitle>
                      <CardDescription>Pricing, costs, and ownership details</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="form-grid pt-6">
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Ownership</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Own: Company-owned asset<br/>Rented: Leased from vendor</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.ownership || 'own'} onValueChange={(v) => updateField('ownership', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own">Own</SelectItem>
                        <SelectItem value="rented">Rented</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.ownership === 'own' && (
                    <div className="input-group">
                      <div className="flex items-center gap-2">
                        <Label>Municipal Authority</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Governing body for municipal permissions</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Combobox
                        options={municipalAuthorities}
                        value={formData.municipal_authority || ''}
                        onChange={(v) => updateField('municipal_authority', v)}
                        placeholder="Select or create..."
                      />
                    </div>
                  )}
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label className="form-label-required">Card Rate (₹/month)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Standard published rate for this asset</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      required 
                      value={formData.card_rate} 
                      onChange={(e) => updateField('card_rate', e.target.value)}
                      placeholder="Monthly rate"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Base Rent (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Base cost before margin (for rented assets)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.base_rent} 
                      onChange={(e) => updateField('base_rent', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Base Margin (%)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Profit margin percentage on base rent</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.base_margin} 
                      onChange={(e) => updateField('base_margin', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>GST (%)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>GST percentage (typically 18%)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.gst_percent} 
                      onChange={(e) => updateField('gst_percent', e.target.value)}
                      placeholder="18"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Printing Charges (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cost for flex/vinyl printing per campaign</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.printing_charges} 
                      onChange={(e) => updateField('printing_charges', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Mounting Charges (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Installation cost per campaign</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.mounting_charges} 
                      onChange={(e) => updateField('mounting_charges', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Concession Fee (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fee paid to landlord/authority</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.concession_fee} 
                      onChange={(e) => updateField('concession_fee', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Ad Tax (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Municipal advertising tax</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.ad_tax} 
                      onChange={(e) => updateField('ad_tax', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Electricity (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Monthly power cost (for illuminated assets)</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.electricity} 
                      onChange={(e) => updateField('electricity', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="input-group">
                    <div className="flex items-center gap-2">
                      <Label>Maintenance (₹)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Monthly maintenance and upkeep cost</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input 
                      type="number" 
                      value={formData.maintenance} 
                      onChange={(e) => updateField('maintenance', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </CardContent>
              </Card>

          {/* Vendor Details (if rented) */}
          {formData.ownership === 'rented' && (
            <VendorDetailsForm
              value={formData.vendor_details}
              onChange={(vendorDetails) => updateField('vendor_details', vendorDetails)}
            />
          )}

              {/* Power Details (conditional) */}
              {showPowerFields && (
                <Card className="overflow-hidden border-yellow-500/20 shadow-lg">
                  <CardHeader className="bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5 border-b">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <DollarSign className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Power Details</CardTitle>
                        <CardDescription>Electricity connection for illuminated assets</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="form-grid pt-6">
                    <div className="input-group">
                      <div className="flex items-center gap-2">
                        <Label>Consumer Name</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Name on electricity bill account</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input 
                        value={formData.consumer_name} 
                        onChange={(e) => updateField('consumer_name', e.target.value)}
                        placeholder="Account holder name"
                      />
                    </div>
                    <div className="input-group">
                      <div className="flex items-center gap-2">
                        <Label>Service Number</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Electricity service connection number</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input 
                        value={formData.service_number} 
                        onChange={(e) => updateField('service_number', e.target.value)}
                        placeholder="Service ID"
                      />
                    </div>
                    <div className="input-group">
                      <div className="flex items-center gap-2">
                        <Label>Unique Service Number</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Unique identifier for power bill tracking</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input 
                        value={formData.unique_service_number} 
                        onChange={(e) => updateField('unique_service_number', e.target.value)}
                        placeholder="Unique ID"
                      />
                    </div>
                    <div className="input-group">
                      <Label>ERO</Label>
                      <Input 
                        value={formData.ero} 
                        onChange={(e) => updateField('ero', e.target.value)}
                        placeholder="Electricity Revenue Officer"
                      />
                    </div>
                    <div className="input-group">
                      <Label>Section Name</Label>
                      <Input 
                        value={formData.section_name} 
                        onChange={(e) => updateField('section_name', e.target.value)}
                        placeholder="Distribution section"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-1 space-y-6">
              {/* Image Preview Card */}
              {formData?.images?.photos && formData.images.photos.length > 0 && (
                <Card className="overflow-hidden border-primary/20 shadow-lg sticky top-4">
                  <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl">Asset Images</CardTitle>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formData.images.photos.length} photo{formData.images.photos.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <UnifiedPhotoGallery 
                      photos={formData.images.photos}
                      onPhotoDeleted={fetchAsset}
                      canDelete={isAdmin}
                      bucket="media-assets"
                      title="Asset Photos"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Status & Visibility Card */}
              <Card className="overflow-hidden border-primary/20 shadow-lg sticky top-4">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Status & Visibility</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center justify-between rounded-xl border border-primary/20 p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                    <div>
                      <Label className="text-base">Visible on Public Site</Label>
                      <p className="text-xs text-muted-foreground mt-1">Display this asset on the public website</p>
                    </div>
                    <Switch 
                      checked={formData.is_public ?? true} 
                      onCheckedChange={(checked) => updateField('is_public', checked)} 
                    />
                  </div>

                  <div className="input-group">
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => updateField('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Booked">Booked</SelectItem>
                        <SelectItem value="Blocked">Blocked</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* PROOF PHOTOS UPLOAD SECTION - Full Width Below */}
          <div className="space-y-6 mt-8">
            <PhotoUploadSection assetId={id!} onUploadComplete={fetchAsset} />
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}

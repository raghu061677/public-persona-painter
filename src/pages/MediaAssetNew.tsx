import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";
import { parseDimensions, buildSearchTokens } from "@/utils/mediaAssets";
import { generateMediaAssetCode } from "@/lib/codeGenerator";
import { buildStreetViewUrl } from "@/lib/streetview";
import { ArrowLeft, Sparkles, Image as ImageIcon, Calendar as CalendarIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const CITY_CODES = [
  { label: "Hyderabad", value: "HYD" },
  { label: "Karimnagar", value: "KNR" },
  { label: "Husnabad", value: "HSB" },
  { label: "Sircilla", value: "SRL" },
];

const MEDIA_TYPE_CODES = [
  { label: "Bus Shelter", value: "BSQ", fullName: "Bus Shelter" },
  { label: "Billboard", value: "BB", fullName: "Billboard" },
  { label: "Unipole", value: "UNP", fullName: "Unipole" },
  { label: "Cantilever", value: "CNT", fullName: "Cantilever" },
];

type ImageField = 'geoTaggedPhoto' | 'newspaperPhoto' | 'trafficPhoto1' | 'trafficPhoto2';

export default function MediaAssetNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cityCode, setCityCode] = useState("");
  const [mediaTypeCode, setMediaTypeCode] = useState("");
  const [municipalAuthorities, setMunicipalAuthorities] = useState<{ label: string; value: string }[]>([]);
  const [imageFiles, setImageFiles] = useState<Record<ImageField, File | null>>({
    geoTaggedPhoto: null,
    newspaperPhoto: null,
    trafficPhoto1: null,
    trafficPhoto2: null,
  });
  const [imagePreviews, setImagePreviews] = useState<Record<ImageField, string>>({
    geoTaggedPhoto: '',
    newspaperPhoto: '',
    trafficPhoto1: '',
    trafficPhoto2: '',
  });
  
  const [formData, setFormData] = useState({
    id: "",
    media_type: "",
    media_id: "",
    status: "Available",
    category: "OOH",
    location: "",
    area: "",
    city: "",
    district: "",
    state: "",
    latitude: "",
    longitude: "",
    direction: "",
    google_street_view_url: "",
    dimensions: "",
    illumination: "",
    is_multi_face: false,
    card_rate: "",
    base_rent: "",
    base_margin: "",
    gst_percent: "18",
    printing_charges: "",
    mounting_charges: "",
    concession_fee: "",
    ad_tax: "",
    electricity: "",
    maintenance: "",
    ownership: "own",
    municipal_authority: "",
    is_public: true,
    vendor_details: {},
    // Power fields
    consumer_name: "",
    service_number: "",
    unique_service_number: "",
    ero: "",
    section_name: "",
    // Date fields
    site_photo_date: null as Date | null,
    site_end_date: null as Date | null,
    available_from: null as Date | null,
  });

  // Auto-populate city and media_type when codes are selected
  useEffect(() => {
    if (cityCode) {
      const cityLabel = CITY_CODES.find(c => c.value === cityCode)?.label || "";
      updateField('city', cityLabel);
    }
  }, [cityCode]);

  useEffect(() => {
    if (mediaTypeCode) {
      const mediaTypeLabel = MEDIA_TYPE_CODES.find(m => m.value === mediaTypeCode)?.fullName || "";
      updateField('media_type', mediaTypeLabel);
    }
  }, [mediaTypeCode]);

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

  // Auto-update Street View URL when lat/lng changes
  useEffect(() => {
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat && lng) {
      const url = buildStreetViewUrl(lat, lng);
      if (formData.google_street_view_url !== url) {
        setFormData(prev => ({ ...prev, google_street_view_url: url }));
      }
    }
  }, [formData.latitude, formData.longitude]);

  // Parse dimensions and update faces/sqft
  useEffect(() => {
    if (formData.dimensions) {
      const parsed = parseDimensions(formData.dimensions);
      setFormData(prev => ({
        ...prev,
        is_multi_face: parsed.isMultiFace,
        faces: parsed.faces,
        total_sqft: parsed.totalSqft,
      }) as any);
    }
  }, [formData.dimensions]);

  const generateAssetId = async () => {
    if (!cityCode || !mediaTypeCode) {
      toast({
        title: "Missing Information",
        description: "Please select both City and Media Type first",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      // Get the full city name from the selected code
      const cityLabel = CITY_CODES.find(c => c.value === cityCode)?.label || "";
      const mediaTypeLabel = MEDIA_TYPE_CODES.find(m => m.value === mediaTypeCode)?.fullName || "";
      
      if (!cityLabel || !mediaTypeLabel) {
        throw new Error("Invalid city or media type selection");
      }

      // Use the new centralized code generator
      const generatedId = await generateMediaAssetCode(cityLabel, mediaTypeLabel);
      
      updateField('id', generatedId);
      
      toast({
        title: "ID Generated",
        description: `Asset ID: ${generatedId}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleImageSelect = (file: File, field: ImageField) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    
    setImageFiles(prev => ({ ...prev, [field]: file }));
    setImagePreviews(prev => ({ ...prev, [field]: localUrl }));
  };

  const uploadImages = async (assetId: string) => {
    const imageData: any = {};
    
    for (const key of Object.keys(imageFiles) as ImageField[]) {
      const file = imageFiles[key];
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${assetId}/${key}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('hero-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('hero-images')
          .getPublicUrl(fileName);

        imageData[key] = {
          url: publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
        };
      }
    }
    
    return imageData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's company_id
      const { data: companyUser, error: companyError } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (companyError || !companyUser) {
        throw new Error("No active company association found");
      }

      // Upload images
      const images = await uploadImages(formData.id);

      const parsed = parseDimensions(formData.dimensions);
      const search_tokens = buildSearchTokens([
        formData.id,
        formData.media_id,
        formData.city,
        formData.area,
        formData.location,
      ]);

      const { error } = await supabase.from('media_assets').insert({
        id: formData.id,
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
        images: images,
        search_tokens,
        company_id: companyUser.company_id,
        created_by: user.id,
      } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Media asset created successfully",
      });
      navigate(`/admin/media-assets/${formData.id}`);
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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const ImageUploader = ({ field, label }: { field: ImageField; label: string }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const imgUrl = imagePreviews[field];

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <input
          type="file"
          ref={fileRef}
          onChange={(e) => e.target.files && handleImageSelect(e.target.files[0], field)}
          className="hidden"
          accept="image/*"
        />
        <div
          className="relative aspect-video w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary"
          onClick={() => fileRef.current?.click()}
        >
          {imgUrl ? (
            <img src={imgUrl} alt={label} className="object-cover w-full h-full rounded-md" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Click to upload</p>
            </>
          )}
        </div>
      </div>
    );
  };

  const showPowerFields = formData.illumination && ['Frontlit', 'Backlit', 'Digital'].includes(formData.illumination);

  return (
    <form onSubmit={handleSubmit} className="container mx-auto px-6 py-8 max-w-6xl">
      <header className="flex items-center justify-between pb-4 mb-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/media-assets')} type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Media Asset</h1>
            {formData.id && <p className="text-sm text-muted-foreground font-mono">{formData.id}</p>}
          </div>
        </div>
        <Button type="submit" disabled={loading || !formData.id}>
          {loading ? 'Saving...' : 'Create Asset'}
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          {/* Auto-Generate ID */}
          <Card>
            <CardHeader>
              <CardTitle>Auto-Generate Asset ID</CardTitle>
              <CardDescription>Select city and media type to generate a unique ID</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>City *</Label>
                <Select value={cityCode} onValueChange={setCityCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CITY_CODES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Media Type *</Label>
                <Select value={mediaTypeCode} onValueChange={setMediaTypeCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIA_TYPE_CODES.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  type="button" 
                  onClick={generateAssetId} 
                  disabled={!cityCode || !mediaTypeCode || generating}
                  className="w-full"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generating ? 'Generating...' : 'Generate ID'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Asset ID</Label>
                <Input value={formData.id} readOnly disabled />
              </div>
              <div>
                <Label>Municipal Ref. ID</Label>
                <Input value={formData.media_id} onChange={(e) => updateField('media_id', e.target.value)} />
              </div>
              <div>
                <Label>Media Type</Label>
                <Input value={formData.media_type} readOnly disabled />
              </div>
              <div>
                <Label>Category</Label>
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
              <div>
                <Label>Illumination</Label>
                <Select value={formData.illumination} onValueChange={(v) => updateField('illumination', v)}>
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
              <div>
                <Label>Status</Label>
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
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Location *</Label>
                <Input required value={formData.location} onChange={(e) => updateField('location', e.target.value)} />
              </div>
              <div>
                <Label>Area *</Label>
                <Input required value={formData.area} onChange={(e) => updateField('area', e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={formData.city} readOnly disabled />
              </div>
              <div>
                <Label>District</Label>
                <Input value={formData.district} onChange={(e) => updateField('district', e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={formData.state} onChange={(e) => updateField('state', e.target.value)} />
              </div>
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={formData.latitude} onChange={(e) => updateField('latitude', e.target.value)} />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={formData.longitude} onChange={(e) => updateField('longitude', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Direction</Label>
                <Input value={formData.direction} onChange={(e) => updateField('direction', e.target.value)} placeholder="e.g., Towards City Center" />
              </div>
              <div className="md:col-span-2">
                <Label>Google Street View URL</Label>
                <div className="flex gap-2">
                  <Input value={formData.google_street_view_url} readOnly placeholder="Auto-generated from Lat/Lng" />
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
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dimensions (WxH) *</Label>
                <Input 
                  required 
                  value={formData.dimensions} 
                  onChange={(e) => updateField('dimensions', e.target.value)} 
                  placeholder="e.g., 40x20 or 25x5-12x3 for multi-face"
                />
              </div>
              <div>
                <Label>Total Sq.Ft</Label>
                <Input value={(formData as any).total_sqft || 0} readOnly disabled />
              </div>
              
              {(formData as any).is_multi_face && (formData as any).faces?.length > 0 && (
                <div className="md:col-span-2 space-y-2 rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium text-sm">Face Breakdown</h4>
                  {(formData as any).faces.map((face: any, index: number) => (
                    <div key={index} className="flex justify-between items-center text-sm p-2 rounded-md bg-background">
                      <span>{face.label}</span>
                      <span>{face.width}ft x {face.height}ft</span>
                      <span className="font-semibold">{(face.width * face.height).toFixed(2)} sq.ft</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader>
              <CardTitle>Financials & Ownership</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Ownership</Label>
                <Select value={formData.ownership} onValueChange={(v) => updateField('ownership', v)}>
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
                <div>
                  <Label>Municipal Authority</Label>
                  <Combobox
                    options={municipalAuthorities}
                    value={formData.municipal_authority}
                    onChange={(v) => updateField('municipal_authority', v)}
                    placeholder="Select or create..."
                  />
                </div>
              )}
              <div>
                <Label>Card Rate (₹/month) *</Label>
                <Input type="number" required value={formData.card_rate} onChange={(e) => updateField('card_rate', e.target.value)} />
              </div>
              <div>
                <Label>Base Rent (₹)</Label>
                <Input type="number" value={formData.base_rent} onChange={(e) => updateField('base_rent', e.target.value)} />
              </div>
              <div>
                <Label>Base Margin (%)</Label>
                <Input type="number" value={formData.base_margin} onChange={(e) => updateField('base_margin', e.target.value)} />
              </div>
              <div>
                <Label>GST (%)</Label>
                <Input type="number" value={formData.gst_percent} onChange={(e) => updateField('gst_percent', e.target.value)} />
              </div>
              <div>
                <Label>Printing Charges (₹)</Label>
                <Input type="number" value={formData.printing_charges} onChange={(e) => updateField('printing_charges', e.target.value)} />
              </div>
              <div>
                <Label>Mounting Charges (₹)</Label>
                <Input type="number" value={formData.mounting_charges} onChange={(e) => updateField('mounting_charges', e.target.value)} />
              </div>
              <div>
                <Label>Concession Fee (₹)</Label>
                <Input type="number" value={formData.concession_fee} onChange={(e) => updateField('concession_fee', e.target.value)} />
              </div>
              <div>
                <Label>Ad Tax (₹)</Label>
                <Input type="number" value={formData.ad_tax} onChange={(e) => updateField('ad_tax', e.target.value)} />
              </div>
              <div>
                <Label>Electricity (₹)</Label>
                <Input type="number" value={formData.electricity} onChange={(e) => updateField('electricity', e.target.value)} />
              </div>
              <div>
                <Label>Maintenance (₹)</Label>
                <Input type="number" value={formData.maintenance} onChange={(e) => updateField('maintenance', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Vendor Details (if rented) */}
          {formData.ownership === 'rented' && (
            <VendorDetailsForm
              value={formData.vendor_details as any}
              onChange={(vendorDetails) => updateField('vendor_details', vendorDetails)}
            />
          )}

          {/* Power Details (conditional) */}
          {showPowerFields && (
            <Card>
              <CardHeader>
                <CardTitle>Power Details</CardTitle>
                <CardDescription>Electricity connection details for illuminated assets</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Consumer Name</Label>
                  <Input value={formData.consumer_name} onChange={(e) => updateField('consumer_name', e.target.value)} />
                </div>
                <div>
                  <Label>Service Number</Label>
                  <Input value={formData.service_number} onChange={(e) => updateField('service_number', e.target.value)} />
                </div>
                <div>
                  <Label>Unique Service Number</Label>
                  <Input value={formData.unique_service_number} onChange={(e) => updateField('unique_service_number', e.target.value)} />
                </div>
                <div>
                  <Label>ERO</Label>
                  <Input value={formData.ero} onChange={(e) => updateField('ero', e.target.value)} />
                </div>
                <div>
                  <Label>Section Name</Label>
                  <Input value={formData.section_name} onChange={(e) => updateField('section_name', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status & Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Visible on Public Site</Label>
                  <p className="text-xs text-muted-foreground">Show on public map</p>
                </div>
                <Switch checked={formData.is_public} onCheckedChange={(checked) => updateField('is_public', checked)} />
              </div>
              
              <div>
                <Label>Next Available From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.available_from ? format(formData.available_from, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.available_from || undefined}
                      onSelect={(date) => updateField('available_from', date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Site End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.site_end_date ? format(formData.site_end_date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.site_end_date || undefined}
                      onSelect={(date) => updateField('site_end_date', date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Site Photo Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" type="button">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.site_photo_date ? format(formData.site_photo_date, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.site_photo_date || undefined}
                      onSelect={(date) => updateField('site_photo_date', date || null)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proof & Site Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUploader field="geoTaggedPhoto" label="Geo Tagged Photo" />
              <ImageUploader field="newspaperPhoto" label="Newspaper Photo" />
              <ImageUploader field="trafficPhoto1" label="Traffic Photo 1" />
              <ImageUploader field="trafficPhoto2" label="Traffic Photo 2" />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

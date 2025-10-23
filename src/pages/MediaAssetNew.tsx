import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { computeTotalSqft, buildSearchTokens } from "@/utils/mediaAssets";
import { ArrowLeft, Sparkles, Upload, X } from "lucide-react";

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

export default function MediaAssetNew() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cityCode, setCityCode] = useState("");
  const [mediaTypeCode, setMediaTypeCode] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
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
      // Query existing assets with the same city and media type pattern
      const pattern = `${cityCode}-${mediaTypeCode}-%`;
      const { data, error } = await supabase
        .from('media_assets')
        .select('id')
        .ilike('id', pattern)
        .order('id', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextSerial = 1;
      if (data && data.length > 0) {
        // Extract the serial number from the last ID
        const lastId = data[0].id;
        const parts = lastId.split('-');
        if (parts.length === 3) {
          const lastSerial = parseInt(parts[2], 10);
          nextSerial = lastSerial + 1;
        }
      }

      const paddedSerial = String(nextSerial).padStart(4, '0');
      const generatedId = `${cityCode}-${mediaTypeCode}-${paddedSerial}`;
      
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files]);

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (assetId: string) => {
    if (selectedImages.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of selectedImages) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${assetId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('hero-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hero-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload images first if any
      setUploading(true);
      const imageUrls = await uploadImages(formData.id);
      setUploading(false);

      // Compute total sqft and search tokens
      const total_sqft = computeTotalSqft(formData.dimensions);
      const search_tokens = buildSearchTokens([
        formData.id,
        formData.media_id,
        formData.city,
        formData.area,
        formData.location,
      ]);

      const { error } = await supabase.from('media_assets').insert({
        ...formData,
        image_urls: imageUrls,
        total_sqft,
        search_tokens,
        created_by: user.id,
        // Convert string numbers to actual numbers
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
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
      setUploading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/media-assets')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>

        <h1 className="text-3xl font-bold mb-8">Add New Media Asset</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ID Generator */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Auto-Generate Asset ID
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cityCode">City *</Label>
                  <Select value={cityCode} onValueChange={setCityCode}>
                    <SelectTrigger id="cityCode">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_CODES.map(city => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label} ({city.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mediaTypeCode">Media Type *</Label>
                  <Select value={mediaTypeCode} onValueChange={setMediaTypeCode}>
                    <SelectTrigger id="mediaTypeCode">
                      <SelectValue placeholder="Select media type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_TYPE_CODES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label} ({type.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                type="button" 
                onClick={generateAssetId} 
                disabled={generating || !cityCode || !mediaTypeCode}
                className="w-full"
                variant="gradient"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {generating ? "Generating..." : "Generate Asset ID"}
              </Button>

              {formData.id && (
                <div className="p-4 bg-background rounded-lg border-2 border-primary">
                  <Label className="text-xs text-muted-foreground">Generated Asset ID</Label>
                  <p className="text-2xl font-bold text-primary mt-1">{formData.id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="media_id">Media ID (Optional)</Label>
                <Input
                  id="media_id"
                  value={formData.media_id}
                  onChange={(e) => updateField('media_id', e.target.value)}
                  placeholder="Custom reference ID"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
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
              <div>
                <Label htmlFor="category">Category</Label>
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
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  required
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="area">Area *</Label>
                <Input
                  id="area"
                  required
                  value={formData.area}
                  onChange={(e) => updateField('area', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Auto-filled from city selection"
                  disabled={!!cityCode}
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => updateField('district', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => updateField('latitude', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => updateField('longitude', e.target.value)}
                />
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
                <Label htmlFor="dimensions">Dimensions (W x H ft) *</Label>
                <Input
                  id="dimensions"
                  required
                  value={formData.dimensions}
                  onChange={(e) => updateField('dimensions', e.target.value)}
                  placeholder="e.g., 40x20"
                />
                {formData.dimensions && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Total: {computeTotalSqft(formData.dimensions)} sq ft
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="illumination">Illumination</Label>
                <Input
                  id="illumination"
                  value={formData.illumination}
                  onChange={(e) => updateField('illumination', e.target.value)}
                  placeholder="e.g., Frontlit, Backlit"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Costs</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="card_rate">Card Rate (₹/month) *</Label>
                <Input
                  id="card_rate"
                  type="number"
                  required
                  value={formData.card_rate}
                  onChange={(e) => updateField('card_rate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="base_rent">Base Rent (₹)</Label>
                <Input
                  id="base_rent"
                  type="number"
                  value={formData.base_rent}
                  onChange={(e) => updateField('base_rent', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gst_percent">GST (%)</Label>
                <Input
                  id="gst_percent"
                  type="number"
                  value={formData.gst_percent}
                  onChange={(e) => updateField('gst_percent', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="printing_charges">Printing Charges (₹)</Label>
                <Input
                  id="printing_charges"
                  type="number"
                  value={formData.printing_charges}
                  onChange={(e) => updateField('printing_charges', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mounting_charges">Mounting Charges (₹)</Label>
                <Input
                  id="mounting_charges"
                  type="number"
                  value={formData.mounting_charges}
                  onChange={(e) => updateField('mounting_charges', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Asset Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-8 hover:border-primary transition-colors text-center">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP up to 10MB each
                    </p>
                  </div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </Label>
              </div>

              {imagePreviewUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreviewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/media-assets')}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading || uploading}>
              {uploading ? "Uploading Images..." : loading ? "Creating..." : "Create Asset"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

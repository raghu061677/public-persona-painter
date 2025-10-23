import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function MediaAssetEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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

      // Compute total sqft and search tokens
      const total_sqft = computeTotalSqft(formData.dimensions);
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
          media_id: formData.media_id,
          status: formData.status,
          category: formData.category,
          location: formData.location,
          area: formData.area,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          direction: formData.direction,
          google_street_view_url: formData.google_street_view_url,
          dimensions: formData.dimensions,
          total_sqft,
          illumination: formData.illumination,
          is_multi_face: formData.is_multi_face,
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
          municipal_authority: formData.municipal_authority,
          is_public: formData.is_public,
          search_tokens,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/media-assets/${id}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>

        <h1 className="text-3xl font-bold mb-8">Edit Media Asset - {formData.id}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="media_id">Media ID</Label>
                <Input
                  id="media_id"
                  value={formData.media_id || ""}
                  onChange={(e) => updateField('media_id', e.target.value)}
                  placeholder="Custom reference ID"
                />
              </div>
              <div>
                <Label htmlFor="media_type">Media Type *</Label>
                <Input
                  id="media_type"
                  required
                  value={formData.media_type}
                  onChange={(e) => updateField('media_type', e.target.value)}
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
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district || ""}
                  onChange={(e) => updateField('district', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state || ""}
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
              <div className="md:col-span-2">
                <Label htmlFor="direction">Direction</Label>
                <Input
                  id="direction"
                  value={formData.direction || ""}
                  onChange={(e) => updateField('direction', e.target.value)}
                  placeholder="e.g., Towards City Center"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="google_street_view_url">Google Street View URL</Label>
                <Input
                  id="google_street_view_url"
                  value={formData.google_street_view_url || ""}
                  onChange={(e) => updateField('google_street_view_url', e.target.value)}
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
                  value={formData.illumination || ""}
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
                <Label htmlFor="base_margin">Base Margin (%)</Label>
                <Input
                  id="base_margin"
                  type="number"
                  value={formData.base_margin}
                  onChange={(e) => updateField('base_margin', e.target.value)}
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
              <div>
                <Label htmlFor="concession_fee">Concession Fee (₹)</Label>
                <Input
                  id="concession_fee"
                  type="number"
                  value={formData.concession_fee}
                  onChange={(e) => updateField('concession_fee', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ad_tax">Ad Tax (₹)</Label>
                <Input
                  id="ad_tax"
                  type="number"
                  value={formData.ad_tax}
                  onChange={(e) => updateField('ad_tax', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="electricity">Electricity (₹)</Label>
                <Input
                  id="electricity"
                  type="number"
                  value={formData.electricity}
                  onChange={(e) => updateField('electricity', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="maintenance">Maintenance (₹)</Label>
                <Input
                  id="maintenance"
                  type="number"
                  value={formData.maintenance}
                  onChange={(e) => updateField('maintenance', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Ownership */}
          <Card>
            <CardHeader>
              <CardTitle>Ownership</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ownership">Ownership Type</Label>
                <Select value={formData.ownership} onValueChange={(v) => updateField('ownership', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Own</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.ownership === 'own' && (
                <div>
                  <Label htmlFor="municipal_authority">Municipal Authority</Label>
                  <Input
                    id="municipal_authority"
                    value={formData.municipal_authority || ""}
                    onChange={(e) => updateField('municipal_authority', e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/admin/media-assets/${id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

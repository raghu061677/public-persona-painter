import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Copy, Trash2, MapPin } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";

export default function MediaAssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchAsset();
  }, [id]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    }
  };

  const fetchAsset = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch asset details",
        variant: "destructive",
      });
      navigate('/admin/media-assets');
    } else {
      setAsset(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      navigate('/admin/media-assets');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!asset) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/media-assets')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{asset.id}</h1>
            <div className="flex items-center gap-3">
              <Badge className={getStatusColor(asset.status)}>
                {asset.status}
              </Badge>
              <span className="text-muted-foreground">{asset.media_type}</span>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/media-assets/new?duplicate=${asset.id}`)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{asset.location}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Area</p>
                  <p className="font-medium">{asset.area}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{asset.city}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">District</p>
                  <p className="font-medium">{asset.district || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State</p>
                  <p className="font-medium">{asset.state || 'N/A'}</p>
                </div>
              </div>
              {asset.latitude && asset.longitude && (
                <div>
                  <p className="text-sm text-muted-foreground">Coordinates</p>
                  <p className="font-medium">
                    {asset.latitude}, {asset.longitude}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specifications Card */}
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                  <p className="font-medium">{asset.dimensions}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Area</p>
                  <p className="font-medium">{asset.total_sqft} sq ft</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{asset.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Illumination</p>
                  <p className="font-medium">{asset.illumination || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Card Rate</p>
                  <p className="font-medium text-lg">{formatCurrency(asset.card_rate)}/month</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Rent</p>
                  <p className="font-medium">{formatCurrency(asset.base_rent)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST</p>
                  <p className="font-medium">{asset.gst_percent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Base Margin</p>
                  <p className="font-medium">{asset.base_margin || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Costs Card */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Printing</p>
                  <p className="font-medium">{formatCurrency(asset.printing_charges)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mounting</p>
                  <p className="font-medium">{formatCurrency(asset.mounting_charges)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Electricity</p>
                  <p className="font-medium">{formatCurrency(asset.electricity)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance</p>
                  <p className="font-medium">{formatCurrency(asset.maintenance)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ownership Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Ownership</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{asset.ownership}</p>
                </div>
                {asset.ownership === 'own' && asset.municipal_authority && (
                  <div>
                    <p className="text-sm text-muted-foreground">Municipal Authority</p>
                    <p className="font-medium">{asset.municipal_authority}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Created: {new Date(asset.created_at).toLocaleString()}</p>
          <p>Last updated: {new Date(asset.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

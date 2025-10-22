import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, Copy, Trash2, MapPin } from "lucide-react";
import { formatCurrency, getStatusColor } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";

interface AssetDetailsProps {
  asset: any;
  isAdmin?: boolean;
}

export function AssetDetails({ asset, isAdmin = false }: AssetDetailsProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('media_assets')
      .delete()
      .eq('id', asset.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
      setIsDeleting(false);
    } else {
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      navigate('/admin/media-assets');
    }
  };

  const handleEdit = () => {
    navigate(`/admin/media-assets/edit/${asset.id}`);
  };

  const handleDuplicate = () => {
    navigate(`/admin/media-assets/new?duplicate=${asset.id}`);
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/media-assets')}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to List
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
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
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Image Gallery */}
      {asset.image_urls && asset.image_urls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {asset.image_urls.map((url: string, index: number) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                  <img 
                    src={url} 
                    alt={`Asset ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(url, '_blank')}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
            {asset.direction && (
              <div>
                <p className="text-sm text-muted-foreground">Direction</p>
                <p className="font-medium">{asset.direction}</p>
              </div>
            )}
            {asset.latitude && asset.longitude && (
              <div>
                <p className="text-sm text-muted-foreground">Coordinates</p>
                <p className="font-medium">
                  {asset.latitude}, {asset.longitude}
                </p>
              </div>
            )}
            {asset.google_street_view_url && (
              <div>
                <p className="text-sm text-muted-foreground">Street View</p>
                <a 
                  href={asset.google_street_view_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View on Google Maps
                </a>
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
                <p className="text-sm text-muted-foreground">Media Type</p>
                <p className="font-medium">{asset.media_type}</p>
              </div>
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
              {asset.media_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Media ID</p>
                  <p className="font-medium">{asset.media_id}</p>
                </div>
              )}
            </div>
            {asset.is_multi_face && (
              <div className="mt-4">
                <Badge variant="secondary">Multi-Face</Badge>
              </div>
            )}
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

        {/* Additional Costs Card */}
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
                <p className="text-sm text-muted-foreground">Concession Fee</p>
                <p className="font-medium">{formatCurrency(asset.concession_fee)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ad Tax</p>
                <p className="font-medium">{formatCurrency(asset.ad_tax)}</p>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
              {asset.vendor_details && Object.keys(asset.vendor_details).length > 0 && (
                <>
                  {asset.vendor_details.name && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor Name</p>
                      <p className="font-medium">{asset.vendor_details.name}</p>
                    </div>
                  )}
                  {asset.vendor_details.contact && (
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor Contact</p>
                      <p className="font-medium">{asset.vendor_details.contact}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Metadata */}
      <div className="pt-6 border-t text-sm text-muted-foreground space-y-1">
        {asset.created_at && (
          <p>Created: {new Date(asset.created_at).toLocaleString()}</p>
        )}
        {asset.updated_at && (
          <p>Last updated: {new Date(asset.updated_at).toLocaleString()}</p>
        )}
        {asset.created_by && (
          <p>Created by: {asset.created_by}</p>
        )}
      </div>
    </div>
  );
}

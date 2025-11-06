import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Copy, Trash2, Zap, Wrench, Receipt, History } from "lucide-react";
import { getStatusColor } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";
import { AssetOverviewTab } from "./asset-overview-tab";
import { AssetPowerBillsTab } from "./asset-power-bills-tab";
import { AssetMaintenanceTab } from "./asset-maintenance-tab";
import { AssetBookingHistoryTab } from "./asset-booking-history-tab";

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
      {((asset.image_urls && asset.image_urls.length > 0) || (asset.images && Object.keys(asset.images).length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Display from image_urls array */}
              {asset.image_urls && asset.image_urls.map((url: string, index: number) => (
                <div key={`url-${index}`} className="aspect-square rounded-lg overflow-hidden border">
                  <img 
                    src={url} 
                    alt={`Asset ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(url, '_blank')}
                  />
                </div>
              ))}
              {/* Display from images JSONB object - extract url from nested structure */}
              {asset.images && Object.entries(asset.images).map(([key, imageData]: [string, any]) => {
                const imageUrl = imageData?.url || imageData;
                if (!imageUrl) return null;
                return (
                  <div key={`img-${key}`} className="aspect-square rounded-lg overflow-hidden border">
                    <img 
                      src={imageUrl} 
                      alt={imageData?.name || key}
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(imageUrl, '_blank')}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="power-bills">
            <Zap className="mr-2 h-4 w-4" />
            Power Bills
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Wrench className="mr-2 h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="booking-history">
            <History className="mr-2 h-4 w-4" />
            Booking History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AssetOverviewTab asset={asset} />
        </TabsContent>

        <TabsContent value="power-bills" className="mt-6">
          <AssetPowerBillsTab assetId={asset.id} asset={asset} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <AssetMaintenanceTab assetId={asset.id} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="booking-history" className="mt-6">
          <AssetBookingHistoryTab assetId={asset.id} />
        </TabsContent>
      </Tabs>

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

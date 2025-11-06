import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Copy, Trash2, Zap, Wrench, History, ChevronLeft, ChevronRight } from "lucide-react";
import { getStatusColor } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";
import { AssetOverviewTab } from "./asset-overview-tab";
import { AssetPowerBillsTab } from "./asset-power-bills-tab";
import { AssetMaintenanceTab } from "./asset-maintenance-tab";
import { AssetBookingHistoryTab } from "./asset-booking-history-tab";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface AssetDetailsProps {
  asset: any;
  isAdmin?: boolean;
}

export function AssetDetails({ asset, isAdmin = false }: AssetDetailsProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Collect all images
  const allImages: { url: string; name: string }[] = [];
  
  if (asset.image_urls && Array.isArray(asset.image_urls)) {
    asset.image_urls.forEach((url: string, index: number) => {
      allImages.push({ url, name: `Image ${index + 1}` });
    });
  }
  
  if (asset.images && typeof asset.images === 'object') {
    Object.entries(asset.images).forEach(([key, imageData]: [string, any]) => {
      const imageUrl = imageData?.url || imageData;
      if (imageUrl) {
        allImages.push({ url: imageUrl, name: imageData?.name || key });
      }
    });
  }

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

      {/* Two Column Layout: Details Left, Images Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
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

        {/* Right Column: Image Carousel - Takes 1 column, sticky */}
        {allImages.length > 0 && (
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Images</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedImageIndex + 1} / {allImages.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Image Display */}
                <div className="aspect-[4/3] rounded-lg overflow-hidden border bg-muted relative group">
                  <img
                    src={allImages[selectedImageIndex].url}
                    alt={allImages[selectedImageIndex].name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white text-sm font-medium">
                        {allImages[selectedImageIndex].name}
                      </p>
                    </div>
                  </div>
                  
                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedImageIndex((prev) => 
                          prev === 0 ? allImages.length - 1 : prev - 1
                        )}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedImageIndex((prev) => 
                          prev === allImages.length - 1 ? 0 : prev + 1
                        )}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Thumbnail Grid */}
                {allImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {allImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`aspect-square rounded-md overflow-hidden border-2 transition-all hover:scale-105 ${
                          index === selectedImageIndex
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* View Full Size Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(allImages[selectedImageIndex].url, '_blank')}
                >
                  View Full Size
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

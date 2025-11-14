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
import { EnhancedPowerBillsTab } from "./EnhancedPowerBillsTab";
import { AssetMaintenanceTab } from "./asset-maintenance-tab";
import { AssetBookingHistoryTab } from "./asset-booking-history-tab";
import { LatestPhotosSection } from "./LatestPhotosSection";
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

  // Collect all images from images.photos array
  const allImages: { url: string; name: string; tag?: string }[] = [];
  
  // New format: images.photos array
  if (asset.images?.photos && Array.isArray(asset.images.photos)) {
    asset.images.photos.forEach((photo: any, index: number) => {
      allImages.push({ 
        url: photo.url, 
        name: photo.tag || `Photo ${index + 1}`,
        tag: photo.tag 
      });
    });
  }
  
  // Legacy: image_urls array (if any old records exist)
  if (asset.image_urls && Array.isArray(asset.image_urls) && asset.image_urls.length > 0) {
    asset.image_urls.forEach((url: string, index: number) => {
      allImages.push({ url, name: `Image ${index + 1}` });
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

      {/* Two Column Layout: Tables on Left, Images on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Full Details (2/3 width) */}
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
              <EnhancedPowerBillsTab assetId={asset.id} asset={asset} isAdmin={isAdmin} />
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

        {/* Right Column - Image Preview (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Images Preview Card */}
          {allImages.length > 0 && (
            <Card className="border-l-4 border-l-primary sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>Images</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {selectedImageIndex + 1} / {allImages.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Image Display */}
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={allImages[selectedImageIndex].url}
                    alt={allImages[selectedImageIndex].name}
                    className="w-full h-full object-cover"
                  />
                  {allImages[selectedImageIndex].tag && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                        {allImages[selectedImageIndex].tag}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Navigation Controls */}
                {allImages.length > 1 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedImageIndex((prev) => 
                        prev === 0 ? allImages.length - 1 : prev - 1
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {allImages[selectedImageIndex].name}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedImageIndex((prev) => 
                        prev === allImages.length - 1 ? 0 : prev + 1
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Thumbnail Strip */}
                {allImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          idx === selectedImageIndex
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-transparent hover:border-muted-foreground/20'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Status & Visibility Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status & Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  <Badge variant={asset.is_public ? "default" : "secondary"}>
                    {asset.is_public ? "Public" : "Private"}
                  </Badge>
                </div>
                {asset.next_available_from && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available From</span>
                    <span className="text-sm font-medium">
                      {new Date(asset.next_available_from).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Latest Photos Section */}
          <LatestPhotosSection assetId={asset.id} />
        </div>
      </div>

      {/* Bottom Section: Latest Photos (moved to right column above) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 lg:hidden">
        {/* Latest Photos Section */}
        <div>
          <LatestPhotosSection assetId={asset.id} />
        </div>

        {/* Images Section */}
        {allImages.length > 0 && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
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
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                  disabled={selectedImageIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {selectedImageIndex + 1} of {allImages.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedImageIndex(Math.min(allImages.length - 1, selectedImageIndex + 1))}
                  disabled={selectedImageIndex === allImages.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Thumbnail Grid */}
              <div className="grid grid-cols-4 gap-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`
                      aspect-square rounded-md overflow-hidden border-2 transition-all
                      ${idx === selectedImageIndex ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:border-muted-foreground'}
                    `}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* View Full Size Button */}
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => window.open(allImages[selectedImageIndex].url, '_blank')}
              >
                View Full Size
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

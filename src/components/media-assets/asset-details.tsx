import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Copy, Trash2, Zap, Wrench, History, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { getStatusColor } from "@/utils/mediaAssets";
import { toast } from "@/hooks/use-toast";
import { AssetOverviewTab } from "./asset-overview-tab";
import { EnhancedPowerBillsTab } from "./EnhancedPowerBillsTab";
import { AssetMaintenanceTab } from "./asset-maintenance-tab";
import { AssetBookingHistoryTab } from "./asset-booking-history-tab";
import { LatestPhotosSection } from "./LatestPhotosSection";
import { AssetBookingCalendar } from "./AssetBookingCalendar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onQRGenerated?: (url: string) => void;
}

export function AssetDetails({ asset, isAdmin = false, onQRGenerated }: AssetDetailsProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingVisibility, setEditingVisibility] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(asset);

  // Collect all images - use primary_photo_url as fallback
  const allImages: { url: string; name: string; tag?: string }[] = [];
  
  // Primary photo as first image
  if (asset.primary_photo_url) {
    allImages.push({ 
      url: asset.primary_photo_url, 
      name: 'Primary Photo',
      tag: 'Main' 
    });
  }
  
  // Additional photos from media_photos should be loaded separately if needed
  // For now, just use the primary photo

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
    const displayCode = asset.media_asset_code || asset.id;
    navigate(`/admin/media-assets/edit/${displayCode}`);
  };

  const handleDuplicate = () => {
    navigate(`/admin/media-assets/new?duplicate=${asset.id}`);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('media_assets')
        .update({ status: newStatus as any })
        .eq('id', asset.id);

      if (error) throw error;

      setCurrentAsset({ ...currentAsset, status: newStatus as any });
      setEditingStatus(false);
      toast({
        title: "Success",
        description: "Asset status updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleVisibilityToggle = async () => {
    try {
      const newVisibility = !currentAsset.is_public;
      const { error } = await supabase
        .from('media_assets')
        .update({ is_public: newVisibility })
        .eq('id', asset.id);

      if (error) throw error;

      setCurrentAsset({ ...currentAsset, is_public: newVisibility });
      setEditingVisibility(false);
      toast({
        title: "Success",
        description: `Asset is now ${newVisibility ? 'public' : 'private'}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update visibility",
        variant: "destructive",
      });
    }
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
          <h1 className="text-3xl font-bold mb-2">
            {currentAsset.media_asset_code || currentAsset.id}
          </h1>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(currentAsset.status)}>
              {currentAsset.status}
            </Badge>
            <span className="text-muted-foreground">{currentAsset.media_type}</span>
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
              <AssetOverviewTab asset={currentAsset} />
            </TabsContent>

            <TabsContent value="power-bills" className="mt-6">
              <EnhancedPowerBillsTab assetId={currentAsset.id} asset={currentAsset} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <AssetMaintenanceTab assetId={currentAsset.id} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent value="booking-history" className="mt-6">
              <AssetBookingHistoryTab assetId={currentAsset.id} />
            </TabsContent>
          </Tabs>

          {/* Footer Metadata */}
          <div className="pt-6 border-t text-sm text-muted-foreground space-y-1">
            {currentAsset.created_at && (
              <p>Created: {new Date(currentAsset.created_at).toLocaleString()}</p>
            )}
            {currentAsset.updated_at && (
              <p>Last updated: {new Date(currentAsset.updated_at).toLocaleString()}</p>
            )}
            {currentAsset.created_by && (
              <p>Created by: {currentAsset.created_by}</p>
            )}
          </div>
        </div>

        {/* Right Column - Image Preview (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">

          {/* Latest Photos Section */}
          <LatestPhotosSection assetId={currentAsset.id} asset={currentAsset} />

          {/* Images Preview Card */}
          {allImages.length > 0 && (
            <Card className="border-l-4 border-l-primary relative">
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
          <Card className="relative z-5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Status & Visibility</CardTitle>
                {isAdmin && !editingStatus && !editingVisibility && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingStatus(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {editingStatus ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentAsset.status}
                        onValueChange={handleStatusUpdate}
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Booked">Booked</SelectItem>
                          <SelectItem value="Under Maintenance">Under Maintenance</SelectItem>
                          <SelectItem value="Blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingStatus(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge className={getStatusColor(currentAsset.status)}>
                      {currentAsset.status}
                    </Badge>
                  )}
                </div>

                {/* Visibility */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Visibility</span>
                  {editingVisibility ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleVisibilityToggle}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Make {currentAsset.is_public ? "Private" : "Public"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingVisibility(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant={currentAsset.is_public ? "default" : "secondary"}>
                        {currentAsset.is_public ? "Public" : "Private"}
                      </Badge>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingVisibility(true)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {currentAsset.next_available_from && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available From</span>
                    <span className="text-sm font-medium">
                      {new Date(currentAsset.next_available_from).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Booking Calendar */}
          <div className="relative z-0">
            <AssetBookingCalendar assetId={currentAsset.id} />
          </div>
        </div>
      </div>

      {/* Bottom Section: Latest Photos (moved to right column above) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 lg:hidden">
        {/* Latest Photos Section */}
        <div>
          <LatestPhotosSection assetId={currentAsset.id} />
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

/**
 * Unified Photo Gallery Component
 * Consolidates media-assets/PhotoGallery and operations/OperationsPhotoGallery
 * Displays photos with validation badges, GPS indicators, and delete functionality
 */

import { useState } from "react";
import { Trash2, MapPin, Eye, Calendar, Tag, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { PhotoSlideshow } from "@/components/media-assets/PhotoSlideshow";
import { deletePhoto } from "@/lib/photos";
import { format } from "date-fns";

export interface UnifiedPhoto {
  id: string;
  photo_url: string;
  category: string; // tag
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
  validation_score?: number;
  validation_issues?: string[];
  validation_suggestions?: string[];
}

interface UnifiedPhotoGalleryProps {
  photos: UnifiedPhoto[];
  onPhotoDeleted: () => void;
  canDelete?: boolean;
  bucket: 'media-assets' | 'operations-photos';
  title?: string;
  description?: string;
  assetData?: {
    asset_id?: string;
    city?: string;
    area?: string;
    location: string;
    direction?: string;
    dimension?: string;
    total_sqft?: number;
    illumination?: string;
  };
}

export function UnifiedPhotoGallery({
  photos,
  onPhotoDeleted,
  canDelete = false,
  bucket,
  title = "Photos",
  description,
  assetData
}: UnifiedPhotoGalleryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UnifiedPhoto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const getTagColor = (tag: string | undefined | null) => {
    if (!tag) return 'bg-gray-100 text-gray-800 border-gray-300';
    switch (tag.toLowerCase()) {
      case 'newspaper':
      case 'newspaper photo':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'traffic':
      case 'traffic photo':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'geo-tagged':
      case 'geo-tagged photo':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTagIcon = (tag: string | undefined | null) => {
    if (!tag) return '📷';
    switch (tag.toLowerCase()) {
      case 'newspaper':
      case 'newspaper photo':
        return '📰';
      case 'traffic':
      case 'traffic photo':
        return '🚦';
      case 'geo-tagged':
      case 'geo-tagged photo':
        return '📍';
      default:
        return '📷';
    }
  };

  const getValidationBadge = (photo: UnifiedPhoto) => {
    if (!photo.validation_score) return null;

    const score = photo.validation_score;
    const issues = photo.validation_issues || [];

    if (score >= 80) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {score}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">High quality photo</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else if (score >= 60) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {score}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm font-semibold mb-1">Issues detected:</p>
              <ul className="text-xs list-disc pl-4">
                {issues.slice(0, 3).map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    } else {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {score}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm font-semibold mb-1">Quality issues:</p>
              <ul className="text-xs list-disc pl-4">
                {issues.slice(0, 3).map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;

    setDeleting(true);
    try {
      await deletePhoto(selectedPhoto.id, selectedPhoto.photo_url, bucket);
      
      toast({
        title: "Photo Deleted",
        description: "The photo has been successfully deleted.",
      });
      
      setDeleteDialogOpen(false);
      setSelectedPhoto(null);
      onPhotoDeleted();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (photo: UnifiedPhoto) => {
    setSelectedPhoto(photo);
    setDeleteDialogOpen(true);
  };

  const openViewer = (photo: UnifiedPhoto) => {
    setSelectedPhoto(photo);
    setViewerOpen(true);
  };

  const openSlideshow = (index: number) => {
    setSlideshowIndex(index);
    setSlideshowOpen(true);
  };

  const handleDownload = async (photo: UnifiedPhoto) => {
    if (!assetData) {
      // Fallback without watermark
      const link = document.createElement("a");
      link.href = photo.photo_url;
      link.download = `photo-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    try {
      const { downloadImageWithWatermark } = await import('@/lib/downloadWithWatermark');
      
      await downloadImageWithWatermark({
        assetData: {
          city: assetData.city,
          area: assetData.area,
          location: assetData.location,
          direction: assetData.direction,
          dimension: assetData.dimension,
          total_sqft: assetData.total_sqft,
          illumination: assetData.illumination,
        },
        imageUrl: photo.photo_url,
        category: photo.category,
        assetId: assetData.asset_id,
      });
    } catch (error) {
      console.error('Error downloading with watermark:', error);
    }
  };

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No photos uploaded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{photos.length} photo{photos.length !== 1 ? 's' : ''}</Badge>
            {photos.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSlideshow(0)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Slideshow
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-all duration-200 bg-muted"
              >
                <img
                  src={photo.photo_url}
                  alt={photo.category}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => openViewer(photo)}
                  loading="lazy"
                />
                
                {/* Overlay with badges */}
                <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1">
                  <Badge className={`${getTagColor(photo.category)} border`}>
                    <span className="mr-1">{getTagIcon(photo.category)}</span>
                    {photo.category}
                  </Badge>
                  {getValidationBadge(photo)}
                  {photo.latitude && photo.longitude && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            <MapPin className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            GPS: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Action buttons */}
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(photo);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(photo);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Upload date */}
                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {format(new Date(photo.uploaded_at), 'MMM d, yyyy')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the photo from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.category}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Category:</p>
                  <p className="text-muted-foreground">{selectedPhoto.category}</p>
                </div>
                <div>
                  <p className="font-semibold">Uploaded:</p>
                  <p className="text-muted-foreground">
                    {format(new Date(selectedPhoto.uploaded_at), 'PPpp')}
                  </p>
                </div>
                {selectedPhoto.latitude && selectedPhoto.longitude && (
                  <div className="col-span-2">
                    <p className="font-semibold">GPS Coordinates:</p>
                    <p className="text-muted-foreground">
                      {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                {selectedPhoto.validation_issues && selectedPhoto.validation_issues.length > 0 && (
                  <div className="col-span-2">
                    <p className="font-semibold">Validation Issues:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {selectedPhoto.validation_issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedPhoto.validation_suggestions && selectedPhoto.validation_suggestions.length > 0 && (
                  <div className="col-span-2">
                    <p className="font-semibold">Suggestions:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      {selectedPhoto.validation_suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Slideshow */}
      <PhotoSlideshow
        photos={photos.map(p => ({ 
          url: p.photo_url, 
          tag: p.category, 
          uploaded_at: p.uploaded_at 
        }))}
        open={slideshowOpen}
        onOpenChange={setSlideshowOpen}
        initialIndex={slideshowIndex}
      />
    </>
  );
}

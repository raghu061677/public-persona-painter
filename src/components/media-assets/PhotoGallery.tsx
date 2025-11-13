import { useState } from "react";
import { Trash2, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhotoValidationBadge } from "./PhotoValidationBadge";
import { PhotoValidationResult } from "@/lib/photoValidation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ProofPhoto {
  url: string;
  tag: string;
  uploaded_at: string;
  latitude?: number;
  longitude?: number;
  validation?: PhotoValidationResult;
}

interface PhotoGalleryProps {
  assetId: string;
  photos: ProofPhoto[];
  onPhotoDeleted: () => void;
}

export function PhotoGallery({ assetId, photos, onPhotoDeleted }: PhotoGalleryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProofPhoto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getTagColor = (tag: string) => {
    if (tag.includes('Traffic')) return 'bg-blue-500';
    if (tag.includes('Newspaper')) return 'bg-purple-500';
    if (tag.includes('Geo')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getTagIcon = (tag: string) => {
    if (tag.includes('Traffic')) return '🚗';
    if (tag.includes('Newspaper')) return '📰';
    if (tag.includes('Geo')) return '📍';
    return '📷';
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;

    setDeleting(true);
    try {
      // Extract file path from URL
      const urlParts = selectedPhoto.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${assetId}/proofs/${fileName}`;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('media-assets')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Update database - remove photo from array
      const { data: asset, error: fetchError } = await supabase
        .from('media_assets')
        .select('images')
        .eq('id', assetId)
        .single();

      if (fetchError) throw fetchError;

      const currentPhotos = (asset.images as any)?.photos || [];
      const updatedPhotos = currentPhotos.filter((p: ProofPhoto) => p.url !== selectedPhoto.url);

      const { error: updateError } = await supabase
        .from('media_assets')
        .update({
          images: {
            ...(asset.images as any || {}),
            photos: updatedPhotos
          }
        })
        .eq('id', assetId);

      if (updateError) throw updateError;

      toast({
        title: "Photo Deleted",
        description: "Proof photo has been removed successfully",
      });

      setDeleteDialogOpen(false);
      setSelectedPhoto(null);
      onPhotoDeleted();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the photo",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (photo: ProofPhoto) => {
    setSelectedPhoto(photo);
    setDeleteDialogOpen(true);
  };

  const openViewer = (photo: ProofPhoto) => {
    setSelectedPhoto(photo);
    setViewerOpen(true);
  };

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Proof Photos</CardTitle>
          <CardDescription>
            {photos.length} proof photo{photos.length !== 1 ? 's' : ''} uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo, index) => (
              <TooltipProvider key={index}>
                <div className="relative group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={photo.url}
                    alt={photo.tag}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => openViewer(photo)}
                  />
                  
                  {/* Tag Badge */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge className={`${getTagColor(photo.tag)} text-white`}>
                      {getTagIcon(photo.tag)} {photo.tag}
                    </Badge>
                    {photo.validation && (
                      <PhotoValidationBadge validation={photo.validation} />
                    )}
                  </div>

                  {/* GPS Indicator */}
                  {photo.latitude && photo.longitude && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-white/90">
                            <MapPin className="h-3 w-3" />
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          GPS: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Delete Button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openDeleteDialog(photo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>

                  {/* Upload Date */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                    <p className="text-xs text-white">
                      {format(new Date(photo.uploaded_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proof Photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {selectedPhoto?.tag} photo
              from storage.
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

      {/* Image Viewer Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={`${getTagColor(selectedPhoto.tag)} text-white`}>
                  {getTagIcon(selectedPhoto.tag)} {selectedPhoto.tag}
                </Badge>
                {selectedPhoto.latitude && selectedPhoto.longitude && (
                  <Badge variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                  </Badge>
                )}
              </div>
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.tag}
                className="w-full rounded-lg"
              />
              <p className="text-sm text-muted-foreground text-center">
                Uploaded: {format(new Date(selectedPhoto.uploaded_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

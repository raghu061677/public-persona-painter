import { useState } from "react";
import { Trash2, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteOperationsProof } from "@/lib/operations/uploadProofs";
import { format } from "date-fns";

interface OperationsPhoto {
  id: string;
  campaign_id: string;
  asset_id: string;
  tag: string;
  photo_url: string;
  latitude?: number;
  longitude?: number;
  uploaded_at: string;
  validation_score?: number;
  validation_issues?: string[];
  validation_suggestions?: string[];
}

interface OperationsPhotoGalleryProps {
  photos: OperationsPhoto[];
  onPhotoDeleted: () => void;
  canDelete?: boolean;
}

export function OperationsPhotoGallery({ photos, onPhotoDeleted, canDelete = false }: OperationsPhotoGalleryProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<OperationsPhoto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getTagColor = (tag: string) => {
    if (tag === 'Traffic') return 'bg-blue-500';
    if (tag === 'Newspaper') return 'bg-purple-500';
    if (tag === 'Geo-Tagged') return 'bg-green-500';
    return 'bg-gray-500';
  };

  const getTagIcon = (tag: string) => {
    if (tag === 'Traffic') return '🚗';
    if (tag === 'Newspaper') return '📰';
    if (tag === 'Geo-Tagged') return '📍';
    return '📷';
  };

  const getValidationBadge = (photo: OperationsPhoto) => {
    if (!photo.validation_score) return null;
    
    if (photo.validation_score >= 80) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          {photo.validation_score}%
        </Badge>
      );
    } else if (photo.validation_score >= 50) {
      return (
        <Badge className="bg-yellow-500">
          <AlertCircle className="h-3 w-3 mr-1" />
          {photo.validation_score}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          {photo.validation_score}%
        </Badge>
      );
    }
  };

  const handleDelete = async () => {
    if (!selectedPhoto) return;

    setDeleting(true);
    try {
      await deleteOperationsProof(selectedPhoto.id, selectedPhoto.photo_url);

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

  const openDeleteDialog = (photo: OperationsPhoto) => {
    setSelectedPhoto(photo);
    setDeleteDialogOpen(true);
  };

  const openViewer = (photo: OperationsPhoto) => {
    setSelectedPhoto(photo);
    setViewerOpen(true);
  };

  if (!photos || photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Proof Photos</CardTitle>
          <CardDescription>No photos uploaded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Proof Photos ({photos.length})</CardTitle>
          <CardDescription>
            Click on any photo to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <TooltipProvider key={photo.id}>
                <div className="relative group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <img
                    src={photo.photo_url}
                    alt={photo.tag}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => openViewer(photo)}
                  />
                  
                  {/* Tag Badge */}
                  <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
                    <Badge className={`${getTagColor(photo.tag)} text-white`}>
                      {getTagIcon(photo.tag)} {photo.tag}
                    </Badge>
                    {getValidationBadge(photo)}
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

                  {/* Delete Button (Admin Only) */}
                  {canDelete && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(photo);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Badge className={`${getTagColor(selectedPhoto.tag)} text-white`}>
                  {getTagIcon(selectedPhoto.tag)} {selectedPhoto.tag}
                </Badge>
                <div className="flex gap-2">
                  {getValidationBadge(selectedPhoto)}
                  {selectedPhoto.latitude && selectedPhoto.longitude && (
                    <Badge variant="secondary">
                      <MapPin className="h-3 w-3 mr-1" />
                      {selectedPhoto.latitude.toFixed(6)}, {selectedPhoto.longitude.toFixed(6)}
                    </Badge>
                  )}
                </div>
              </div>
              
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.tag}
                className="w-full rounded-lg"
              />
              
              {selectedPhoto.validation_issues && selectedPhoto.validation_issues.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="font-medium text-sm">Validation Issues:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {selectedPhoto.validation_issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {selectedPhoto.validation_suggestions && selectedPhoto.validation_suggestions.length > 0 && (
                <div className="border rounded-lg p-3 space-y-2">
                  <h4 className="font-medium text-sm">Suggestions:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {selectedPhoto.validation_suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              
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

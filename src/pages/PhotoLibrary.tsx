import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotoItem {
  name: string;
  url: string;
  campaign_id?: string;
  asset_id?: string;
  photo_type?: string;
  uploaded_at?: string;
}

export default function PhotoLibrary() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = photos.filter(
        (photo) =>
          photo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          photo.campaign_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          photo.asset_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredPhotos(filtered);
    } else {
      setFilteredPhotos(photos);
    }
  }, [searchTerm, photos]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      // Fetch all files from campaign-photos bucket
      const { data: files, error } = await supabase.storage
        .from("campaign-photos")
        .list("", {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      // Get public URLs for all photos
      const photoItems: PhotoItem[] = await Promise.all(
        files.map(async (file) => {
          const { data } = supabase.storage
            .from("campaign-photos")
            .getPublicUrl(file.name);

          // Parse filename to extract metadata
          // Expected format: campaignId_assetId_photoType_timestamp.jpg
          const parts = file.name.split("_");
          const photoType = parts.length >= 3 ? parts[2] : undefined;

          return {
            name: file.name,
            url: data.publicUrl,
            campaign_id: parts[0],
            asset_id: parts[1],
            photo_type: photoType,
            uploaded_at: file.created_at,
          };
        })
      );

      setPhotos(photoItems);
      setFilteredPhotos(photoItems);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch photos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPhotoCaption = (photo: PhotoItem) => {
    const type = photo.photo_type?.replace(/([A-Z])/g, " $1").trim();
    return `${photo.asset_id || "Asset"} (${type || "photo"})`;
  };

  const handleDownload = async (photo: PhotoItem) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Photo downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download photo",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Library</h1>
        <p className="text-muted-foreground mt-1">
          A gallery of uploaded proof and asset photos from campaigns and media assets.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by asset or campaign ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? "No photos found matching your search" : "No photos uploaded yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map((photo) => (
            <Card key={photo.name} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div
                className="relative aspect-video cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.url}
                  alt={getPhotoCaption(photo)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3 line-clamp-2">
                  {getPhotoCaption(photo)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(photo.url, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto && getPhotoCaption(selectedPhoto)}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.url}
                alt={getPhotoCaption(selectedPhoto)}
                className="w-full h-auto rounded-lg"
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedPhoto.url, "_blank")}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in New Tab
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {selectedPhoto.campaign_id && (
                  <div>
                    <span className="text-muted-foreground">Campaign ID:</span>
                    <p className="font-medium">{selectedPhoto.campaign_id}</p>
                  </div>
                )}
                {selectedPhoto.asset_id && (
                  <div>
                    <span className="text-muted-foreground">Asset ID:</span>
                    <p className="font-medium">{selectedPhoto.asset_id}</p>
                  </div>
                )}
                {selectedPhoto.photo_type && (
                  <div>
                    <span className="text-muted-foreground">Photo Type:</span>
                    <p className="font-medium capitalize">
                      {selectedPhoto.photo_type.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                  </div>
                )}
                {selectedPhoto.uploaded_at && (
                  <div>
                    <span className="text-muted-foreground">Uploaded:</span>
                    <p className="font-medium">
                      {new Date(selectedPhoto.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

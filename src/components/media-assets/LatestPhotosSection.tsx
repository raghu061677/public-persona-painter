import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PhotoLightbox } from "./PhotoLightbox";

interface LatestPhotosSectionProps {
  assetId: string;
  asset?: any; // Asset data to pass to lightbox
}

interface MediaPhoto {
  id: string;
  photo_url: string;
  category: string;
  uploaded_at: string;
  campaign_id: string | null;
}

export function LatestPhotosSection({ assetId, asset }: LatestPhotosSectionProps) {
  const [photos, setPhotos] = useState<MediaPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadLatestPhotos();
  }, [assetId]);

  const loadLatestPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_photos')
        .select('id, photo_url, category, uploaded_at, campaign_id')
        .eq('asset_id', assetId)
        .order('uploaded_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Mounting: "bg-blue-500",
      Display: "bg-green-500",
      Proof: "bg-purple-500",
      Monitoring: "bg-orange-500",
      General: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Latest Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading photos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Latest Photos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/gallery?asset=${assetId}`)}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No photos uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative group cursor-pointer"
                  onClick={() => handlePhotoClick(index)}
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <img
                      src={photo.photo_url}
                      alt={photo.category}
                      className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge className={getCategoryColor(photo.category)}>
                      {photo.category}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(photo.uploaded_at), 'PP')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PhotoLightbox
        photos={photos}
        initialIndex={selectedPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        assetData={asset ? {
          location: asset.location,
          direction: asset.direction,
          dimension: asset.dimension,
          total_sqft: asset.total_sqft,
          illumination_type: asset.illumination_type,
          city: asset.city,
          area: asset.area,
        } : undefined}
      />
    </>
  );
}

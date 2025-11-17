import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { UnifiedPhotoGallery } from "@/components/common/UnifiedPhotoGallery";

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
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
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

  // Format asset info for UnifiedPhotoGallery
  const assetInfo = asset ? {
    city: asset.city,
    area: asset.area,
    location: asset.location,
    dimensions: asset.dimensions,
    direction: asset.direction,
    illumination: asset.illumination,
    total_sqft: asset.total_sqft
  } : null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              All Photos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/admin/gallery?asset=${assetId}`)}
            >
              View in Gallery
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          {/* Asset Information */}
          {asset && (
            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">{asset.city} - {asset.area}</p>
                  <p className="text-xs text-muted-foreground">{asset.location}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Size/Dimension:</span>
                  <p className="font-medium">{asset.dimensions}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Direction:</span>
                  <p className="font-medium">{asset.direction || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lighting Type:</span>
                  <p className="font-medium">{asset.illumination || 'Non-lit'}</p>
                </div>
              </div>
              
              {asset.total_sqft && (
                <div>
                  <span className="text-muted-foreground">Total Area:</span>
                  <p className="font-medium">{asset.total_sqft.toFixed(2)} sq.ft</p>
                </div>
              )}
            </div>
          )}
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
          illumination: asset.illumination,
          city: asset.city,
          area: asset.area,
        } : undefined}
      />
    </>
  );
}

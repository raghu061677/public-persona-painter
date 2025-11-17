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
  latitude?: number;
  longitude?: number;
  validation_score?: number;
  validation_issues?: string[];
  validation_suggestions?: string[];
}

export function LatestPhotosSection({ assetId, asset }: LatestPhotosSectionProps) {
  const [photos, setPhotos] = useState<MediaPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadLatestPhotos();
  }, [assetId, asset]);

  const loadLatestPhotos = async () => {
    setLoading(true);
    try {
      // Load photos from the asset's images.photos field
      if (asset?.images?.photos && Array.isArray(asset.images.photos)) {
        const transformedPhotos = asset.images.photos.map((photo: any, index: number) => ({
          id: `${assetId}-${index}`,
          photo_url: photo.url,
          category: photo.tag || 'Other Photo',
          uploaded_at: photo.uploaded_at || new Date().toISOString(),
          campaign_id: null,
          latitude: photo.latitude,
          longitude: photo.longitude,
          validation_score: photo.validation?.score,
          validation_issues: photo.validation?.issues,
          validation_suggestions: photo.validation?.suggestions,
        }));
        setPhotos(transformedPhotos);
      } else {
        setPhotos([]);
      }
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
          <UnifiedPhotoGallery
            photos={photos}
            onPhotoDeleted={loadLatestPhotos}
            canDelete={false}
            bucket="media-assets"
            title=""
            assetData={assetInfo ? {
              asset_id: assetId,
              ...assetInfo
            } : undefined}
          />
        </CardContent>
      </Card>
    </>
  );
}

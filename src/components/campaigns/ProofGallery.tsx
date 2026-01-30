import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Image as ImageIcon, CheckCircle2, Download, Loader2 } from "lucide-react";
import { ProofApprovalDialog } from "./ProofApprovalDialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { resolveAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";

interface ProofGalleryProps {
  assets: any[];
  onUpdate?: () => void;
}

interface MediaPhoto {
  id: string;
  asset_id: string;
  campaign_id: string;
  photo_url: string;
  category: string;
  uploaded_at: string;
  metadata: any;
  approval_status: string;
}

export function ProofGallery({ assets, onUpdate }: ProofGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [approvalAsset, setApprovalAsset] = useState<any>(null);
  const [mediaPhotos, setMediaPhotos] = useState<MediaPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Get campaign ID from assets
  const campaignId = assets[0]?.campaign_id;

  useEffect(() => {
    if (campaignId) {
      fetchMediaPhotos();
    } else {
      setLoading(false);
    }
  }, [campaignId]);

  const fetchMediaPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setMediaPhotos(data || []);
    } catch (error) {
      console.error('Error fetching media photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (asset: any, photoUrl: string, photoType: string) => {
    try {
      const { downloadImageWithWatermark } = await import('@/lib/downloadWithWatermark');
      
      await downloadImageWithWatermark({
        assetData: {
          city: asset.city,
          area: asset.area,
          location: asset.location,
          direction: asset.direction,
          dimension: asset.dimensions,
          total_sqft: asset.total_sqft,
          illumination_type: asset.illumination_type,
        },
        imageUrl: photoUrl,
        category: photoType,
        assetId: asset.asset_id,
        qrCodeUrl: asset.qr_code_url,
      });
    } catch (error) {
      console.error('Error downloading with watermark:', error);
    }
  };

  // Group photos by asset
  const getPhotosForAsset = (assetId: string) => {
    return mediaPhotos.filter(p => p.asset_id === assetId);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground animate-spin" />
        <p className="text-muted-foreground">Loading proof photos...</p>
      </div>
    );
  }

  // Check if any asset has photos
  const assetsWithPhotos = assets.filter(asset => {
    const photos = getPhotosForAsset(asset.asset_id);
    return photos.length > 0;
  });

  if (assetsWithPhotos.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No proof photos uploaded yet</p>
        <p className="text-xs text-muted-foreground mt-2">
          Total photos in database: {mediaPhotos.length}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm font-medium">
            {assetsWithPhotos.length} of {assets.length} assets have photos
          </p>
          <p className="text-xs text-muted-foreground">
            Total: {mediaPhotos.length} photos uploaded
          </p>
        </div>
      </div>

      {assetsWithPhotos.map((asset) => {
        const assetPhotos = getPhotosForAsset(asset.asset_id);
        const uploadedCount = assetPhotos.length;

        return (
          <Card key={asset.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{resolveAssetDisplayCode(asset)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {asset.location}, {asset.area}, {asset.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={uploadedCount >= 4 ? "default" : "secondary"} className="gap-1">
                    {uploadedCount >= 4 ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {uploadedCount} Photos
                  </Badge>
                  {asset.status === 'PhotoUploaded' && uploadedCount >= 4 && onUpdate && (
                    <Button
                      size="sm"
                      onClick={() => setApprovalAsset(asset)}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Review & Approve
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {assetPhotos.map((photo, index) => {
                  const photoTag = photo.metadata?.photo_tag || `Photo ${index + 1}`;
                  
                  return (
                    <div key={photo.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{photoTag}</p>
                        <Badge variant="outline" className="text-xs">
                          {photo.approval_status}
                        </Badge>
                      </div>
                      <div className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors group">
                        <img
                          src={photo.photo_url}
                          alt={photoTag}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedPhoto(photo.photo_url)}
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(asset, photo.photo_url, photoTag);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(photo.uploaded_at), "MMM dd, HH:mm")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {approvalAsset && (
        <ProofApprovalDialog
          asset={approvalAsset}
          open={!!approvalAsset}
          onOpenChange={(open) => !open && setApprovalAsset(null)}
          onUpdate={() => {
            onUpdate?.();
            fetchMediaPhotos();
            setApprovalAsset(null);
          }}
        />
      )}
    </div>
  );
}

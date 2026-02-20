import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Image as ImageIcon, CheckCircle2, Download, Loader2 } from "lucide-react";
import { ProofApprovalDialog } from "./ProofApprovalDialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { getAssetDisplayCode } from "@/lib/assets/getAssetDisplayCode";

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

// Private buckets that need signed URLs
const PRIVATE_BUCKETS = ['operations-photos', 'campaign-proofs', 'campaign-photos'];

/**
 * Convert a storage URL to a signed URL if it belongs to a private bucket.
 * Public bucket URLs and external URLs are returned as-is.
 */
async function getSignedUrlIfNeeded(url: string): Promise<string> {
  if (!url) return url;
  
  // Check if this URL is from one of our private buckets
  const matchingBucket = PRIVATE_BUCKETS.find(bucket => url.includes(`/${bucket}/`));
  if (!matchingBucket) return url; // Not a private bucket URL, return as-is

  try {
    // Extract the file path after the bucket name
    // URL format: .../storage/v1/object/public/{bucket}/{path}
    const bucketPattern = new RegExp(`/storage/v1/object/(?:public|sign)/${matchingBucket}/(.+)`);
    const match = url.match(bucketPattern);
    if (!match?.[1]) return url;

    const filePath = decodeURIComponent(match[1].split('?')[0]); // Remove any existing query params
    const { data, error } = await supabase.storage
      .from(matchingBucket)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error || !data?.signedUrl) {
      console.warn(`Failed to create signed URL for ${matchingBucket}/${filePath}:`, error);
      return url; // Fallback to original URL
    }
    return data.signedUrl;
  } catch (e) {
    console.warn('Error creating signed URL:', e);
    return url;
  }
}

export function ProofGallery({ assets, onUpdate }: ProofGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [approvalAsset, setApprovalAsset] = useState<any>(null);
  const [mediaPhotos, setMediaPhotos] = useState<MediaPhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [assetCodeMap, setAssetCodeMap] = useState<Map<string, string>>(new Map());
  const [assetQrMap, setAssetQrMap] = useState<Map<string, string>>(new Map());

  // Get campaign ID from assets
  const campaignId = assets[0]?.campaign_id;

  useEffect(() => {
    if (campaignId) {
      fetchMediaPhotos();
      fetchAssetCodes();
    } else {
      setLoading(false);
    }
  }, [campaignId]);

  const fetchAssetCodes = async () => {
    const assetIds = [...new Set(assets.map(a => a.asset_id).filter(Boolean))];
    if (assetIds.length === 0) return;

    const { data: mediaAssets } = await supabase
      .from('media_assets')
      .select('id, media_asset_code, qr_code_url')
      .in('id', assetIds);

    const codeMap = new Map<string, string>();
    const qrMap = new Map<string, string>();
    (mediaAssets || []).forEach(ma => {
      if (ma.media_asset_code) {
        codeMap.set(ma.id, ma.media_asset_code);
      }
      if (ma.qr_code_url) {
        qrMap.set(ma.id, ma.qr_code_url);
      }
    });
    setAssetCodeMap(codeMap);
    setAssetQrMap(qrMap);
  };

  const fetchMediaPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      const photos = data || [];
      setMediaPhotos(photos);

      // Generate signed URLs for all photos in parallel
      const urlMap = new Map<string, string>();
      const urlPromises = photos.map(async (photo) => {
        const signedUrl = await getSignedUrlIfNeeded(photo.photo_url);
        urlMap.set(photo.id, signedUrl);
      });
      await Promise.all(urlPromises);
      setSignedUrls(urlMap);
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

  // Helper to get display code for an asset
  const getDisplayCode = (asset: any): string => {
    // First try the enriched media_asset_code from parent
    if (asset.media_asset_code) return asset.media_asset_code;
    // Then try our fetched map
    const fromMap = assetCodeMap.get(asset.asset_id);
    if (fromMap) return fromMap;
    // Finally use the utility
    return getAssetDisplayCode({ media_asset_code: null }, asset.asset_id);
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
                  <h3 className="font-semibold text-lg">{getDisplayCode(asset)}</h3>
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

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Single Large QR Code */}
                {assetQrMap.get(asset.asset_id) && (
                  <div className="flex flex-col items-center justify-center gap-2 p-4 border rounded-xl bg-muted/30 min-w-[160px]">
                    <img
                      src={assetQrMap.get(asset.asset_id)}
                      alt="Asset QR Code"
                      className="w-36 h-36 object-contain bg-white p-2 rounded-lg border"
                    />
                    <p className="text-xs text-muted-foreground font-medium text-center">Scan to Verify Location</p>
                  </div>
                )}

                {/* Photo Grid */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assetPhotos.map((photo, index) => {
                    const photoTag = photo.metadata?.photo_tag || `Photo ${index + 1}`;
                    const displayUrl = signedUrls.get(photo.id) || photo.photo_url;
                    
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
                            src={displayUrl}
                            alt={photoTag}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setSelectedPhoto(displayUrl)}
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(asset, displayUrl, photoTag);
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

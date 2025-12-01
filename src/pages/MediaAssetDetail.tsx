import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AssetDetails } from "@/components/media-assets/asset-details";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/navigation/PageHeader";
import { MediaAssetQrSection } from "@/components/media-assets/MediaAssetQrSection";
import { ROUTES } from "@/config/routes";

export default function MediaAssetDetail() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAsset();
  }, [code]);

  const fetchAsset = async () => {
    setLoading(true);
    
    // Try to fetch by media_asset_code first
    let { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('media_asset_code', code)
      .maybeSingle();

    // If not found by media_asset_code, try by id (for backwards compatibility with old URLs)
    if (!data && !error) {
      const result = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', code)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error || !data) {
      toast({
        title: "Error",
        description: "Failed to fetch asset details",
        variant: "destructive",
      });
      navigate('/admin/media-assets');
    } else {
      // If accessed via UUID but has media_asset_code, redirect to MNS code URL
      if (data.media_asset_code && code !== data.media_asset_code) {
        navigate(`/admin/media-assets/${data.media_asset_code}`, { replace: true });
        return;
      }
      
      // Fetch photos from media_photos table
      const { data: photosData } = await supabase
        .from('media_photos')
        .select('*')
        .eq('asset_id', data.id)
        .order('uploaded_at', { ascending: false });

      // Transform photos data to match expected format
      const photos = photosData?.map(photo => {
        const metadata = photo.metadata as Record<string, any> | null;
        return {
          url: photo.photo_url,
          tag: photo.category,
          uploaded_at: photo.uploaded_at,
          latitude: metadata?.latitude,
          longitude: metadata?.longitude,
          validation: {
            score: metadata?.validation_score,
            issues: metadata?.validation_issues,
            suggestions: metadata?.validation_suggestions,
          },
        };
      }) || [];

      // Add photos to asset data
      setAsset({
        ...data,
        photos,
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: "Dashboard", path: ROUTES.DASHBOARD },
            { label: "Media Assets", path: ROUTES.MEDIA_ASSETS },
            { label: "Loading..." },
          ]}
          showBackButton
          backPath={ROUTES.MEDIA_ASSETS}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading asset details...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <PageHeader
          title="Not Found"
          breadcrumbs={[
            { label: "Dashboard", path: ROUTES.DASHBOARD },
            { label: "Media Assets", path: ROUTES.MEDIA_ASSETS },
            { label: "Not Found" },
          ]}
          showBackButton
          backPath={ROUTES.MEDIA_ASSETS}
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Asset not found</p>
        </div>
      </div>
    );
  }

  const handleQRGenerated = (qrUrl: string) => {
    setAsset((prev: any) => prev ? { ...prev, qr_code_url: qrUrl } : null);
  };

  const displayCode = asset.media_asset_code || asset.id;

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <PageHeader
        title={displayCode}
        description={`${asset.media_type} at ${asset.location}, ${asset.area}`}
        breadcrumbs={[
          { label: "Dashboard", path: ROUTES.DASHBOARD },
          { label: "Media Assets", path: ROUTES.MEDIA_ASSETS },
          { label: displayCode },
        ]}
        showBackButton
        backPath={ROUTES.MEDIA_ASSETS}
      />
      
      <AssetDetails asset={asset} isAdmin={isAdmin} onQRGenerated={handleQRGenerated} />
      
      <MediaAssetQrSection
        assetId={asset.id}
        qrCodeUrl={asset.qr_code_url}
        locationUrl={
          asset.google_street_view_url ||
          asset.location_url ||
          (asset.latitude && asset.longitude
            ? `https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`
            : undefined)
        }
        onQrGenerated={handleQRGenerated}
      />
    </div>
  );
}

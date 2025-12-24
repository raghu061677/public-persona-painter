import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhotoUploadSection } from "@/components/operations/PhotoUploadSection";
import { UnifiedPhotoGallery } from "@/components/common/UnifiedPhotoGallery";
import { NotificationSettings } from "@/components/operations/NotificationSettings";
import { Badge } from "@/components/ui/badge";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useCompany } from "@/contexts/CompanyContext";

interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  status: string;
}

export default function CampaignAssetProofs() {
  const { campaignId, assetId } = useParams<{ campaignId: string; assetId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumb();
  const { company } = useCompany();
  const [asset, setAsset] = useState<CampaignAsset | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId && assetId) {
      fetchAssetDetails();
      checkAdminRole();
    }
  }, [campaignId, assetId]);

  // Set custom breadcrumbs when asset is loaded
  useEffect(() => {
    if (asset) {
      setBreadcrumbs([
        { title: 'Home', href: '/admin/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Operations', href: '/admin/operations' },
        { title: campaignId || 'Campaign', href: `/admin/operations/${campaignId}` },
        { title: 'Assets', href: `/admin/operations/${campaignId}` },
        { title: asset.asset_id || asset.location || 'Asset' }
      ]);
    }
    
    // Clear breadcrumbs when unmounting
    return () => setBreadcrumbs(null);
  }, [asset, campaignId, setBreadcrumbs]);

  useEffect(() => {
    if (campaignId && assetId) {
      fetchPhotos();
    }
  }, [campaignId, assetId]);

  // Load asset QR code URL
  useEffect(() => {
    const loadAssetQrCode = async () => {
      if (!assetId) return;
      
      // First get the media asset_id from campaign_assets
      const { data: campaignAsset } = await supabase
        .from('campaign_assets')
        .select('asset_id')
        .eq('id', assetId)
        .single();
      
      if (!campaignAsset?.asset_id) return;
      
      // Then get the QR code URL from media_assets
      const { data: mediaAsset } = await supabase
        .from('media_assets')
        .select('qr_code_url')
        .eq('id', campaignAsset.asset_id)
        .single();
      
      if (mediaAsset?.qr_code_url) {
        setQrCodeUrl(mediaAsset.qr_code_url);
      }
    };
    loadAssetQrCode();
  }, [assetId]);

  const checkAdminRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

  const fetchAssetDetails = async () => {
    if (!campaignId || !assetId) return;

    try {
      // assetId from URL params is the campaign_assets.id (UUID), not asset_id
      const { data, error } = await supabase
        .from('campaign_assets')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('id', assetId)
        .single();

      if (error) throw error;
      setAsset(data);
    } catch (error: any) {
      console.error('Error fetching asset:', error?.message || error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
    }
  };

  const fetchPhotos = async () => {
    if (!campaignId || !assetId) return;

    try {
      setLoading(true);
      // Photos are saved with the campaign_assets.id (assetId from URL), not the media asset_id
      const { data, error } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('asset_id', assetId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error('Error fetching photos:', error?.message || error);
      toast({
        title: "Error",
        description: "Failed to load photos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    fetchPhotos();
  };

  const handlePhotoDeleted = () => {
    fetchPhotos();
  };

  if (!campaignId || !assetId) {
    return <div>Invalid campaign or asset</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      {/* Company Branding Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {company?.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-14 w-auto max-w-[180px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="h-14 flex items-center">
                <span className="text-2xl font-bold text-primary">{company?.name || 'Company'}</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-foreground">{company?.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {company?.city && company?.state && (
                  <span>{company.city}, {company.state}</span>
                )}
                {company?.gstin && (
                  <span>GSTIN: {company.gstin}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/campaigns/${campaignId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Proof of Installation</h2>
            <p className="text-muted-foreground">
              {asset?.location} - {asset?.city}
            </p>
          </div>
        </div>
      </div>

      {/* Asset Info Card with QR Code */}
      {asset && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Asset Details */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Asset ID</p>
                  <p className="font-medium">{asset.asset_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{asset.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Media Type</p>
                  <p className="font-medium">{asset.media_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{asset.status}</Badge>
                </div>
              </div>

              {/* QR Code - Larger and more prominent */}
              {qrCodeUrl && (
                <div className="flex flex-col items-center gap-3 p-5 border rounded-lg bg-muted/30">
                  <img 
                    src={qrCodeUrl} 
                    alt="Asset QR Code"
                    className="w-44 h-44 object-contain bg-white p-3 rounded-md shadow-md"
                  />
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <QrCode className="h-5 w-5" />
                    <span>Scan to verify location</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Section */}
      <PhotoUploadSection
        campaignId={campaignId}
        assetId={assetId}
        onUploadComplete={handleUploadComplete}
      />

      {/* Photo Gallery */}
      {!loading && (
        <UnifiedPhotoGallery
          photos={photos}
          onPhotoDeleted={handlePhotoDeleted}
          canDelete={isAdmin}
          bucket="operations-photos"
          title="Campaign Proof Photos"
          description="Installation verification photos"
        />
      )}

      {/* Notification Settings */}
      <NotificationSettings campaignId={campaignId} />

      {/* Platform Attribution Footer */}
      <footer className="pt-8 pb-4 border-t mt-8">
        <p className="text-center text-sm text-muted-foreground">
          Powered by Go-Ads 360 — OOH Media Platform
        </p>
      </footer>
    </div>
  );
}

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
import { BackToCampaignButton } from "@/components/campaigns/BackToCampaignButton";
import { CampaignBreadcrumbs } from "@/components/campaigns/CampaignBreadcrumbs";
import { CampaignContextHeader } from "@/components/campaigns/CampaignContextHeader";
import { formatAssetDisplayCode } from "@/lib/assets/formatAssetDisplayCode";

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
  const [mediaAssetCode, setMediaAssetCode] = useState<string | null>(null);
  const [assetCodePrefix, setAssetCodePrefix] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId && assetId) {
      fetchAssetDetails();
      checkAdminRole();
    }
  }, [campaignId, assetId]);

  // Set custom breadcrumbs when asset is loaded
  useEffect(() => {
    if (asset) {
      const displayAssetCode = formatAssetDisplayCode({ 
        mediaAssetCode: mediaAssetCode || asset.asset_id, 
        fallbackId: asset.asset_id, 
        companyPrefix: assetCodePrefix, 
        companyName: company?.name 
      });
      
      setBreadcrumbs([
        { title: 'Home', href: '/admin/dashboard' },
        { title: 'Admin', href: '/admin' },
        { title: 'Operations', href: '/admin/operations' },
        { title: campaignId || 'Campaign', href: `/admin/operations/${campaignId}` },
        { title: 'Assets', href: `/admin/operations/${campaignId}` },
        { title: displayAssetCode || asset.location || 'Asset' }
      ]);
    }
    
    // Clear breadcrumbs when unmounting
    return () => setBreadcrumbs(null);
  }, [asset, campaignId, setBreadcrumbs, mediaAssetCode, assetCodePrefix, company?.name]);

  useEffect(() => {
    if (campaignId && asset) {
      fetchPhotos();
    }
  }, [campaignId, asset]);

  // Load asset QR code URL, media asset code, and company prefix
  useEffect(() => {
    const loadAssetInfo = async () => {
      if (!assetId || !asset) return;
      
      // Use the asset_id from the already fetched campaign_asset
      const { data: mediaAsset } = await supabase
        .from('media_assets')
        .select('qr_code_url, media_asset_code, company_id')
        .eq('id', asset.asset_id)
        .maybeSingle();
      
      if (mediaAsset?.qr_code_url) {
        setQrCodeUrl(mediaAsset.qr_code_url);
      }
      if (mediaAsset?.media_asset_code) {
        setMediaAssetCode(mediaAsset.media_asset_code);
      }
      
      // Fetch company code settings for display prefix
      if (mediaAsset?.company_id) {
        const { data: codeSettings } = await supabase
          .from('company_code_settings')
          .select('asset_code_prefix, use_custom_asset_codes')
          .eq('company_id', mediaAsset.company_id)
          .maybeSingle();
        
        if (codeSettings?.use_custom_asset_codes && codeSettings?.asset_code_prefix) {
          setAssetCodePrefix(codeSettings.asset_code_prefix);
        }
      }
    };
    loadAssetInfo();
  }, [asset]);

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
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assetId);
      
      let data = null;
      
      // Strategy 1: If assetId is UUID, try direct lookup on campaign_assets.id
      if (isUUID) {
        const { data: result } = await supabase
          .from('campaign_assets')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('id', assetId)
          .maybeSingle();
        data = result;
      }
      
      // Strategy 2: Direct match on campaign_assets.asset_id (legacy codes like HYD-BQS-0019)
      if (!data) {
        const { data: result } = await supabase
          .from('campaign_assets')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('asset_id', assetId)
          .maybeSingle();
        data = result;
      }
      
      // Strategy 3: URL might be using a different format than stored asset_id
      // Try via media_assets mapping - find by media_asset_code or suffix match
      if (!data) {
        // First try exact match on media_asset_code
        let mediaAssetId: string | null = null;
        
        const { data: exactMatch } = await supabase
          .from('media_assets')
          .select('id')
          .eq('media_asset_code', assetId)
          .maybeSingle();
        
        if (exactMatch) {
          mediaAssetId = exactMatch.id;
        } else {
          // Try suffix match (URL: HYD-BQS-0019, DB: MNS-HYD-BQS-0019)
          const { data: suffixMatch } = await supabase
            .from('media_assets')
            .select('id')
            .ilike('media_asset_code', `%${assetId}`)
            .limit(1);
          
          if (suffixMatch && suffixMatch.length > 0) {
            mediaAssetId = suffixMatch[0].id;
          }
        }
        
        // If we found a media_assets.id, look up campaign_asset by that
        if (mediaAssetId) {
          const { data: result } = await supabase
            .from('campaign_assets')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('asset_id', mediaAssetId)
            .maybeSingle();
          data = result;
        }
      }

      if (!data) {
        throw new Error('Asset not found in campaign');
      }
      setAsset(data);
    } catch (error: any) {
      console.error('Error fetching asset:', error?.message || error);
      toast({
        title: "Error",
        description: "Failed to load asset details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!campaignId || !asset) return;

    try {
      setLoading(true);
      // Photos are saved with the media asset code (asset.asset_id like HYD-BQS-0001),
      // NOT the campaign_assets.id UUID
      const { data, error } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('asset_id', asset.asset_id)
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
    <div className="flex-1 flex flex-col">
      {/* Sticky Campaign Context Header */}
      <CampaignContextHeader />
      
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        {/* Breadcrumbs - no additionalItems since CampaignBreadcrumbs already adds "Asset Proof" for asset pages */}
        <CampaignBreadcrumbs />
        
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
        <div className="flex flex-col gap-4">
          <BackToCampaignButton variant="ghost" className="self-start" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Proof of Installation</h2>
            <p className="text-muted-foreground">
              {asset?.location} - {asset?.city}
            </p>
          </div>
        </div>

      {/* Asset Info Card with Single Large QR Code */}
      {asset && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Single Large QR Code - Asset Verification */}
              {qrCodeUrl && (
                <div className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-primary/30 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 min-w-[280px] shadow-lg">
                  <img 
                    src={qrCodeUrl} 
                    alt="Asset QR Code"
                    className="w-56 h-56 object-contain bg-white p-5 rounded-xl shadow-xl border-2 border-primary/20"
                  />
                  <div className="flex items-center gap-2 text-base font-bold text-primary">
                    <QrCode className="h-6 w-6" />
                    <span>Scan to Verify Asset</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-center max-w-[220px]">
                    Use this QR code to verify asset location and installation details
                  </p>
                </div>
              )}
              
              {/* Asset Details - Right Side */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
                <div>
                  <p className="text-sm text-muted-foreground">Asset ID</p>
                  <p className="font-medium font-mono text-sm">
                    {formatAssetDisplayCode({ 
                      mediaAssetCode: mediaAssetCode || asset.asset_id, 
                      fallbackId: asset.asset_id, 
                      companyPrefix: assetCodePrefix, 
                      companyName: company?.name 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{asset.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City / Area</p>
                  <p className="font-medium">{asset.city} - {asset.area}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Media Type</p>
                  <p className="font-medium">{asset.media_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={
                    asset.status === 'Verified' ? 'bg-green-600 text-white' :
                    asset.status === 'PhotoUploaded' ? 'bg-emerald-500 text-white' :
                    asset.status === 'Mounted' || asset.status === 'Installed' ? 'bg-amber-500 text-white' :
                    asset.status === 'Assigned' ? 'bg-blue-500 text-white' :
                    'bg-slate-500 text-white'
                  }>
                    {asset.status === 'PhotoUploaded' ? 'Proof Uploaded' : asset.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Section - Use asset.id (campaign_assets.id) not the URL assetId */}
      {asset && (
        <PhotoUploadSection
          campaignId={campaignId}
          assetId={asset.id}
          onUploadComplete={handleUploadComplete}
        />
      )}

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
    </div>
  );
}

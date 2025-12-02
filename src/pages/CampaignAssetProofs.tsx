import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhotoUploadSection } from "@/components/operations/PhotoUploadSection";
import { UnifiedPhotoGallery } from "@/components/common/UnifiedPhotoGallery";
import { NotificationSettings } from "@/components/operations/NotificationSettings";
import { Badge } from "@/components/ui/badge";

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
  const [asset, setAsset] = useState<CampaignAsset | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (campaignId && assetId) {
      fetchAssetDetails();
      fetchPhotos();
      checkAdminRole();
    }
  }, [campaignId, assetId]);

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
      const { data, error } = await supabase
        .from('campaign_assets')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('asset_id', assetId)
        .single();

      if (error) throw error;
      setAsset(data);
    } catch (error: any) {
      console.error('Error fetching asset:', error);
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
      // Query for photos with campaign_id and asset_id
      // Note: photo_type is stored in metadata JSONB, not as a column
      const { data, error } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('asset_id', assetId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error('Error fetching photos:', error);
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
            <h2 className="text-3xl font-bold tracking-tight">Upload Proof Photos</h2>
            <p className="text-muted-foreground">
              {asset?.location} - {asset?.city}
            </p>
          </div>
        </div>
      </div>

      {/* Asset Info Card */}
      {asset && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
    </div>
  );
}

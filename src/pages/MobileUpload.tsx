import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { validatePhotoFile, hasAllPhotos } from "@/utils/campaigns";

export default function MobileUpload() {
  const { campaignId, assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchData();
  }, [campaignId, assetId]);

  const fetchData = async () => {
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    setCampaign(campaignData);

    const { data: assetData } = await supabase
      .from('campaign_assets')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('id', assetId)
      .single();
    
    if (assetData) {
      setAsset(assetData);
      setPhotos(assetData.photos || {});
    }
    
    setLoading(false);
  };

  const handleFileUpload = async (photoType: string, file: File) => {
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(25);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${photoType}-${Date.now()}.${fileExt}`;
      const filePath = `campaigns/${campaignId}/assets/${assetId}/${fileName}`;

      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('campaign-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(75);

      const { data: { publicUrl } } = supabase.storage
        .from('campaign-photos')
        .getPublicUrl(filePath);

      const updatedPhotos = {
        ...photos,
        [photoType]: {
          url: publicUrl,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
        }
      };

      setPhotos(updatedPhotos);

      const allPhotosUploaded = hasAllPhotos(updatedPhotos);

      // Update database with new status
      let newStatus = asset.status;
      if (allPhotosUploaded && asset.status !== 'Verified') {
        newStatus = 'PhotoUploaded';
      } else if (asset.status === 'Pending' || asset.status === 'Assigned') {
        newStatus = 'Mounted';
      }

      const { error: updateError } = await supabase
        .from('campaign_assets')
        .update({ 
          photos: updatedPhotos,
          status: newStatus,
          completed_at: allPhotosUploaded ? new Date().toISOString() : null,
        })
        .eq('id', assetId);

      if (updateError) throw updateError;

      setUploadProgress(100);

      toast({
        title: "Success",
        description: allPhotosUploaded 
          ? "All photos uploaded! Asset marked as complete."
          : "Photo uploaded successfully",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  if (loading || !asset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  const photoTypes = [
    { key: 'newspaperPhoto', label: 'Newspaper Photo', description: 'Photo with today\'s newspaper' },
    { key: 'geoTaggedPhoto', label: 'Geo-Tagged Photo', description: 'Photo with GPS location' },
    { key: 'trafficPhoto1', label: 'Traffic View 1', description: 'First traffic angle' },
    { key: 'trafficPhoto2', label: 'Traffic View 2', description: 'Second traffic angle' },
  ];

  const completedPhotos = photoTypes.filter(pt => photos[pt.key]?.url).length;
  const progress = (completedPhotos / 4) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/admin/campaigns/${campaignId}`)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaign
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Campaign</p>
                <p className="font-medium">{campaign?.campaign_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Asset</p>
                <p className="font-medium">{asset.asset_id} - {asset.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progress} className="flex-1" />
                  <span className="text-sm font-medium">{completedPhotos}/4</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {photoTypes.map((photoType) => (
            <Card key={photoType.key}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-base font-semibold">{photoType.label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{photoType.description}</p>
                    
                    {photos[photoType.key]?.url ? (
                      <div className="mt-3 flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Uploaded</span>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(photoType.key, file);
                          }}
                          disabled={uploading}
                          className="cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                  
                  {photos[photoType.key]?.url && (
                    <img
                      src={photos[photoType.key].url}
                      alt={photoType.label}
                      className="w-20 h-20 object-cover rounded border"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {uploading && (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            </CardContent>
          </Card>
        )}

        {completedPhotos === 4 && (
          <Card className="mt-6 border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
                <CheckCircle className="h-6 w-6" />
                <div>
                  <p className="font-semibold">All Photos Uploaded!</p>
                  <p className="text-sm">This asset is now ready for verification.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, MapPin, Calendar, QrCode } from 'lucide-react';
import { formatDate } from '@/utils/plans';
import { getCampaignStatusColor } from '@/utils/campaigns';
import { CampaignTimelineView } from '@/components/campaigns/CampaignTimelineView';

export default function PublicCampaignTracking() {
  const { token } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchCampaignData();
    }
  }, [token]);

  const fetchCampaignData = async () => {
    try {
      // Fetch campaign by public token
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('public_tracking_token', token)
        .eq('public_share_enabled', true)
        .single();

      if (campaignError) {
        if (campaignError.code === 'PGRST116') {
          setError('Campaign not found or sharing is disabled');
        } else {
          setError('Failed to load campaign data');
        }
        setLoading(false);
        return;
      }

      setCampaign(campaignData);

      // Fetch campaign assets
      const { data: assetsData } = await supabase
        .from('campaign_assets')
        .select(`
          *,
          media_assets (*)
        `)
        .eq('campaign_id', campaignData.id);

      setAssets(assetsData || []);

      // Fetch operations
      const { data: operationsData } = await supabase
        .from('operations')
        .select(`
          *,
          mounters (name)
        `)
        .eq('campaign_id', campaignData.id);

      setOperations(operationsData || []);

      // Fetch operation photos
      if (operationsData && operationsData.length > 0) {
        const operationIds = operationsData.map((op) => op.id);
        const { data: photosData } = await supabase
          .from('operation_photos')
          .select('*')
          .in('operation_id', operationIds);

        setPhotos(photosData || []);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching campaign:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || 'Campaign not found'}</p>
            <p className="text-sm text-muted-foreground">
              This campaign may not exist or public tracking may be disabled. Please contact the
              campaign administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const installedCount = operations.filter((op) => op.status === 'Completed').length;
  const totalAssets = assets.length;
  const progress = totalAssets > 0 ? (installedCount / totalAssets) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <Card className="mb-6 border-2">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{campaign.campaign_name}</h1>
                <p className="text-lg text-muted-foreground mb-3">{campaign.client_name}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge className={getCampaignStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}
                    </span>
                  </div>
                </div>
              </div>
              {campaign.public_proof_ppt_url && (
                <Button
                  variant="default"
                  onClick={() => window.open(campaign.public_proof_ppt_url, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Proof Report
                </Button>
              )}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Installation Progress</span>
                <span className="text-sm text-muted-foreground">
                  {installedCount} / {totalAssets} assets installed
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="mb-6">
          <CampaignTimelineView campaignId={campaign.id} isPublicView={true} />
        </div>

        {/* Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assets.map((asset) => {
            const operation = operations.find((op) => op.asset_id === asset.asset_id);
            const assetPhotos = photos.filter((p) => p.operation_id === operation?.id);

            return (
              <Card key={asset.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{asset.media_assets?.id || 'N/A'}</span>
                    {operation && (
                      <Badge
                        className={
                          operation.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'
                        }
                      >
                        {operation.status}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{asset.media_assets?.location}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.media_assets?.city}, {asset.media_assets?.area}
                        </p>
                      </div>
                    </div>

                    {/* Dimensions */}
                    {asset.media_assets?.dimension && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Dimensions:</span>{' '}
                        {asset.media_assets.dimension}
                      </p>
                    )}

                    {/* Facing */}
                    {asset.media_assets?.direction && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Facing:</span>{' '}
                        {asset.media_assets.direction}
                      </p>
                    )}

                    {/* QR Code */}
                    {asset.media_assets?.qr_code_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(asset.media_assets.qr_code_url, '_blank')}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        View QR Code
                      </Button>
                    )}

                    {/* Installation Details */}
                    {operation && operation.status === 'Completed' && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium text-green-600 mb-2">
                          ✓ Installation Completed
                        </p>
                        {operation.mounters && (
                          <p className="text-xs text-muted-foreground">
                            Installed by: {operation.mounters.name}
                          </p>
                        )}
                        {operation.verified_at && (
                          <p className="text-xs text-muted-foreground">
                            On: {formatDate(operation.verified_at)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    {assetPhotos.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Proof Photos</p>
                        <div className="grid grid-cols-2 gap-2">
                          {assetPhotos.map((photo) => (
                            <div key={photo.id} className="relative aspect-video">
                              <img
                                src={photo.file_path}
                                alt={photo.photo_type}
                                className="w-full h-full object-cover rounded-md"
                              />
                              <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                                {photo.photo_type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, MapPin, Calendar } from "lucide-react";
import { UnifiedPhotoGallery, UnifiedPhoto } from "@/components/common/UnifiedPhotoGallery";
import { CampaignTimeline, TimelineEvent } from "@/components/portal/CampaignTimeline";
import { format } from "date-fns";

interface CampaignAsset {
  id: string;
  asset_id: string;
  location: string;
  city: string;
  area: string;
  media_type: string;
  status: string;
}

export default function ClientCampaignView() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<any>(null);
  const [assets, setAssets] = useState<CampaignAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [photos, setPhotos] = useState<UnifiedPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCampaignData();
      loadPhotos();
    }
  }, [id]);

  const loadCampaignData = async () => {
    try {
      // Load campaign details
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      // Load campaign assets
      const { data: assetsData } = await supabase
        .from('campaign_assets')
        .select('*')
        .eq('campaign_id', id);

      setCampaign(campaignData);
      setAssets(assetsData || []);
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!id) return;
    
    try {
      const { data } = await supabase
        .from('media_photos')
        .select('*')
        .eq('campaign_id', id);

      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const generateTimelineEvents = (): TimelineEvent[] => {
    if (!campaign || !assets.length) return [];

    const events: TimelineEvent[] = [
      {
        id: "1",
        title: "Campaign Created",
        description: `${campaign.campaign_name} campaign was created`,
        date: campaign.created_at,
        status: "completed" as const,
        type: "milestone" as const,
      },
      {
        id: "2",
        title: "Campaign Started",
        description: `Campaign period began on ${format(new Date(campaign.start_date), "MMM dd, yyyy")}`,
        date: campaign.start_date,
        status: new Date() >= new Date(campaign.start_date) ? ("completed" as const) : ("pending" as const),
        type: "milestone" as const,
      },
    ];

    // Add asset installation events
    const installedCount = assets.filter(a => 
      a.status === "Installed" || a.status === "PhotoUploaded" || a.status === "Verified"
    ).length;
    
    if (installedCount > 0) {
      events.push({
        id: "3",
        title: "Assets Installed",
        description: `${installedCount} of ${assets.length} assets have been installed`,
        date: campaign.start_date,
        status: installedCount === assets.length ? ("completed" as const) : ("in_progress" as const),
        type: "delivery" as const,
      });
    }

    // Add verification events
    const verifiedCount = assets.filter(a => a.status === "Verified").length;
    
    if (verifiedCount > 0) {
      events.push({
        id: "4",
        title: "Proof Verified",
        description: `${verifiedCount} of ${assets.length} proofs have been verified`,
        date: new Date().toISOString(),
        status: verifiedCount === assets.length ? ("completed" as const) : ("in_progress" as const),
        type: "verification" as const,
      });
    }

    // Add campaign end event
    events.push({
      id: "5",
      title: "Campaign Ends",
      description: `Campaign scheduled to end on ${format(new Date(campaign.end_date), "MMM dd, yyyy")}`,
      date: campaign.end_date,
      status: new Date() > new Date(campaign.end_date) ? ("completed" as const) : ("pending" as const),
      type: "milestone" as const,
    });

    return events;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-muted-foreground">Campaign not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">{campaign.campaign_name}</h1>
              <p className="text-primary-foreground/80 mt-2">{campaign.client_name}</p>
            </div>
            <Badge className="bg-background text-foreground">
              {campaign.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="assets">Assets & Proofs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            {/* Campaign Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start Date
                    </p>
                    <p className="text-lg font-semibold mt-1">
                      {new Date(campaign.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      End Date
                    </p>
                    <p className="text-lg font-semibold mt-1">
                      {new Date(campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Assets</p>
                    <p className="text-lg font-semibold mt-1">{campaign.total_assets || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Campaign Value</p>
                    <p className="text-lg font-semibold mt-1">
                      ₹{campaign.grand_total?.toLocaleString('en-IN') || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-6">
            <CampaignTimeline
              campaignId={campaign.id}
              campaignName={campaign.campaign_name}
              startDate={campaign.start_date}
              endDate={campaign.end_date}
              status={campaign.status}
              events={generateTimelineEvents()}
            />
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            {/* Assets List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Campaign Assets</h2>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
              <div className="grid gap-4">
                {assets.map((asset) => (
                  <Card key={asset.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{asset.asset_id}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <MapPin className="h-4 w-4" />
                            {asset.location}, {asset.area}, {asset.city}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {asset.media_type}
                          </p>
                        </div>
                        <Badge>{asset.status}</Badge>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAsset(selectedAsset === asset.asset_id ? null : asset.asset_id)}
                      >
                        {selectedAsset === asset.asset_id ? 'Hide' : 'View'} Proof Photos
                      </Button>

                      {selectedAsset === asset.asset_id && (
                        <div className="mt-4 border-t pt-4">
                          <UnifiedPhotoGallery
                            photos={photos.filter(p => (p as any).asset_id === asset.asset_id)}
                            onPhotoDeleted={loadPhotos}
                            canDelete={false}
                            bucket="operations-photos"
                            title="Installation Proofs"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

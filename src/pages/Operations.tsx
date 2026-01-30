import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle, Clock, Calendar, List, LayoutGrid } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { OperationsNotifications } from "@/components/operations/OperationsNotifications";
import { OperationsTasksList } from "@/components/operations/OperationsTasksList";
import { OperationsDataTable } from "@/components/operations/OperationsDataTable";

interface Campaign {
  id: string;
  campaign_name: string;
  client_name: string;
  status: string;
  start_date: string;
  end_date: string;
  total_assets: number;
}

interface CampaignAsset {
  id: string;
  asset_id: string;
  campaign_id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  status: string;
  mounter_name: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  photos: any;
  media_assets?: {
    id: string;
    media_asset_code?: string | null;
    location?: string;
    city?: string;
    area?: string;
    qr_code_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  campaign?: {
    id: string;
    campaign_name: string;
    client_name: string;
    status: string;
  };
}

export default function Operations() {
  const navigate = useNavigate();
  const { company } = useCompany();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignAssets, setCampaignAssets] = useState<CampaignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("table");

  useEffect(() => {
    if (company?.id) {
      fetchCampaigns();
      fetchCampaignAssets();
    }

    // Set up real-time subscription for campaign updates
    const channel = supabase
      .channel("campaigns-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaigns",
          filter: `status=in.(InProgress,Planned)`,
        },
        () => {
          fetchCampaigns();
          fetchCampaignAssets();
        }
      )
      .subscribe();

    // Set up real-time subscription for campaign_assets changes
    const assetsChannel = supabase
      .channel("campaign-assets-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_assets",
        },
        () => {
          fetchCampaignAssets();
          if (campaigns.length > 0) {
            loadStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(assetsChannel);
    };
  }, [company?.id]);

  const fetchCampaigns = async () => {
    if (!company?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("company_id", company.id)
        .in("status", ["InProgress", "Planned"])
        .order("start_date", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignAssets = async () => {
    if (!company?.id) return;
    
    try {
      setAssetsLoading(true);
      const { data, error } = await supabase
        .from("campaign_assets")
        .select(`
          *,
          media_assets!campaign_assets_asset_id_fkey (
            id,
            media_asset_code,
            location,
            city,
            area,
            qr_code_url,
            latitude,
            longitude
          ),
          campaign:campaigns!campaign_assets_campaign_id_fkey (
            id,
            campaign_name,
            client_name,
            status
          )
        `)
        .order("assigned_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Filter by company's campaigns
      const filteredAssets = (data || []).filter(
        asset => asset.campaign?.id && campaigns.some(c => c.id === asset.campaign_id)
      );
      
      setCampaignAssets(data || []);
    } catch (error: any) {
      console.error("Error fetching campaign assets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch operations data",
        variant: "destructive",
      });
    } finally {
      setAssetsLoading(false);
    }
  };

  const getStatusStats = async (campaignId: string) => {
    const { data, error } = await supabase
      .from("campaign_assets")
      .select("status")
      .eq("campaign_id", campaignId);

    if (error || !data) return { pending: 0, installed: 0, verified: 0 };

    return {
      pending: data.filter((a) => a.status === "Pending" || a.status === "Assigned").length,
      installed: data.filter((a) => a.status === "Mounted" || a.status === "PhotoUploaded").length,
      verified: data.filter((a) => a.status === "Verified").length,
    };
  };

  const [stats, setStats] = useState<Record<string, any>>({});

  const loadStats = async () => {
    const statsData: Record<string, any> = {};
    for (const campaign of campaigns) {
      statsData[campaign.id] = await getStatusStats(campaign.id);
    }
    setStats(statsData);
  };

  useEffect(() => {
    if (campaigns.length > 0) {
      loadStats();
    }
  }, [campaigns]);

  // Calculate overall stats from campaign assets
  const overallStats = {
    pending: campaignAssets.filter(a => a.status === "Pending" || a.status === "Assigned").length,
    inProgress: campaignAssets.filter(a => a.status === "InProgress" || a.status === "Mounted").length,
    photoUploaded: campaignAssets.filter(a => a.status === "PhotoUploaded").length,
    verified: campaignAssets.filter(a => a.status === "Verified" || a.status === "Completed").length,
  };

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Operations</h2>
            <p className="text-muted-foreground">
              Manage campaign operations and mounting assignments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/operations-analytics")}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Analytics
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/operations-calendar")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/mobile-operations")}
          >
            Mobile View
          </Button>
          <OperationsNotifications />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending / Assigned</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {overallStats.pending}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {overallStats.inProgress}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photo Uploaded</CardTitle>
            <AlertCircle className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
              {overallStats.photoUploaded}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {overallStats.verified}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            All Operations
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            By Campaign
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <OperationsDataTable
            assets={campaignAssets}
            campaigns={campaigns}
            loading={assetsLoading}
            onRefresh={fetchCampaignAssets}
          />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4 space-y-4">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Loading campaigns...</p>
              </CardContent>
            </Card>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No active campaigns found</p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => {
              const campaignStats = stats[campaign.id] || { pending: 0, installed: 0, verified: 0 };
              const total = campaignStats.pending + campaignStats.installed + campaignStats.verified;
              const progress = total > 0 ? Math.round((campaignStats.verified / total) * 100) : 0;

              return (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{campaign.campaign_name}</CardTitle>
                        <CardDescription>{campaign.client_name}</CardDescription>
                      </div>
                      <Badge className={campaign.status === 'InProgress' ? 'bg-green-500' : 'bg-blue-500'}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start:</span>{" "}
                          <span className="font-medium">
                            {new Date(campaign.start_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End:</span>{" "}
                          <span className="font-medium">
                            {new Date(campaign.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Assets:</span>{" "}
                          <span className="font-medium">{campaign.total_assets}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span className="text-muted-foreground">
                            Pending: {campaignStats.pending}
                          </span>
                          <span className="text-muted-foreground">
                            Installed: {campaignStats.installed}
                          </span>
                          <span className="text-muted-foreground">
                            Verified: {campaignStats.verified}
                          </span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/campaigns/${campaign.id}`);
                      }}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <OperationsTasksList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

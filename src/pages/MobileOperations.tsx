import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Wifi, WifiOff, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Campaign {
  id: string;
  campaign_name: string;
  client_name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface Assignment {
  id: string;
  campaign_id: string;
  asset_id: string;
  location: string;
  status: string;
  campaign_name: string;
  client_name: string;
}

export default function MobileOperations() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Syncing data...",
      });
      fetchData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Using cached data",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    fetchData();

    // Set up real-time subscriptions when online
    let campaignsChannel: any;
    let assetsChannel: any;

    if (isOnline) {
      campaignsChannel = supabase
        .channel("campaigns-mobile")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaigns",
          },
          () => {
            fetchData();
          }
        )
        .subscribe();

      assetsChannel = supabase
        .channel("campaign-assets-mobile")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "campaign_assets",
          },
          () => {
            fetchData();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (campaignsChannel) supabase.removeChannel(campaignsChannel);
      if (assetsChannel) supabase.removeChannel(assetsChannel);
    };
  }, [isOnline]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .in("status", ["InProgress", "Planned"])
        .order("start_date", { ascending: false });

      if (campaignsError) throw campaignsError;

      // Fetch all assignments
      const { data: assetsData, error: assetsError } = await supabase
        .from("campaign_assets")
        .select(`
          *,
          campaigns!inner(campaign_name, client_name)
        `);

      if (assetsError) throw assetsError;

      // Cache data in localStorage for offline use
      localStorage.setItem("cached_campaigns", JSON.stringify(campaignsData));
      localStorage.setItem("cached_assignments", JSON.stringify(assetsData));

      setCampaigns(campaignsData || []);
      setAssignments(
        assetsData?.map((asset: any) => ({
          id: asset.id,
          campaign_id: asset.campaign_id,
          asset_id: asset.asset_id,
          location: asset.location,
          status: asset.status,
          campaign_name: asset.campaigns?.campaign_name || "Unknown",
          client_name: asset.campaigns?.client_name || "Unknown",
        })) || []
      );

      setLastSync(new Date());
    } catch (error: any) {
      console.error("Error fetching data:", error);
      
      // Try to load from cache
      const cachedCampaigns = localStorage.getItem("cached_campaigns");
      const cachedAssignments = localStorage.getItem("cached_assignments");
      
      if (cachedCampaigns) {
        setCampaigns(JSON.parse(cachedCampaigns));
      }
      if (cachedAssignments) {
        setAssignments(JSON.parse(cachedAssignments));
      }

      if (!cachedCampaigns && !cachedAssignments) {
        toast({
          title: "Error",
          description: "Failed to fetch data and no cache available",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified":
        return "bg-green-500";
      case "PhotoUploaded":
      case "Mounted":
        return "bg-blue-500";
      case "Assigned":
        return "bg-yellow-500";
      case "Pending":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusStats = (campaignId: string) => {
    const campaignAssets = assignments.filter((a) => a.campaign_id === campaignId);
    return {
      pending: campaignAssets.filter((a) => a.status === "Pending" || a.status === "Assigned").length,
      installed: campaignAssets.filter((a) => a.status === "Mounted" || a.status === "PhotoUploaded").length,
      verified: campaignAssets.filter((a) => a.status === "Verified").length,
      total: campaignAssets.length,
    };
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Operations</h1>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge className="bg-green-500">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={fetchData} disabled={!isOnline || loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        {lastSync && (
          <p className="text-sm text-muted-foreground">
            Last synced: {lastSync.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xl font-bold">
                {assignments.filter((a) => a.status === "Pending" || a.status === "Assigned").length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <span className="text-xl font-bold">
                {assignments.filter((a) => a.status === "Mounted" || a.status === "PhotoUploaded").length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xl font-bold">
                {assignments.filter((a) => a.status === "Verified").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="assignments">All Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading campaigns...
              </CardContent>
            </Card>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No active campaigns
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => {
              const stats = getStatusStats(campaign.id);
              const progress = stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0;

              return (
                <Card
                  key={campaign.id}
                  className="cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base">{campaign.campaign_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{campaign.client_name}</p>
                      </div>
                      <Badge className={getStatusColor(campaign.status)} variant="secondary">
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2">
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Pending: {stats.pending}</span>
                        <span>Progress: {stats.installed}</span>
                        <span>Done: {stats.verified}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading assignments...
              </CardContent>
            </Card>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No assignments found
              </CardContent>
            </Card>
          ) : (
            assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="cursor-pointer active:scale-95 transition-transform"
                onClick={() => navigate(`/admin/campaigns/${assignment.campaign_id}`)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-sm">{assignment.asset_id}</CardTitle>
                      <p className="text-xs text-muted-foreground">{assignment.location}</p>
                    </div>
                    <Badge className={getStatusColor(assignment.status)} variant="secondary">
                      {assignment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground">
                      <span className="font-medium">Campaign:</span> {assignment.campaign_name}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">Client:</span> {assignment.client_name}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

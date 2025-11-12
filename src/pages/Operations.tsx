import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Filter, TrendingUp, AlertCircle, CheckCircle, Clock, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { OperationsNotifications } from "@/components/operations/OperationsNotifications";

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
  location: string;
  status: string;
  mounter_name?: string;
}

export default function Operations() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchCampaigns();

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
        (payload) => {
          console.log("Campaign change detected:", payload);
          fetchCampaigns(); // Refresh campaigns on any change
        }
      )
      .subscribe();

    // Set up real-time subscription for campaign_assets changes
    const assetsChannel = supabase
      .channel("campaign-assets-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_assets",
        },
        (payload) => {
          console.log("Campaign asset updated:", payload);
          // Refresh stats when asset status changes
          if (campaigns.length > 0) {
            const loadStats = async () => {
              const statsData: Record<string, any> = {};
              for (const campaign of campaigns) {
                statsData[campaign.id] = await getStatusStats(campaign.id);
              }
              setStats(statsData);
            };
            loadStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(assetsChannel);
    };
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
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

  useEffect(() => {
    const loadStats = async () => {
      const statsData: Record<string, any> = {};
      for (const campaign of campaigns) {
        statsData[campaign.id] = await getStatusStats(campaign.id);
      }
      setStats(statsData);
    };
    if (campaigns.length > 0) {
      loadStats();
    }
  }, [campaigns]);

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.client_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "InProgress":
        return "bg-green-500";
      case "Planned":
        return "bg-blue-500";
      case "Completed":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
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
            onClick={() => navigate("/admin/operations-calendar")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Calendar View
          </Button>
          <OperationsNotifications />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter((c) => c.status === "InProgress").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Installs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(stats).reduce((sum: number, s: any) => sum + (s.pending || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(stats).reduce((sum: number, s: any) => sum + (s.installed || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(stats).reduce((sum: number, s: any) => sum + (s.verified || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="InProgress">In Progress</SelectItem>
                <SelectItem value="Planned">Planned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Loading campaigns...</p>
            </CardContent>
          </Card>
        ) : filteredCampaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No campaigns found</p>
            </CardContent>
          </Card>
        ) : (
          filteredCampaigns.map((campaign) => {
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
                    <Badge className={getStatusColor(campaign.status)}>
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
      </div>
    </div>
  );
}

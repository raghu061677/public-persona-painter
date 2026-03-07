import { useState, useEffect } from "react";
import { ModuleGuard } from "@/components/rbac/ModuleGuard";
import { useScopedQuery } from "@/hooks/useScopedQuery";
import { supabase } from "@/integrations/supabase/client";
import { ListToolbar } from "@/components/list-views";
import { useListView } from "@/hooks/useListView";
import { useListViewExport } from "@/hooks/useListViewExport";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, Calendar, List, LayoutGrid, Map,
  RefreshCw, Smartphone, ClipboardList, Wrench, Eye, Camera,
  CheckCircle2, AlertTriangle
} from "lucide-react";
import { OpsKpiCards } from "@/components/operations/OpsKpiCards";
import { OpsSummaryBar } from "@/components/operations/OpsSummaryBar";
import { OpsTaskCard } from "@/components/operations/OpsTaskCard";
import { OpsProofCapture } from "@/components/operations/OpsProofCapture";
import { toast } from "@/hooks/use-toast";
import { OperationsNotifications } from "@/components/operations/OperationsNotifications";
import { OperationsTasksList } from "@/components/operations/OperationsTasksList";
import { OperationsDataTable } from "@/components/operations/OperationsDataTable";
import { OperationsMapView } from "@/components/operations/OperationsMapView";
import { cn } from "@/lib/utils";

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
  latitude?: number | null;
  longitude?: number | null;
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

// Status queue filter types
type QueueFilter = "all" | "mounting" | "monitoring" | "proof_pending" | "verification" | "completed" | "issues";

export default function Operations() {
  const navigate = useNavigate();
  const { company } = useCompany();

  // RBAC scope filtering
  const { filterByScope: opsScopeFilter } = useScopedQuery('operations', {
    ownerColumn: 'created_by',
    assignmentColumn: 'assigned_mounter_id',
    additionalAssignmentColumns: ['mounter_name'],
  });

  // Global List View System
  const lv = useListView("ops.campaign_assets");
  const { handleExportExcel, handleExportPdf } = useListViewExport({
    pageKey: "ops.campaign_assets",
    title: "Operations",
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignAssets, setCampaignAssets] = useState<CampaignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Proof capture dialog state
  const [proofAsset, setProofAsset] = useState<any>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchCampaigns();
      fetchCampaignAssets();
    }

    const channel = supabase
      .channel("campaigns-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns", filter: `status=in.(InProgress,Planned)` }, () => {
        fetchCampaigns();
        fetchCampaignAssets();
      })
      .subscribe();

    const assetsChannel = supabase
      .channel("campaign-assets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_assets" }, () => {
        fetchCampaignAssets();
      })
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
      toast({ title: "Error", description: "Failed to fetch campaigns", variant: "destructive" });
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
            id, media_asset_code, location, city, area, qr_code_url, latitude, longitude
          ),
          campaign:campaigns!campaign_assets_campaign_id_fkey (
            id, campaign_name, client_name, status
          )
        `)
        .order("assigned_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      setCampaignAssets(opsScopeFilter(data || []));
    } catch (error: any) {
      console.error("Error fetching campaign assets:", error);
      toast({ title: "Error", description: "Failed to fetch operations data", variant: "destructive" });
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCampaigns(), fetchCampaignAssets()]);
    setRefreshing(false);
  };

  // Queue-filtered assets
  const queueFilteredAssets = (() => {
    switch (queueFilter) {
      case "mounting":
        return campaignAssets.filter(a => a.status === "Pending" || a.status === "Assigned");
      case "monitoring":
        return campaignAssets.filter(a => a.status === "Installed" || a.status === "Mounted");
      case "proof_pending":
        return campaignAssets.filter(a => {
          const s = a.status;
          return (s === "Installed" || s === "Mounted") && !hasPhotos(a);
        });
      case "verification":
        return campaignAssets.filter(a => a.status === "PhotoUploaded");
      case "completed":
        return campaignAssets.filter(a => a.status === "Verified" || a.status === "Completed");
      case "issues":
        return campaignAssets.filter(a => {
          if (a.status !== "Assigned" || !a.assigned_at) return false;
          const days = Math.floor((Date.now() - new Date(a.assigned_at).getTime()) / 86400000);
          return days > 7;
        });
      default:
        return campaignAssets;
    }
  })();

  // Queue filter chips with counts
  const queueChips: { key: QueueFilter; label: string; icon: any; count: number }[] = [
    { key: "all", label: "All Tasks", icon: ClipboardList, count: campaignAssets.length },
    { key: "mounting", label: "Mounting", icon: Wrench, count: campaignAssets.filter(a => a.status === "Pending" || a.status === "Assigned").length },
    { key: "monitoring", label: "Monitoring", icon: Eye, count: campaignAssets.filter(a => a.status === "Installed" || a.status === "Mounted").length },
    { key: "proof_pending", label: "Proof Pending", icon: Camera, count: campaignAssets.filter(a => (a.status === "Installed" || a.status === "Mounted") && !hasPhotos(a)).length },
    { key: "verification", label: "Verification", icon: CheckCircle2, count: campaignAssets.filter(a => a.status === "PhotoUploaded").length },
    { key: "completed", label: "Completed", icon: CheckCircle2, count: campaignAssets.filter(a => a.status === "Verified" || a.status === "Completed").length },
    { key: "issues", label: "Issues", icon: AlertTriangle, count: campaignAssets.filter(a => a.status === "Assigned" && a.assigned_at && Math.floor((Date.now() - new Date(a.assigned_at).getTime()) / 86400000) > 7).length },
  ];

  const handleUploadProof = (asset: any) => {
    setProofAsset(asset);
    setProofDialogOpen(true);
  };

  const handleViewDetails = (asset: any) => {
    navigate(`/admin/operations/${asset.campaign_id}/assets/${asset.asset_id}`);
  };

  // Campaign progress stats
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    if (campaigns.length > 0) {
      loadStats();
    }
  }, [campaigns]);

  const loadStats = async () => {
    const statsData: Record<string, any> = {};
    for (const campaign of campaigns) {
      const { data } = await supabase
        .from("campaign_assets")
        .select("status")
        .eq("campaign_id", campaign.id);
      if (data) {
        statsData[campaign.id] = {
          pending: data.filter(a => a.status === "Pending" || a.status === "Assigned").length,
          installed: data.filter(a => a.status === "Installed" || a.status === "Mounted" || a.status === "PhotoUploaded").length,
          verified: data.filter(a => a.status === "Verified").length,
        };
      }
    }
    setStats(statsData);
  };

  return (
    <ModuleGuard module="operations">
      <div className="flex-1 space-y-4 p-4 sm:p-6 pt-4">
        {/* ── Command Center Header ───────────────────── */}
        <div className="rounded-xl bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Operations Command Center</h2>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Mounting · Monitoring · Proof Capture · Verification
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/operations-analytics")} className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/operations-calendar")} className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/mobile-operations")} className="gap-1.5">
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </Button>
              <OperationsNotifications />
            </div>
          </div>
        </div>

        {/* ── KPI Cards ───────────────────────────────── */}
        <OpsKpiCards assets={campaignAssets} />

        {/* ── Queue Filter Chips ──────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {queueChips.map((chip) => (
            <Button
              key={chip.key}
              variant={queueFilter === chip.key ? "default" : "outline"}
              size="sm"
              className="gap-1.5 shrink-0 h-8 text-xs"
              onClick={() => setQueueFilter(chip.key)}
            >
              <chip.icon className="h-3 w-3" />
              {chip.label}
              {chip.count > 0 && (
                <Badge variant={queueFilter === chip.key ? "secondary" : "outline"} className="text-[10px] h-4 px-1 ml-0.5">
                  {chip.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* ── Global List Toolbar ─────────────────────── */}
        <ListToolbar
          searchQuery={lv.searchQuery}
          onSearchChange={lv.setSearchQuery}
          searchPlaceholder="Search operations..."
          fields={lv.catalog.fields}
          groups={lv.catalog.groups}
          selectedFields={lv.selectedFields}
          defaultFieldKeys={lv.catalog.defaultFieldKeys}
          onFieldsChange={lv.setSelectedFields}
          presets={lv.presets}
          activePreset={lv.activePreset}
          onPresetSelect={lv.applyPreset}
          onPresetSave={lv.saveCurrentAsView}
          onPresetUpdate={lv.updateCurrentView}
          onPresetDelete={lv.deletePreset}
          onPresetDuplicate={lv.duplicatePreset}
          onExportExcel={(fields) => handleExportExcel(queueFilteredAssets, fields)}
          onExportPdf={(fields) => handleExportPdf(queueFilteredAssets, fields)}
          onReset={lv.resetToDefaults}
        />

        {/* ── Summary Bar ─────────────────────────────── */}
        <OpsSummaryBar assets={queueFilteredAssets} />

        {/* ── Main Tabs ───────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              <List className="h-3.5 w-3.5" />
              Table
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-1.5 text-xs sm:text-sm">
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-3.5 w-3.5" />
              By Campaign
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm">
              <Map className="h-3.5 w-3.5" />
              Map
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs sm:text-sm">
              Tasks
            </TabsTrigger>
          </TabsList>

          {/* Table view */}
          <TabsContent value="all" className="mt-4">
            <OperationsDataTable
              assets={queueFilteredAssets}
              campaigns={campaigns}
              loading={assetsLoading}
              onRefresh={fetchCampaignAssets}
            />
          </TabsContent>

          {/* Cards view (mobile-first) */}
          <TabsContent value="cards" className="mt-4">
            {assetsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading tasks…</div>
            ) : queueFilteredAssets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No tasks match the current filter.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {queueFilteredAssets.map((asset) => (
                  <OpsTaskCard
                    key={asset.id}
                    asset={asset}
                    onViewDetails={handleViewDetails}
                    onUploadProof={handleUploadProof}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* By Campaign view */}
          <TabsContent value="campaigns" className="mt-4 space-y-4">
            {loading ? (
              <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">Loading campaigns…</p></CardContent></Card>
            ) : campaigns.length === 0 ? (
              <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No active campaigns found</p></CardContent></Card>
            ) : (
              campaigns.map((campaign) => {
                const cs = stats[campaign.id] || { pending: 0, installed: 0, verified: 0 };
                const total = cs.pending + cs.installed + cs.verified;
                const progress = total > 0 ? Math.round((cs.verified / total) * 100) : 0;
                return (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/campaigns/${campaign.id}`)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <CardTitle className="text-base sm:text-lg">{campaign.campaign_name}</CardTitle>
                          <CardDescription className="text-xs">{campaign.client_name}</CardDescription>
                        </div>
                        <Badge variant={campaign.status === "InProgress" ? "default" : "secondary"} className="text-[11px]">
                          {campaign.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>Start: <span className="font-medium text-foreground">{new Date(campaign.start_date).toLocaleDateString()}</span></span>
                        <span>End: <span className="font-medium text-foreground">{new Date(campaign.end_date).toLocaleDateString()}</span></span>
                        <span>Assets: <span className="font-medium text-foreground">{campaign.total_assets}</span></span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex gap-4 text-[11px] text-muted-foreground">
                          <span>Pending: {cs.pending}</span>
                          <span>Installed: {cs.installed}</span>
                          <span>Verified: {cs.verified}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); navigate(`/admin/campaigns/${campaign.id}`); }}>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* Map view */}
          <TabsContent value="map" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Operations Map</CardTitle>
                <CardDescription className="text-xs">Geographic view of all operational tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <OperationsMapView />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks view */}
          <TabsContent value="tasks" className="mt-4">
            <OperationsTasksList />
          </TabsContent>
        </Tabs>

        {/* ── Proof Capture Dialog ────────────────────── */}
        {proofAsset && (
          <OpsProofCapture
            open={proofDialogOpen}
            onOpenChange={setProofDialogOpen}
            asset={proofAsset}
            campaignId={proofAsset.campaign_id}
            onComplete={() => {
              fetchCampaignAssets();
              setProofAsset(null);
            }}
          />
        )}
      </div>
    </ModuleGuard>
  );
}

function hasPhotos(asset: any): boolean {
  if (!asset.photos) return false;
  let obj = asset.photos;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { return false; }
  }
  if (typeof obj !== "object" || obj === null) return false;
  return Object.values(obj).some(Boolean);
}

import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, useLocation, useParams } from "react-router-dom";
import { db, auth } from "@/lib/supabase-wrapper";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Camera, 
  List, 
  Upload, 
  Zap,
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  MapPin,
  Receipt,
  Briefcase,
  Search,
  LayoutDashboard,
  QrCode,
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type TaskStatus = 'Pending' | 'Assigned' | 'Mounted' | 'PhotoUploaded' | 'Verified';

interface CampaignAsset {
  id: string;
  campaign_id: string;
  asset_id: string;
  location: string;
  area: string;
  city: string;
  media_type: string;
  status: TaskStatus;
  photos: any;
  mounter_name: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  latitude: number | null;
  longitude: number | null;
  qr_code_url?: string | null;
  google_street_view_url?: string | null;
  location_url?: string | null;
}

interface Campaign {
  id: string;
  campaign_name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

// Main Mobile Router Component
export default function MobileApp() {
  return (
    <div className="min-h-screen bg-background">
      <MobileNavigation />
      <Routes>
        <Route path="/" element={<MobileFieldApp />} />
        <Route path="/field-app" element={<MobileFieldApp />} />
        <Route path="/upload/:campaignId?/:assetId?" element={<MobileOperationsUpload />} />
        <Route path="/power-bills" element={<MobilePowerBillsView />} />
      </Routes>
    </div>
  );
}

// Mobile Bottom Navigation
function MobileNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const tabs = [
    { id: 'field-app', label: 'Dashboard', icon: LayoutDashboard, path: '/mobile/field-app' },
    { id: 'upload', label: 'Upload', icon: Camera, path: '/mobile/upload' },
    { id: 'power-bills', label: 'Bills', icon: Receipt, path: '/mobile/power-bills' },
  ];

  const isActive = (path: string) => location.pathname === path || 
    (path === '/mobile/field-app' && location.pathname === '/mobile');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 mb-1", active && "fill-primary")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Field App Component - Enhanced Dashboard
function MobileFieldApp() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  
  const [tasks, setTasks] = useState<CampaignAsset[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [vacantMedia, setVacantMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back Online", description: "Syncing data..." });
      fetchData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ 
        title: "Offline Mode", 
        description: "Using cached data", 
        variant: "destructive" 
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    fetchData();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
      const { data: { user } } = await auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your tasks",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Fetch campaign assets
      const { data: tasksData, error: tasksError } = await db
        .from('campaign_assets')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch campaigns (both ongoing and all campaigns)
      const { data: campaignsData, error: campaignsError } = await db
        .from('campaigns')
        .select('*')
        .order('start_date', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Fetch vacant media
      const { data: vacantMediaData, error: vacantError } = await db
        .from('media_assets')
        .select('*')
        .eq('status', 'Available')
        .order('city', { ascending: true })
        .limit(20);

      if (vacantError) throw vacantError;
      setVacantMedia(vacantMediaData || []);

      // Cache for offline
      localStorage.setItem("cached_tasks", JSON.stringify(tasksData));
      localStorage.setItem("cached_campaigns", JSON.stringify(campaignsData));
      localStorage.setItem("cached_vacant_media", JSON.stringify(vacantMediaData));

      setTasks(tasksData || []);
    } catch (error: any) {
      // Try to load from cache
      const cachedTasks = localStorage.getItem("cached_tasks");
      const cachedCampaigns = localStorage.getItem("cached_campaigns");
      const cachedVacantMedia = localStorage.getItem("cached_vacant_media");
      
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
        if (cachedCampaigns) setCampaigns(JSON.parse(cachedCampaigns));
        if (cachedVacantMedia) setVacantMedia(JSON.parse(cachedVacantMedia));
        toast({
          title: "Using Cached Data",
          description: "Couldn't fetch latest data",
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to load data",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500';
      case 'Assigned': return 'bg-blue-500';
      case 'Mounted': return 'bg-cyan-500';
      case 'PhotoUploaded': return 'bg-green-500';
      case 'Verified': return 'bg-emerald-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'Assigned':
      case 'Mounted': return <Upload className="h-4 w-4" />;
      case 'PhotoUploaded':
      case 'Verified': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const pendingTasks = tasks.filter(t => 
    t.status === 'Pending' || t.status === 'Assigned' || t.status === 'Mounted'
  );
  const completedTasks = tasks.filter(t => 
    t.status === 'PhotoUploaded' || t.status === 'Verified'
  );
  const ongoingCampaigns = campaigns.filter(c => 
    c.status === 'InProgress'
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold">Field Operations</h1>
            <div className="flex items-center gap-2 mt-1">
              {isOnline ? (
                <Badge variant="outline" className="text-green-600 text-xs">
                  <Zap className="h-3 w-3 mr-1" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" /> Offline
                </Badge>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={fetchData}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-1.5 px-3 pb-3 overflow-x-auto">
          <Button
            variant={activeView === 'dashboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('dashboard')}
            className="flex-shrink-0 text-xs h-8"
          >
            Dashboard
          </Button>
          <Button
            variant={activeView === 'tasks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('tasks')}
            className="flex-shrink-0 text-xs h-8"
          >
            <List className="h-3 w-3 mr-1" />
            Tasks ({pendingTasks.length})
          </Button>
          <Button
            variant={activeView === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('completed')}
            className="flex-shrink-0 text-xs h-8"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Done ({completedTasks.length})
          </Button>
          <Button
            variant={activeView === 'campaigns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('campaigns')}
            className="flex-shrink-0 text-xs h-8"
          >
            <Briefcase className="h-3 w-3 mr-1" />
            Campaigns
          </Button>
          <Button
            variant={activeView === 'vacant' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('vacant')}
            className="flex-shrink-0 text-xs h-8"
          >
            <Search className="h-3 w-3 mr-1" />
            Vacant
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        ) : (
          <>
            {activeView === 'dashboard' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Pending Tasks</div>
                      <div className="text-2xl font-bold">{pendingTasks.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Completed</div>
                      <div className="text-2xl font-bold">{completedTasks.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Active Campaigns</div>
                      <div className="text-2xl font-bold">{ongoingCampaigns.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">Vacant Media</div>
                      <div className="text-2xl font-bold">{vacantMedia.length}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Ongoing Campaigns */}
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Active Campaigns
                  </h2>
                  {ongoingCampaigns.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-sm text-muted-foreground">
                        No active campaigns
                      </CardContent>
                    </Card>
                  ) : (
                    ongoingCampaigns.slice(0, 3).map(campaign => (
                      <CampaignCard key={campaign.id} campaign={campaign} compact />
                    ))
                  )}
                </div>

                {/* Priority Tasks */}
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Priority Tasks
                  </h2>
                  {pendingTasks.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-sm text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                        All tasks completed!
                      </CardContent>
                    </Card>
                  ) : (
                    pendingTasks.slice(0, 3).map(task => (
                      <TaskCard key={task.id} task={task} campaigns={campaigns} navigate={navigate} compact />
                    ))
                  )}
                  {pendingTasks.length > 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveView('tasks')}
                    >
                      View all {pendingTasks.length} tasks
                    </Button>
                  )}
                </div>
              </>
            )}

            {activeView === 'tasks' && (
              <>
                {pendingTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-sm text-muted-foreground">No pending tasks</p>
                    </CardContent>
                  </Card>
                ) : (
                  pendingTasks.map(task => (
                    <TaskCard key={task.id} task={task} campaigns={campaigns} navigate={navigate} />
                  ))
                )}
              </>
            )}

            {activeView === 'completed' && (
              <>
                {completedTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No completed tasks</p>
                    </CardContent>
                  </Card>
                ) : (
                  completedTasks.map(task => (
                    <TaskCard key={task.id} task={task} campaigns={campaigns} navigate={navigate} />
                  ))
                )}
              </>
            )}

            {activeView === 'campaigns' && (
              <>
                {campaigns.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No campaigns</p>
                    </CardContent>
                  </Card>
                ) : (
                  campaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))
                )}
              </>
            )}

            {activeView === 'vacant' && (
              <>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">Available Media Assets</h2>
                  {vacantMedia.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No vacant media</p>
                      </CardContent>
                    </Card>
                  ) : (
                    vacantMedia.map(asset => (
                      <VacantMediaCard key={asset.id} asset={asset} />
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, campaigns, navigate, compact }: { 
  task: CampaignAsset; 
  campaigns: Campaign[]; 
  navigate: any;
  compact?: boolean;
}) {
  const campaign = campaigns.find(c => c.id === task.campaign_id);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500';
      case 'Assigned': return 'bg-blue-500';
      case 'Mounted': return 'bg-cyan-500';
      case 'PhotoUploaded': return 'bg-green-500';
      case 'Verified': return 'bg-emerald-600';
      default: return 'bg-gray-500';
    }
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.location}</p>
              <p className="text-xs text-muted-foreground">{task.area}, {task.city}</p>
            </div>
            <Badge className={cn("ml-2 text-xs", getStatusColor(task.status))}>
              {task.status}
            </Badge>
          </div>
          {campaign && (
            <p className="text-xs text-muted-foreground truncate">{campaign.campaign_name}</p>
          )}
          {task.status !== 'Verified' && (
            <Button
              size="sm"
              className="w-full mt-2 h-8 text-xs"
              onClick={() => navigate(`/mobile/upload/${task.campaign_id}/${task.asset_id}`)}
            >
              <Camera className="h-3 w-3 mr-1" />
              Upload
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{task.location}</CardTitle>
            <CardDescription className="text-sm">
              {task.area}, {task.city}
            </CardDescription>
          </div>
          <Badge className={cn("ml-2", getStatusColor(task.status))}>
            {task.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Type</p>
            <p className="font-medium text-sm">{task.media_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Asset ID</p>
            <p className="font-medium text-sm truncate">{task.asset_id}</p>
          </div>
        </div>

        {campaign && (
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Campaign</p>
            <p className="font-medium text-sm">{campaign.campaign_name}</p>
            <p className="text-xs text-muted-foreground">{campaign.client_name}</p>
          </div>
        )}

        {task.assigned_at && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Assigned: {format(new Date(task.assigned_at), 'PPp')}
          </div>
        )}

        {(task.latitude && task.longitude) && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
            </div>
            
            {/* QR Code and Location Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {task.qr_code_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = task.qr_code_url!;
                    link.download = `qr-${task.asset_id}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  QR Code
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const url = task.google_street_view_url || 
                              task.location_url || 
                              `https://www.google.com/maps?q=${task.latitude},${task.longitude}`;
                  window.open(url, '_blank');
                }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Map
              </Button>
            </div>
          </div>
        )}

        {task.status !== 'Verified' && (
          <Button
            className="w-full mt-2"
            onClick={() => navigate(`/mobile/upload/${task.campaign_id}/${task.asset_id}`)}
          >
            <Camera className="h-4 w-4 mr-2" />
            Upload Proof
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Campaign Card Component
function CampaignCard({ campaign, compact }: { campaign: Campaign; compact?: boolean }) {
  const isEnding = new Date(campaign.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  if (compact) {
    return (
      <Card className={cn("transition-shadow", isEnding && "border-l-4 border-l-orange-500")}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{campaign.campaign_name}</p>
              <p className="text-xs text-muted-foreground truncate">{campaign.client_name}</p>
            </div>
            <Badge variant="outline" className="ml-2 text-xs">{campaign.status}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>Ends: {format(new Date(campaign.end_date), 'MMM dd')}</span>
            {isEnding && (
              <Badge variant="destructive" className="text-xs">Ending Soon</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-shadow", isEnding && "border-l-4 border-l-orange-500")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{campaign.campaign_name}</CardTitle>
            <CardDescription className="truncate">{campaign.client_name}</CardDescription>
          </div>
          <Badge variant="outline">{campaign.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Start Date</p>
            <p className="font-medium text-sm">{format(new Date(campaign.start_date), 'PP')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">End Date</p>
            <p className="font-medium text-sm">{format(new Date(campaign.end_date), 'PP')}</p>
          </div>
        </div>
        {isEnding && (
          <Badge variant="destructive" className="w-full justify-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Campaign Ending Soon
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Vacant Media Card Component
function VacantMediaCard({ asset }: { asset: any }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{asset.location || asset.area}</p>
            <p className="text-xs text-muted-foreground">{asset.area}, {asset.city}</p>
          </div>
          <Badge variant="outline" className="ml-2 text-xs bg-green-50">
            Available
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium truncate">{asset.media_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Size</p>
            <p className="font-medium">{asset.dimension || 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ID</p>
            <p className="font-medium truncate">{asset.id}</p>
          </div>
        </div>
        {asset.latitude && asset.longitude && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <MapPin className="h-3 w-3" />
            {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Mobile Operations Upload Component - redirects to desktop upload page
function MobileOperationsUpload() {
  const { campaignId, assetId } = useParams<{ campaignId?: string; assetId?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (campaignId && assetId) {
      // Redirect to the operations upload page
      navigate(`/admin/operations/${campaignId}/assets/${assetId}`, { replace: true });
    } else {
      // No params, go to operations board
      navigate('/admin/operations', { replace: true });
    }
  }, [campaignId, assetId, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}

// Mobile Power Bills View Component
function MobilePowerBillsView() {
  const navigate = useNavigate();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paidAmount, setPaidAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setRefreshing(true);
      
      const { data: { user } } = await auth.getUser();
      if (!user) {
        toast({ title: "Please login to view power bills", variant: "destructive" });
        navigate('/auth');
        return;
      }

      const { data, error } = await db
        .from('asset_power_bills')
        .select(`
          *,
          media_assets (
            location,
            area,
            city,
            media_type
          )
        `)
        .order('bill_month', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      toast({ title: "Error loading bills", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!selectedBill) return;
    
    setUpdating(true);
    try {
      let receiptUrl = null;

      // Upload receipt if provided
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `receipt-${selectedBill.id}-${Date.now()}.${fileExt}`;
        const filePath = `${selectedBill.asset_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('power-receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('power-receipts')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
      }

      const { error } = await db
        .from('asset_power_bills')
        .update({
          paid: true,
          payment_status: 'Paid',
          payment_date: paymentDate,
          paid_amount: parseFloat(paidAmount) || selectedBill.bill_amount,
          paid_receipt_url: receiptUrl,
        })
        .eq('id', selectedBill.id);

      if (error) throw error;

      toast({ title: "Success", description: "Bill marked as paid" });
      setShowPaymentDialog(false);
      setSelectedBill(null);
      fetchBills();
    } catch (error: any) {
      toast({ title: "Error updating bill", description: error.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const filteredBills = bills.filter(bill => {
    const matchesSearch = 
      bill.consumer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.service_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.media_assets?.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'pending' ? !bill.paid :
      filter === 'paid' ? bill.paid : true;
    
    return matchesSearch && matchesFilter;
  });

  const unpaidCount = bills.filter(b => !b.paid).length;
  const totalUnpaid = bills.filter(b => !b.paid).reduce((sum, b) => sum + (b.bill_amount || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 p-4 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Stats */}
      <div className="bg-primary text-primary-foreground p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Power Bills</h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary-foreground"
            onClick={() => fetchBills()}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary-foreground/10 rounded-lg p-3">
            <p className="text-xs opacity-90">Unpaid Bills</p>
            <p className="text-2xl font-bold">{unpaidCount}</p>
          </div>
          <div className="bg-primary-foreground/10 rounded-lg p-3">
            <p className="text-xs opacity-90">Total Unpaid</p>
            <p className="text-2xl font-bold">₹{totalUnpaid.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by location, service number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 rounded-lg bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-4 bg-muted/50 overflow-x-auto">
        {[
          { id: 'all', label: 'All', count: bills.length },
          { id: 'pending', label: 'Pending', count: bills.filter(b => !b.paid).length },
          { id: 'paid', label: 'Paid', count: bills.filter(b => b.paid).length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Bills List */}
      <div className="p-4 space-y-3">
        {filteredBills.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bills found</p>
            </CardContent>
          </Card>
        ) : (
          filteredBills.map(bill => (
            <Card 
              key={bill.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                !bill.paid && "border-l-4 border-l-destructive"
              )}
              onClick={() => {
                setSelectedBill(bill);
                if (!bill.paid) {
                  setPaidAmount(bill.bill_amount.toString());
                  setShowPaymentDialog(true);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      {bill.media_assets?.location || 'Unknown Location'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {bill.media_assets?.area}, {bill.media_assets?.city}
                    </p>
                  </div>
                  <Badge variant={bill.paid ? "secondary" : "destructive"}>
                    {bill.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bill Month</p>
                    <p className="font-medium">{bill.bill_month}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium text-lg">₹{bill.bill_amount.toLocaleString('en-IN')}</p>
                  </div>
                  {bill.service_number && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Service Number</p>
                      <p className="font-medium">{bill.service_number}</p>
                    </div>
                  )}
                  {bill.paid && bill.payment_date && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Paid On</p>
                      <p className="font-medium">{format(new Date(bill.payment_date), 'PP')}</p>
                    </div>
                  )}
                </div>

                {!bill.paid && (
                  <Button 
                    className="w-full mt-3" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBill(bill);
                      setPaidAmount(bill.bill_amount.toString());
                      setShowPaymentDialog(true);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && selectedBill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Mark Bill as Paid
              </CardTitle>
              <CardDescription>
                {selectedBill.media_assets?.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Bill Amount</Label>
                <p className="text-2xl font-bold">₹{selectedBill.bill_amount.toLocaleString('en-IN')}</p>
              </div>

              <div>
                <Label htmlFor="paid_amount">Paid Amount</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="Enter paid amount"
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="receipt">Upload Receipt (Optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                {receiptFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {receiptFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedBill(null);
                    setReceiptFile(null);
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleMarkAsPaid}
                  disabled={updating || !paidAmount}
                >
                  {updating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

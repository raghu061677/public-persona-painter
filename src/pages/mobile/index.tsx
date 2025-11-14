import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { db, auth } from "@/lib/supabase-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Briefcase
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
    { id: 'field-app', label: 'Field App', icon: Briefcase, path: '/mobile/field-app' },
    { id: 'upload', label: 'Upload', icon: Camera, path: '/mobile/upload' },
    { id: 'power-bills', label: 'Power Bills', icon: Receipt, path: '/mobile/power-bills' },
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

// Field App Component
function MobileFieldApp() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('tasks');
  
  const [tasks, setTasks] = useState<CampaignAsset[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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

      // Fetch campaigns
      if (tasksData && tasksData.length > 0) {
        const campaignIds = [...new Set(tasksData.map(t => t.campaign_id))];
        const { data: campaignsData, error: campaignsError } = await db
          .from('campaigns')
          .select('*')
          .in('id', campaignIds);

        if (campaignsError) throw campaignsError;
        setCampaigns(campaignsData || []);
      }

      // Cache for offline
      localStorage.setItem("cached_tasks", JSON.stringify(tasksData));
      localStorage.setItem("cached_campaigns", JSON.stringify(campaigns));

      setTasks(tasksData || []);
    } catch (error: any) {
      // Try to load from cache
      const cachedTasks = localStorage.getItem("cached_tasks");
      const cachedCampaigns = localStorage.getItem("cached_campaigns");
      
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
        if (cachedCampaigns) setCampaigns(JSON.parse(cachedCampaigns));
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold">Field Operations</h1>
            <div className="flex items-center gap-2 mt-1">
              {isOnline ? (
                <Badge variant="outline" className="text-green-600">
                  <Zap className="h-3 w-3 mr-1" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600">
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
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 px-4 pb-3">
          <Button
            variant={activeView === 'tasks' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('tasks')}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            My Tasks ({pendingTasks.length})
          </Button>
          <Button
            variant={activeView === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('completed')}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed ({completedTasks.length})
          </Button>
          <Button
            variant={activeView === 'campaigns' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('campaigns')}
            className="flex-1"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Campaigns
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading...</p>
          </div>
        ) : (
          <>
            {activeView === 'tasks' && (
              <>
                {pendingTasks.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">No pending tasks</p>
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
                      <p className="text-muted-foreground">No completed tasks</p>
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
                      <p className="text-muted-foreground">No active campaigns</p>
                    </CardContent>
                  </Card>
                ) : (
                  campaigns.map(campaign => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, campaigns, navigate }: { 
  task: CampaignAsset; 
  campaigns: Campaign[]; 
  navigate: any;
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
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium">{task.media_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Asset ID</p>
            <p className="font-medium">{task.asset_id}</p>
          </div>
        </div>

        {campaign && (
          <div className="text-sm">
            <p className="text-muted-foreground">Campaign</p>
            <p className="font-medium">{campaign.campaign_name}</p>
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
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {task.latitude.toFixed(6)}, {task.longitude.toFixed(6)}
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
function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{campaign.campaign_name}</CardTitle>
            <CardDescription>{campaign.client_name}</CardDescription>
          </div>
          <Badge variant="outline">{campaign.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Start Date</p>
          <p className="font-medium">{format(new Date(campaign.start_date), 'PP')}</p>
        </div>
        <div>
          <p className="text-muted-foreground">End Date</p>
          <p className="font-medium">{format(new Date(campaign.end_date), 'PP')}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile Operations Upload Component
function MobileOperationsUpload() {
  return (
    <div className="min-h-screen bg-background pb-24 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Operations Upload</CardTitle>
          <CardDescription>
            Upload proof photos for campaign operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Camera className="h-16 w-16 mx-auto mb-4" />
            <p>Select a task from Field App to upload photos</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mobile Power Bills View Component
function MobilePowerBillsView() {
  return (
    <div className="min-h-screen bg-background pb-24 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Power Bills</CardTitle>
          <CardDescription>
            View and manage power bills on mobile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-16 w-16 mx-auto mb-4" />
            <p>Power bills management coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

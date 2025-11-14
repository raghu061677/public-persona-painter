import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db, auth } from "@/lib/supabase-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  List, 
  Upload, 
  Zap,
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  MapPin
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

export default function MobileApp() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'tasks';
  
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
      
      if (cachedTasks) setTasks(JSON.parse(cachedTasks));
      if (cachedCampaigns) setCampaigns(JSON.parse(cachedCampaigns));
      
      toast({
        title: "Error Loading Data",
        description: error.message,
        variant: "destructive",
      });
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

  const changeView = (view: string) => {
    setSearchParams({ view });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold">Mobile Operations</h1>
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
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <Tabs value={activeView} onValueChange={changeView} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="tasks">
              <List className="h-4 w-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Camera className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="campaigns">
              <MapPin className="h-4 w-4 mr-2" />
              Campaigns
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="p-4 space-y-4">
        {activeView === 'tasks' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Pending Tasks ({pendingTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTasks.map(task => (
                  <Card key={task.id} className="cursor-pointer hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(task.status)}>
                              {getStatusIcon(task.status)}
                              <span className="ml-1">{task.status}</span>
                            </Badge>
                          </div>
                          <p className="font-medium mt-2">{task.location}</p>
                          <p className="text-sm text-muted-foreground">
                            {task.area}, {task.city}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {task.media_type}
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/admin/mobile/upload?asset=${task.id}`)}
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {pendingTasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No pending tasks
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Completed ({completedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{task.location}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.completed_at ? format(new Date(task.completed_at), 'MMM dd, HH:mm') : 'N/A'}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}

        {activeView === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Photo Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Select a task from the Tasks tab to upload photos
              </p>
            </CardContent>
          </Card>
        )}

        {activeView === 'campaigns' && (
          <div className="space-y-3">
            {campaigns.map(campaign => (
              <Card key={campaign.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{campaign.campaign_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {campaign.client_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(campaign.start_date), 'MMM dd')} - 
                        {format(new Date(campaign.end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge>{campaign.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

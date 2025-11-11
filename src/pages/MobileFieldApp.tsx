import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Camera, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Upload
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

export default function MobileFieldApp() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<CampaignAsset[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setRefreshing(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your tasks",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Fetch all campaign assets assigned to current user or all if admin
      const { data: tasksData, error: tasksError } = await supabase
        .from('campaign_assets')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch associated campaigns
      if (tasksData && tasksData.length > 0) {
        const campaignIds = [...new Set(tasksData.map(t => t.campaign_id))];
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .in('id', campaignIds);

        if (campaignsError) throw campaignsError;
        setCampaigns(campaignsData || []);
      }

      setTasks(tasksData || []);
    } catch (error: any) {
      toast({
        title: "Error Loading Tasks",
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
      case 'Pending':
        return 'bg-yellow-500';
      case 'Assigned':
        return 'bg-blue-500';
      case 'Mounted':
        return 'bg-cyan-500';
      case 'PhotoUploaded':
        return 'bg-green-500';
      case 'Verified':
        return 'bg-emerald-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Pending':
        return <Clock className="h-4 w-4" />;
      case 'Assigned':
      case 'Mounted':
        return <Upload className="h-4 w-4" />;
      case 'PhotoUploaded':
      case 'Verified':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPhotoProgress = (photos: any) => {
    if (!photos) return 0;
    const photoTypes = ['newspaperPhoto', 'geoTaggedPhoto', 'trafficPhoto1', 'trafficPhoto2'];
    const uploaded = photoTypes.filter(type => photos[type]?.url).length;
    return (uploaded / 4) * 100;
  };

  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.campaign_name || campaignId;
  };

  const getClientName = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.client_name || '';
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status === 'Pending' || task.status === 'Assigned' || task.status === 'Mounted';
    if (filter === 'completed') return task.status === 'PhotoUploaded' || task.status === 'Verified';
    return true;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending' || t.status === 'Assigned' || t.status === 'Mounted').length,
    completed: tasks.filter(t => t.status === 'PhotoUploaded' || t.status === 'Verified').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Field Tasks</h1>
              <p className="text-sm opacity-90">Operations Dashboard</p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={fetchTasks}
              disabled={refreshing}
              className="rounded-full"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs opacity-90">Total Tasks</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-xs opacity-90">Pending</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.completed}</div>
              <div className="text-xs opacity-90">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="sticky top-[140px] z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className="flex-1"
            >
              All ({stats.total})
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
              className="flex-1"
            >
              Pending ({stats.pending})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
              className="flex-1"
            >
              Completed ({stats.completed})
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Camera className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter === 'all' ? 'No tasks assigned yet' : `No ${filter} tasks`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const progress = getPhotoProgress(task.photos);
            const photoCount = task.photos 
              ? Object.values(task.photos).filter((p: any) => p?.url).length 
              : 0;

            return (
              <Card 
                key={task.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/mobile/upload/${task.campaign_id}/${task.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(task.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(task.status)}
                            {task.status}
                          </span>
                        </Badge>
                      </div>
                      <CardTitle className="text-base line-clamp-1">
                        {getCampaignName(task.campaign_id)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {getClientName(task.campaign_id)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.asset_id}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {task.location}, {task.area}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.media_type} • {task.city}
                      </p>
                    </div>
                  </div>

                  {/* Photo Progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Photo Upload Progress</span>
                      <span className="font-medium">{photoCount}/4</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Action Button */}
                  <Button 
                    className="w-full"
                    variant={progress === 100 ? 'outline' : 'default'}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    {progress === 0 ? 'Start Upload' : progress === 100 ? 'View Photos' : 'Continue Upload'}
                  </Button>

                  {/* Metadata */}
                  {task.assigned_at && (
                    <p className="text-xs text-muted-foreground">
                      Assigned: {format(new Date(task.assigned_at), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

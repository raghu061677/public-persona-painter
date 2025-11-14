import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { 
  Activity, 
  FileText, 
  Users, 
  Image, 
  DollarSign, 
  Calendar,
  RefreshCw,
  Eye,
  Edit,
  Trash,
  Upload,
  Download,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getActionIcon = (action: string) => {
  switch (action) {
    case 'view':
      return <Eye className="h-4 w-4" />;
    case 'create':
      return <Upload className="h-4 w-4" />;
    case 'edit':
      return <Edit className="h-4 w-4" />;
    case 'delete':
      return <Trash className="h-4 w-4" />;
    case 'export':
      return <Download className="h-4 w-4" />;
    case 'approve':
      return <CheckCircle className="h-4 w-4" />;
    case 'reject':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'media_asset':
      return <Image className="h-4 w-4" />;
    case 'client':
      return <Users className="h-4 w-4" />;
    case 'plan':
      return <FileText className="h-4 w-4" />;
    case 'campaign':
      return <Calendar className="h-4 w-4" />;
    case 'invoice':
      return <DollarSign className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case 'create':
      return 'bg-primary/10 text-primary';
    case 'edit':
      return 'bg-accent/10 text-accent';
    case 'delete':
      return 'bg-destructive/10 text-destructive';
    case 'approve':
      return 'bg-emerald-500/10 text-emerald-700';
    case 'reject':
      return 'bg-orange-500/10 text-orange-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function ActivityFeedWidget() {
  const { activities, loading, filter, setFilter, refetch } = useActivityFeed(50);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Loading recent activities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>Real-time system activities and updates</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="pt-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="media_asset">Media Assets</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
              <SelectItem value="plan">Plans</SelectItem>
              <SelectItem value="campaign">Campaigns</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activities found</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {getResourceIcon(activity.resource_type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getActionColor(activity.action)}>
                          {getActionIcon(activity.action)}
                          <span className="ml-1 capitalize">{activity.action}</span>
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {activity.resource_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">
                      {activity.user_name || 'System'}
                    </p>
                    {activity.resource_name && (
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.resource_name}
                      </p>
                    )}
                    {activity.details && Object.keys(activity.details).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {Object.entries(activity.details).slice(0, 2).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key.replace('_', ' ')}:</span>{' '}
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

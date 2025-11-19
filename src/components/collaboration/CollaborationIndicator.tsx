import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';

interface CollaborationIndicatorProps {
  resourceId: string;
  resourceType: 'plan' | 'campaign' | 'invoice' | 'asset';
}

export function CollaborationIndicator({ resourceId, resourceType }: CollaborationIndicatorProps) {
  const { activeUsers, isConnected } = useRealtimeCollaboration({
    channelName: `${resourceType}-${resourceId}`,
    resourceId,
    resourceType,
  });

  if (!isConnected || activeUsers.length <= 1) {
    return null;
  }

  const otherUsers = activeUsers.filter(
    (user) => user.user_id !== activeUsers.find((u) => u.user_id)?.user_id
  );

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="gap-2">
        <Users className="h-3 w-3" />
        {otherUsers.length} viewing
      </Badge>
      <div className="flex -space-x-2">
        {otherUsers.slice(0, 3).map((user) => (
          <TooltipProvider key={user.user_id}>
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">
                  Viewing since {new Date(user.online_at).toLocaleTimeString()}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {otherUsers.length > 3 && (
          <Avatar className="h-8 w-8 border-2 border-background">
            <AvatarFallback className="bg-muted text-xs">
              +{otherUsers.length - 3}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

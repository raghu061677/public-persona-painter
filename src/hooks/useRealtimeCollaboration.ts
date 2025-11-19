import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface CollaborationUser {
  user_id: string;
  name: string;
  email: string;
  online_at: string;
  cursor_position?: { x: number; y: number };
  current_resource?: string;
}

interface UseRealtimeCollaborationOptions {
  channelName: string;
  resourceId?: string;
  resourceType?: 'plan' | 'campaign' | 'invoice' | 'asset';
  onUserJoin?: (user: CollaborationUser) => void;
  onUserLeave?: (userId: string) => void;
  onUserUpdate?: (user: CollaborationUser) => void;
}

export function useRealtimeCollaboration({
  channelName,
  resourceId,
  resourceType,
  onUserJoin,
  onUserLeave,
  onUserUpdate,
}: UseRealtimeCollaborationOptions) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let currentUserId: string | undefined;

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;

      const room = supabase.channel(channelName, {
        config: {
          presence: {
            key: 'user_id',
          },
        },
      });

      room
        .on('presence', { event: 'sync' }, () => {
          const state = room.presenceState();
          const users: CollaborationUser[] = [];
          Object.values(state).forEach((presences) => {
            presences.forEach((presence: any) => {
              if (presence.user_id && presence.email && presence.online_at) {
                users.push(presence as CollaborationUser);
              }
            });
          });
          setActiveUsers(users);
          setIsConnected(true);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          newPresences.forEach((presence: any) => {
            if (presence.user_id && presence.email) {
              const user = presence as CollaborationUser;
              onUserJoin?.(user);
              if (user.user_id !== currentUserId) {
                toast({
                  title: 'User joined',
                  description: `${user.name || user.email} is now viewing this ${resourceType || 'resource'}`,
                });
              }
            }
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          leftPresences.forEach((presence: any) => {
            if (presence.user_id && presence.email) {
              const user = presence as CollaborationUser;
              onUserLeave?.(user.user_id);
              if (user.user_id !== currentUserId) {
                toast({
                  title: 'User left',
                  description: `${user.name || user.email} stopped viewing this ${resourceType || 'resource'}`,
                });
              }
            }
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && user) {
            const userStatus: CollaborationUser = {
              user_id: user.id,
              name: user.user_metadata?.name || '',
              email: user.email || '',
              online_at: new Date().toISOString(),
              current_resource: resourceId,
            };
            await room.track(userStatus);
          }
        });

      setChannel(room);
    };

    setupChannel();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [channelName, resourceId, resourceType]);

  const updatePresence = async (updates: Partial<CollaborationUser>) => {
    if (channel) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const currentState = channel.presenceState();
        const presences = currentState[user.id] || [];
        let myPresence: CollaborationUser | undefined;

        for (const p of presences) {
          const pres = p as any;
          if (pres.user_id === user.id) {
            myPresence = pres as CollaborationUser;
            break;
          }
        }

        await channel.track({
          ...myPresence,
          ...updates,
          user_id: user.id,
          online_at: new Date().toISOString(),
        });
      }
    }
  };

  const broadcastEvent = (event: string, payload: any) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  };

  return {
    activeUsers,
    isConnected,
    updatePresence,
    broadcastEvent,
    channel,
  };
}

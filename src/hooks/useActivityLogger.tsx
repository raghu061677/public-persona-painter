import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useActivityLogger() {
  const { user } = useAuth();

  const logActivity = async (
    activityType: string,
    description?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase.rpc('log_user_activity', {
        p_user_id: user.id,
        p_activity_type: activityType,
        p_activity_description: description,
        p_metadata: metadata || {},
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  // Auto-log page views
  useEffect(() => {
    if (user) {
      const path = window.location.pathname;
      logActivity('page_view', `Viewed ${path}`, { path });
    }
  }, [window.location.pathname, user]);

  return { logActivity };
}

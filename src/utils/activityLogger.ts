import { supabase } from '@/integrations/supabase/client';

export type ActivityAction = 
  | 'create'
  | 'view'
  | 'edit'
  | 'delete'
  | 'export'
  | 'approve'
  | 'reject'
  | 'upload'
  | 'download';

export type ResourceType = 
  | 'media_asset'
  | 'client'
  | 'plan'
  | 'campaign'
  | 'invoice'
  | 'expense'
  | 'operation_photo'
  | 'booking_request'
  | 'user';

export async function logActivity(
  action: ActivityAction,
  resourceType: ResourceType,
  resourceId?: string,
  resourceName?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    await supabase.rpc('log_activity', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_resource_name: resourceName,
      p_details: details || {},
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

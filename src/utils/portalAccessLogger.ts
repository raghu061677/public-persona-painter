import { supabase } from '@/integrations/supabase/client';

export async function logPortalAccess(
  clientId: string,
  action: 'login' | 'view_campaign' | 'view_invoice' | 'view_proof' | 'download_proof' | 'download_invoice' | 'logout',
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase
      .from('client_portal_access_logs' as any)
      .insert({
        client_id: clientId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata || {},
      });
  } catch (error) {
    console.error('Failed to log portal access:', error);
  }
}

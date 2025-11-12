import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | 'export_data'
  | 'view_vendor'
  | 'update_vendor'
  | 'delete_vendor'
  | 'generate_id'
  | 'role_change'
  | 'bulk_delete'
  | 'bulk_update'
  | 'document_upload'
  | 'document_download'
  | 'document_delete'
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'invite_user'
  | 'change_permissions';

export type ResourceType = 
  | 'media_asset'
  | 'client'
  | 'plan'
  | 'campaign'
  | 'invoice'
  | 'expense'
  | 'vendor'
  | 'user_role'
  | 'export'
  | 'client_documents'
  | 'user_management';

interface AuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

export async function logAudit({
  action,
  resourceType,
  resourceId,
  details = {},
}: AuditLogParams): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_audit' as any, {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
    });

    if (error) {
      console.error('Failed to log audit:', error);
    }
  } catch (err) {
    console.error('Error logging audit:', err);
  }
}

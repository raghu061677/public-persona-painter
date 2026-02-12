// supabase/functions/upload-operation-photo/index.ts
// v2.0 - Phase-3 Security: User-scoped + ops role enforcement + audit logging

import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  requireCompanyMatch,
  logSecurityAudit,
  supabaseUserClient,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

const REQUIRED_PHOTO_TYPES = ['geo', 'newspaper', 'traffic1', 'traffic2'];

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'ops']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid request body', 400);

  const { operation_id, photo_type, file_data, file_name } = body;

  if (!operation_id || typeof operation_id !== 'string') return jsonError('operation_id is required', 400);
  if (!REQUIRED_PHOTO_TYPES.includes(photo_type)) {
    return jsonError('Invalid photo type. Must be one of: geo, newspaper, traffic1, traffic2', 400);
  }
  if (!file_data || typeof file_data !== 'string') return jsonError('file_data is required', 400);
  if (!file_name || typeof file_name !== 'string') return jsonError('file_name is required', 400);

  console.log('Uploading operation photo:', { operation_id, photo_type });

  // Service client needed for storage and cross-table operations
  const serviceClient = supabaseServiceClient();

  // Fetch operation to verify access
  const { data: operation, error: opError } = await serviceClient
    .from('operations')
    .select('*, campaigns!inner(company_id)')
    .eq('id', operation_id)
    .single();

  if (opError || !operation) {
    return jsonError('Operation not found', 404);
  }

  // Verify operation belongs to user's company
  requireCompanyMatch(ctx, operation.campaigns.company_id);

  // Decode base64 file data
  const base64Data = file_data.split(',')[1] || file_data;
  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  // Upload to storage
  const storagePath = `operations/${operation.campaign_id}/${operation_id}/${photo_type}-${Date.now()}.jpg`;
  const { error: uploadError } = await serviceClient.storage
    .from('campaign-proofs')
    .upload(storagePath, binaryData, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    return jsonError(`Upload failed: ${uploadError.message}`, 500);
  }

  const { data: urlData } = serviceClient.storage
    .from('campaign-proofs')
    .getPublicUrl(storagePath);

  // Insert photo record
  const { error: insertError } = await serviceClient
    .from('operation_photos')
    .insert({
      operation_id,
      photo_type,
      file_path: urlData.publicUrl,
      file_name,
      uploaded_by: ctx.userId,
    });

  if (insertError) {
    return jsonError(`Failed to save photo record: ${insertError.message}`, 500);
  }

  // Log timeline event
  try {
    await serviceClient.functions.invoke('add-timeline-event', {
      body: {
        campaign_id: operation.campaign_id,
        company_id: operation.campaigns.company_id,
        event_type: 'photo_uploaded',
        event_title: 'Proof Photo Uploaded',
        event_description: `${photo_type.charAt(0).toUpperCase() + photo_type.slice(1)} photo uploaded`,
        created_by: ctx.userId,
        metadata: { photo_type, operation_id },
      },
    });
  } catch (e) {
    console.warn('Timeline event failed:', e);
  }

  // Check if all 4 photos are uploaded
  const { data: allPhotos } = await serviceClient
    .from('operation_photos')
    .select('photo_type')
    .eq('operation_id', operation_id);

  const uploadedTypes = new Set(allPhotos?.map(p => p.photo_type) || []);
  const allPhotosUploaded = REQUIRED_PHOTO_TYPES.every(type => uploadedTypes.has(type));

  if (allPhotosUploaded && operation.status !== 'Completed' && operation.status !== 'Verified') {
    await serviceClient.from('operations')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('id', operation_id);

    await serviceClient.from('campaign_assets')
      .update({ status: 'Completed', completed_at: new Date().toISOString() })
      .eq('campaign_id', operation.campaign_id)
      .eq('asset_id', operation.asset_id);

    try {
      await serviceClient.functions.invoke('add-timeline-event', {
        body: {
          campaign_id: operation.campaign_id,
          company_id: operation.campaigns.company_id,
          event_type: 'operations_completed',
          event_title: 'Installation Completed',
          event_description: 'All proof photos uploaded and installation marked complete',
          created_by: ctx.userId,
          metadata: { operation_id },
        },
      });
    } catch (e) {
      console.warn('Timeline event failed:', e);
    }
  }

  await logSecurityAudit({
    functionName: 'upload-operation-photo', userId: ctx.userId,
    companyId: ctx.companyId, action: 'upload_photo',
    recordIds: [operation_id], req,
    metadata: { photo_type, all_complete: allPhotosUploaded },
  });

  return jsonSuccess({
    success: true,
    file_path: urlData.publicUrl,
    all_photos_uploaded: allPhotosUploaded,
    status_updated: allPhotosUploaded,
  });
}));

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  operation_id: string;
  photo_type: 'geo' | 'newspaper' | 'traffic1' | 'traffic2';
  file_data: string; // base64 encoded
  file_name: string;
}

const REQUIRED_PHOTO_TYPES = ['geo', 'newspaper', 'traffic1', 'traffic2'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation_id, photo_type, file_data, file_name } = await req.json() as RequestBody;

    console.log('Uploading operation photo:', { operation_id, photo_type });

    // Validate photo type
    if (!REQUIRED_PHOTO_TYPES.includes(photo_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid photo type. Must be one of: geo, newspaper, traffic1, traffic2' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch operation to verify access
    const { data: operation, error: opError } = await supabase
      .from('operations')
      .select('*, campaigns!inner(company_id)')
      .eq('id', operation_id)
      .single();

    if (opError || !operation) {
      throw new Error('Operation not found');
    }

    // Verify user access to company
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', operation.campaigns.company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 file data
    const base64Data = file_data.split(',')[1] || file_data;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const storagePath = `operations/${operation.campaign_id}/${operation_id}/${photo_type}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('campaign-proofs')
      .upload(storagePath, binaryData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('campaign-proofs')
      .getPublicUrl(storagePath);

    // Insert photo record
    const { error: insertError } = await supabase
      .from('operation_photos')
      .insert({
        operation_id,
        photo_type,
        file_path: urlData.publicUrl,
        file_name,
        uploaded_by: user.id,
      });

    if (insertError) {
      throw insertError;
    }

    // Check if all 4 photos are uploaded
    const { data: allPhotos } = await supabase
      .from('operation_photos')
      .select('photo_type')
      .eq('operation_id', operation_id);

    const uploadedTypes = new Set(allPhotos?.map(p => p.photo_type) || []);
    const allPhotosUploaded = REQUIRED_PHOTO_TYPES.every(type => uploadedTypes.has(type));

    // Update operation status if all photos uploaded
    if (allPhotosUploaded && operation.status !== 'Completed' && operation.status !== 'Verified') {
      await supabase
        .from('operations')
        .update({ 
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', operation_id);

      // Also update campaign_assets status
      await supabase
        .from('campaign_assets')
        .update({ 
          status: 'Completed',
          completed_at: new Date().toISOString(),
        })
        .eq('campaign_id', operation.campaign_id)
        .eq('asset_id', operation.asset_id);
    }

    console.log('Photo uploaded successfully:', storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        file_path: urlData.publicUrl,
        all_photos_uploaded: allPhotosUploaded,
        status_updated: allPhotosUploaded,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error uploading operation photo:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to upload photo',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

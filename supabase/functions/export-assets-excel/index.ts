import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  company_id: string;
  filters?: {
    city?: string;
    media_type?: string;
    status?: string;
    is_public?: boolean;
  };
}

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

    const { company_id, filters = {} } = await req.json() as RequestBody;

    console.log('Exporting assets for company:', company_id);

    // Verify user access
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query with filters
    let query = supabase
      .from('media_assets')
      .select('*')
      .eq('company_id', company_id);

    if (filters.city) {
      query = query.eq('city', filters.city);
    }
    if (filters.media_type) {
      query = query.eq('media_type', filters.media_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.is_public !== undefined) {
      query = query.eq('is_public', filters.is_public);
    }

    const { data: assets, error: assetsError } = await query.order('city', { ascending: true });

    if (assetsError) {
      throw assetsError;
    }

    // Generate CSV
    const csvRows = [];
    
    // Header
    csvRows.push([
      'Asset ID',
      'City',
      'Area',
      'Location',
      'Media Type',
      'Dimension',
      'Total Sq Ft',
      'Facing',
      'Status',
      'Card Rate',
      'Base Rate',
      'Printing Charge',
      'Mounting Charge',
      'Latitude',
      'Longitude',
      'Municipal ID',
      'Municipal Authority',
      'Is Public',
      'Zone',
      'Sub Zone',
      'QR Code URL',
      'Google Street View',
    ].join(','));

    // Data rows
    for (const asset of assets || []) {
      csvRows.push([
        asset.id,
        asset.city || '',
        asset.area || '',
        `"${(asset.location || '').replace(/"/g, '""')}"`,
        asset.media_type || '',
        asset.dimension || '',
        asset.total_sqft || '',
        asset.facing || '',
        asset.status || '',
        (asset.card_rate || 0).toFixed(2),
        (asset.base_rate || 0).toFixed(2),
        (asset.printing_charge || 0).toFixed(2),
        (asset.mounting_charge || 0).toFixed(2),
        asset.latitude || '',
        asset.longitude || '',
        asset.municipal_id || '',
        asset.municipal_authority || '',
        asset.is_public ? 'Yes' : 'No',
        asset.zone || '',
        asset.sub_zone || '',
        asset.qr_code_url || '',
        asset.google_street_view_url || '',
      ].join(','));
    }

    const csvContent = csvRows.join('\n');
    const csvBuffer = new TextEncoder().encode(csvContent);

    // Upload to storage
    const fileName = `assets-export-${company_id}-${Date.now()}.csv`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, csvBuffer, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get signed URL
    const { data: urlData } = await supabase.storage
      .from('client-documents')
      .createSignedUrl(fileName, 3600);

    console.log('Assets export generated successfully:', fileName);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData?.signedUrl,
        fileName,
        assetCount: assets?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error exporting assets:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to export assets',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  campaign_id: string;
  company_id: string;
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

    const { campaign_id, company_id } = await req.json() as RequestBody;

    console.log('Generating proof PPT JSON for campaign:', campaign_id);

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

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Fetch company details
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', company_id)
      .single();

    // Fetch client name
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', campaign.client_id)
      .single();

    // Fetch timeline events
    const { data: timelineEvents } = await supabase
      .from('campaign_timeline')
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('created_at', { ascending: true });

    // Fetch campaign assets with all required snapshot fields
    const { data: campaignAssets } = await supabase
      .from('campaign_assets')
      .select(`
        *,
        media_assets!inner(
          id,
          google_street_view_url,
          qr_code_url
        )
      `)
      .eq('campaign_id', campaign_id);

    // Fetch operation photos for each asset
    const assetIds = campaignAssets?.map(a => a.asset_id) || [];
    const { data: operationPhotos } = await supabase
      .from('operation_photos')
      .select('*')
      .in('asset_id', assetIds)
      .order('created_at', { ascending: false });

    // Group photos by asset
    const photosByAsset = new Map();
    operationPhotos?.forEach((photo: any) => {
      if (!photosByAsset.has(photo.asset_id)) {
        photosByAsset.set(photo.asset_id, []);
      }
      photosByAsset.get(photo.asset_id).push(photo);
    });

    // Build JSON response with all data
    const assetsData = campaignAssets?.map(asset => {
      const photos = photosByAsset.get(asset.asset_id) || [];
      const photoMap = {
        newspaper: photos.find((p: any) => p.photo_type === 'newspaper')?.file_path || null,
        geo: photos.find((p: any) => p.photo_type === 'geo')?.file_path || null,
        traffic_left: photos.find((p: any) => p.photo_type === 'traffic1')?.file_path || null,
        traffic_right: photos.find((p: any) => p.photo_type === 'traffic2')?.file_path || null,
      };

      const googleStreetViewUrl = asset.media_assets?.google_street_view_url || null;
      const googleStreetViewQrUrl = googleStreetViewUrl 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(googleStreetViewUrl)}`
        : null;

      return {
        asset_id: asset.asset_id,
        asset_code: asset.asset_id,
        media_type: asset.media_type,
        direction: asset.direction,
        illumination_type: asset.illumination_type,
        dimensions: asset.dimensions,
        total_sqft: asset.total_sqft,
        area: asset.area,
        city: asset.city,
        location: asset.location,
        latitude: asset.latitude,
        longitude: asset.longitude,
        google_street_view_url: googleStreetViewUrl,
        google_street_view_qr_url: googleStreetViewQrUrl,
        qr_code_url: asset.media_assets?.qr_code_url || null,
        photos: photoMap,
        installed_at: asset.completed_at,
        installation_status: asset.installation_status,
        mounter_name: asset.mounter_name,
        map_thumbnail_url: asset.latitude && asset.longitude
          ? `https://maps.googleapis.com/maps/api/staticmap?center=${asset.latitude},${asset.longitude}&zoom=17&size=400x300&markers=color:red%7C${asset.latitude},${asset.longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
          : null,
      };
    }) || [];

    // Calculate summary
    const totalAssets = assetsData.length;
    const completedAssets = assetsData.filter(a => a.installation_status === 'Completed').length;
    const totalPhotos = assetsData.reduce((sum, a) => {
      return sum + Object.values(a.photos).filter(p => p !== null).length;
    }, 0);

    // City-wise distribution
    const cityDistribution = assetsData.reduce((acc, a) => {
      acc[a.city] = (acc[a.city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Asset type distribution
    const typeDistribution = assetsData.reduce((acc, a) => {
      acc[a.media_type] = (acc[a.media_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const responseData = {
      campaign: {
        id: campaign.id,
        name: campaign.campaign_name,
        client_name: client?.name || 'Unknown Client',
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        status: campaign.status,
        public_tracking_token: campaign.public_tracking_token,
      },
      company: {
        name: company?.name || 'Go-Ads 360°',
        logo_url: company?.logo_url || null,
      },
      summary: {
        total_assets: totalAssets,
        completed_assets: completedAssets,
        pending_assets: totalAssets - completedAssets,
        total_photos: totalPhotos,
        city_distribution: cityDistribution,
        type_distribution: typeDistribution,
      },
      timeline_events: timelineEvents?.map(e => ({
        event_type: e.event_type,
        event_title: e.event_title,
        event_description: e.event_description,
        event_time: e.event_time || e.created_at,
        created_by: e.created_by,
      })) || [],
      assets: assetsData,
    };

    console.log('Proof PPT JSON generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating proof PPT JSON:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate PPT data',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    // Use LEFT JOIN to get media_assets data for QR codes, but prefer campaign_assets snapshot data
    const { data: campaignAssets, error: assetsError } = await supabase
      .from('campaign_assets')
      .select(`
        *,
        media_assets(
          id,
          media_asset_code,
          google_street_view_url,
          qr_code_url
        )
      `)
      .eq('campaign_id', campaign_id);

    if (assetsError) {
      console.error('Error fetching campaign assets:', assetsError);
    }

    console.log('Found campaign assets:', campaignAssets?.length || 0);

    // Build JSON response with all data
    const assetsData = campaignAssets?.map(asset => {
      // Get photos from campaign_assets.photos jsonb field
      // Photos may be stored as:
      // - Specific types: newspaper, geo, traffic1, traffic2
      // - Or numbered: photo_1, photo_2, photo_3, photo_4
      const photosObj = (asset.photos || {}) as Record<string, string>;
      
      // Try specific photo type keys first, fall back to numbered keys
      const photoMap = {
        newspaper: photosObj.newspaper || photosObj.photo_1 || null,
        geo: photosObj.geo || photosObj.geotag || photosObj.photo_2 || null,
        traffic_left: photosObj.traffic1 || photosObj.traffic_left || photosObj.photo_3 || null,
        traffic_right: photosObj.traffic2 || photosObj.traffic_right || photosObj.photo_4 || null,
      };

      // Use campaign_assets snapshot data (single source of truth)
      // Only fall back to media_assets for QR codes
      const googleStreetViewUrl = asset.media_assets?.google_street_view_url || null;
      const googleStreetViewQrUrl = googleStreetViewUrl 
        ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(googleStreetViewUrl)}`
        : null;

      // Use media_asset_code from media_assets table for proper display code
      const displayCode = asset.media_assets?.media_asset_code || asset.asset_id;

      return {
        asset_id: asset.asset_id,
        asset_code: displayCode, // Use media_asset_code from media_assets table
        media_type: asset.media_type || 'Unknown',
        direction: asset.direction || 'N/A',
        illumination_type: asset.illumination_type || 'N/A',
        dimensions: asset.dimensions || 'N/A',
        total_sqft: asset.total_sqft || 0,
        area: asset.area || 'Unknown',
        city: asset.city || 'Unknown',
        location: asset.location || 'Unknown',
        latitude: asset.latitude || null,
        longitude: asset.longitude || null,
        google_street_view_url: googleStreetViewUrl,
        google_street_view_qr_url: googleStreetViewQrUrl,
        qr_code_url: asset.media_assets?.qr_code_url || null,
        photos: photoMap,
        installed_at: asset.completed_at || asset.assigned_at,
        installation_status: asset.installation_status || asset.status || 'Pending',
        mounter_name: asset.mounter_name || 'Not Assigned',
        status: asset.status || 'Pending',
        map_thumbnail_url: asset.latitude && asset.longitude
          ? `https://maps.googleapis.com/maps/api/staticmap?center=${asset.latitude},${asset.longitude}&zoom=17&size=400x300&markers=color:red%7C${asset.latitude},${asset.longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
          : null,
      };
    }) || [];

    // Calculate summary - use both status and installation_status
    const totalAssets = assetsData.length;
    const completedAssets = assetsData.filter(a => 
      a.status === 'Verified' || 
      a.status === 'Completed' || 
      a.installation_status === 'Completed' ||
      a.installation_status === 'Verified'
    ).length;
    const installedAssets = assetsData.filter(a => 
      a.status === 'Installed' || 
      a.installation_status === 'Installed'
    ).length;
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

// v2.0 - Phase-6 Security: withAuth + getAuthContext + tenant isolation
import {
  getAuthContext, requireRole, requireCompanyMatch, logSecurityAudit,
  supabaseServiceClient, jsonError, jsonSuccess, withAuth,
} from '../_shared/auth.ts';

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales', 'ops']);

  const body = await req.json().catch(() => null);
  if (!body?.campaign_id || typeof body.campaign_id !== 'string') {
    return jsonError('campaign_id is required', 400);
  }
  const { campaign_id } = body;

  // Use company_id from auth context, NEVER from body
  const company_id = ctx.companyId;

  const serviceClient = supabaseServiceClient();

  const { data: campaign, error: campaignError } = await serviceClient
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single();

  if (campaignError || !campaign) {
    return jsonError('Campaign not found', 404);
  }

  requireCompanyMatch(ctx, campaign.company_id);

  const { data: company } = await serviceClient
    .from('companies')
    .select('name, logo_url')
    .eq('id', company_id)
    .single();

  const { data: client } = await serviceClient
    .from('clients')
    .select('name')
    .eq('id', campaign.client_id)
    .single();

  const { data: timelineEvents } = await serviceClient
    .from('campaign_timeline')
    .select('*')
    .eq('campaign_id', campaign_id)
    .order('created_at', { ascending: true });

  const { data: campaignAssets, error: assetsError } = await serviceClient
    .from('campaign_assets')
    .select(`
      *,
      media_assets(id, media_asset_code, google_street_view_url, qr_code_url)
    `)
    .eq('campaign_id', campaign_id);

  if (assetsError) console.error('Error fetching campaign assets:', assetsError);

  const assetsData = campaignAssets?.map(asset => {
    const photosObj = (asset.photos || {}) as Record<string, string>;
    const photoMap = {
      newspaper: photosObj.newspaper || photosObj.photo_1 || null,
      geo: photosObj.geo || photosObj.geotag || photosObj.photo_2 || null,
      traffic_left: photosObj.traffic1 || photosObj.traffic_left || photosObj.photo_3 || null,
      traffic_right: photosObj.traffic2 || photosObj.traffic_right || photosObj.photo_4 || null,
    };

    const googleStreetViewUrl = asset.media_assets?.google_street_view_url || null;
    const googleStreetViewQrUrl = googleStreetViewUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(googleStreetViewUrl)}`
      : null;
    const displayCode = asset.media_assets?.media_asset_code || asset.asset_id;

    return {
      asset_id: asset.asset_id,
      asset_code: displayCode,
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
      map_thumbnail_url: null, // Removed hardcoded API key
    };
  }) || [];

  const totalAssets = assetsData.length;
  const completedAssets = assetsData.filter(a =>
    ['Verified', 'Completed'].includes(a.status) || ['Completed', 'Verified'].includes(a.installation_status)
  ).length;
  const totalPhotos = assetsData.reduce((sum, a) => sum + Object.values(a.photos).filter(p => p !== null).length, 0);

  const cityDistribution = assetsData.reduce((acc, a) => {
    acc[a.city] = (acc[a.city] || 0) + 1; return acc;
  }, {} as Record<string, number>);

  const typeDistribution = assetsData.reduce((acc, a) => {
    acc[a.media_type] = (acc[a.media_type] || 0) + 1; return acc;
  }, {} as Record<string, number>);

  await logSecurityAudit({
    functionName: 'generate-proof-ppt-v2', userId: ctx.userId,
    companyId: ctx.companyId, action: 'generate_proof_ppt',
    recordIds: [campaign_id], status: 'success', req,
    metadata: { assetCount: totalAssets },
  });

  return jsonSuccess({
    success: true,
    data: {
      campaign: {
        id: campaign.id, name: campaign.campaign_name,
        client_name: client?.name || 'Unknown Client',
        start_date: campaign.start_date, end_date: campaign.end_date,
        status: campaign.status, public_tracking_token: campaign.public_tracking_token,
      },
      company: { name: company?.name || 'Go-Ads 360°', logo_url: company?.logo_url || null },
      summary: {
        total_assets: totalAssets, completed_assets: completedAssets,
        pending_assets: totalAssets - completedAssets, total_photos: totalPhotos,
        city_distribution: cityDistribution, type_distribution: typeDistribution,
      },
      timeline_events: timelineEvents?.map(e => ({
        event_type: e.event_type, event_title: e.event_title,
        event_description: e.event_description,
        event_time: e.event_time || e.created_at, created_by: e.created_by,
      })) || [],
      assets: assetsData,
    },
  });
}));

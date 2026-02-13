/**
 * create-direct-campaign — Phase-5 hardened
 * Roles: admin only (company-scoped)
 * Service-role used for: campaign ID generation RPC, cross-table inserts
 */
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  withAuth,
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError,
  jsonSuccess,
} from '../_shared/auth.ts';

interface AssetItem {
  asset_id: string;
  display_from: string;
  display_to: string;
  sales_price: number;
  printing_cost: number;
  mounting_cost: number;
  negotiated_price?: number;
}

serve(withAuth(async (req) => {
  if (req.method !== 'POST') return jsonError('Method not allowed', 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin']);

  const body = await req.json().catch(() => null);
  if (!body) return jsonError('Invalid request body', 400);

  const {
    client_id,
    campaign_name,
    start_date,
    end_date,
    notes,
    status = 'Draft',
    is_historical_entry = false,
    gst_type = 'gst',
    gst_percent: custom_gst_percent,
    assets,
    auto_assign = false,
  } = body;

  // Validate required fields
  if (!campaign_name || typeof campaign_name !== 'string') return jsonError('Missing campaign_name', 400);
  if (!client_id || typeof client_id !== 'string') return jsonError('Missing client_id', 400);
  if (!start_date || !end_date) return jsonError('Missing start_date or end_date', 400);
  if (!Array.isArray(assets) || assets.length === 0) return jsonError('Assets array is required and must not be empty', 400);

  // Company scoped from JWT
  const companyId = ctx.companyId;

  // Use service client for cross-table operations
  const supabase = supabaseServiceClient();

  console.log(`[create-direct-campaign] ${campaign_name}, company=${companyId}, by=${ctx.userId}`);

  // Verify client belongs to company
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('name, company_id')
    .eq('id', client_id)
    .single();

  if (clientErr || !client) return jsonError('Client not found', 404);
  if (client.company_id !== companyId) return jsonError('Client does not belong to your company', 403);

  // Check asset conflicts (skip for historical)
  if (!is_historical_entry) {
    for (const asset of assets as AssetItem[]) {
      const { data: conflicts } = await supabase.rpc('check_asset_conflict', {
        p_asset_id: asset.asset_id,
        p_start_date: start_date,
        p_end_date: end_date,
        p_exclude_campaign_id: null,
      });
      if (conflicts && conflicts.has_conflict) {
        return jsonError(`Asset ${asset.asset_id} already booked for overlapping period`, 409);
      }
    }
  }

  // Generate campaign code using v2 format: CAM-YYYYMM-####
  let campaign_code: string;
  const { data: codeData, error: codeError } = await supabase.rpc('generate_campaign_id_v2', {
    p_user_id: null,
  });

  if (codeData && !codeError) {
    campaign_code = codeData;
  } else {
    // Fallback: generate CAM-YYYYMM-#### client-side
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const period = `${year}${month}`;
    const prefix = `CAM-${period}-`;
    const { data: existing } = await supabase
      .from('campaigns')
      .select('id')
      .like('id', `${prefix}%`)
      .order('id', { ascending: false })
      .limit(1);
    let nextSeq = 1;
    if (existing?.length) {
      const match = existing[0].id.match(/CAM-\d{6}-(\d+)$/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }
    campaign_code = `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  // Calculate totals
  let subtotal = 0, printing_total = 0, mounting_total = 0;
  (assets as AssetItem[]).forEach(a => {
    subtotal += a.negotiated_price || a.sales_price;
    printing_total += a.printing_cost;
    mounting_total += a.mounting_cost;
  });
  subtotal = Math.round(subtotal * 100) / 100;
  printing_total = Math.round(printing_total * 100) / 100;
  mounting_total = Math.round(mounting_total * 100) / 100;
  const total_amount = Math.round((subtotal + printing_total + mounting_total) * 100) / 100;
  const gst_percent = custom_gst_percent !== undefined ? custom_gst_percent : 18;
  const gst_amount = Math.round((total_amount * (gst_percent / 100)) * 100) / 100;
  const grand_total = Math.round((total_amount + gst_amount) * 100) / 100;

  let campaign_status = status;
  if (is_historical_entry && status === 'Draft') campaign_status = 'Completed';

  // Insert campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      id: campaign_code,
      campaign_code: campaign_code,
      company_id: companyId,
      client_id,
      client_name: client.name,
      campaign_name,
      start_date,
      end_date,
      notes,
      status: campaign_status,
      is_historical_entry,
      total_assets: assets.length,
      total_amount,
      gst_percent,
      gst_amount,
      grand_total,
      subtotal,
      printing_total,
      mounting_total,
      created_from: is_historical_entry ? 'historical' : 'direct',
      plan_id: null,
      created_by: ctx.userId,
      public_share_enabled: true,
    })
    .select()
    .single();

  if (campaignError) {
    console.error('[create-direct-campaign] Error:', campaignError);
    return jsonError(campaignError.message, 500);
  }

  // Fetch asset details
  const assetIds = (assets as AssetItem[]).map(a => a.asset_id);
  const { data: assetDetails } = await supabase
    .from('media_assets')
    .select('id, location, city, area, media_type, latitude, longitude, company_id')
    .in('id', assetIds);

  // Verify all assets belong to same company
  const foreignAssets = assetDetails?.filter(a => a.company_id !== companyId);
  if (foreignAssets && foreignAssets.length > 0) {
    return jsonError('Some assets do not belong to your company', 403);
  }

  const assetMap = new Map(assetDetails?.map(a => [a.id, a]) || []);
  const BILLING_CYCLE_DAYS = 30;
  const assetStatus = is_historical_entry ? 'Verified' : 'Pending';

  const campaignAssets = (assets as AssetItem[]).map(asset => {
    const detail = assetMap.get(asset.asset_id);
    if (!detail) throw new Error(`Asset ${asset.asset_id} not found`);

    const assetStartDate = asset.display_from || start_date;
    const assetEndDate = asset.display_to || end_date;
    const startObj = new Date(assetStartDate); startObj.setHours(0,0,0,0);
    const endObj = new Date(assetEndDate); endObj.setHours(0,0,0,0);
    const bookedDays = Math.max(1, Math.ceil((endObj.getTime() - startObj.getTime()) / 86400000) + 1);
    const monthlyRate = asset.negotiated_price || asset.sales_price || 0;
    const rawDaily = monthlyRate / BILLING_CYCLE_DAYS;
    const rentAmount = Math.round(rawDaily * bookedDays * 100) / 100;

    return {
      campaign_id: campaign.id,
      asset_id: asset.asset_id,
      location: detail.location,
      city: detail.city,
      area: detail.area,
      media_type: detail.media_type,
      card_rate: asset.sales_price,
      negotiated_rate: monthlyRate,
      printing_charges: asset.printing_cost,
      mounting_charges: asset.mounting_cost,
      total_price: monthlyRate + asset.printing_cost + asset.mounting_cost,
      latitude: detail.latitude,
      longitude: detail.longitude,
      booking_start_date: assetStartDate,
      booking_end_date: assetEndDate,
      booked_days: bookedDays,
      billing_mode: 'PRORATA_30',
      daily_rate: Math.round(rawDaily * 100) / 100,
      rent_amount: rentAmount,
      status: assetStatus,
    };
  });

  const { error: assetsInsertError } = await supabase
    .from('campaign_assets')
    .insert(campaignAssets);

  if (assetsInsertError) {
    console.error('[create-direct-campaign] Insert assets error:', assetsInsertError);
    return jsonError(assetsInsertError.message, 500);
  }

  // Audit log
  await logSecurityAudit({
    functionName: 'create-direct-campaign',
    userId: ctx.userId,
    companyId,
    action: is_historical_entry ? 'create_historical_campaign' : 'create_direct_campaign',
    recordIds: [campaign.id],
    status: 'success',
    metadata: { client_id, total_assets: assets.length, grand_total },
    req,
  });

  // Activity log
  await supabase.from('activity_logs').insert({
    user_id: ctx.userId,
    user_name: ctx.email,
    action: is_historical_entry ? 'create_historical_campaign' : 'create_direct_campaign',
    resource_type: 'campaign',
    resource_id: campaign.id,
    resource_name: campaign_name,
    details: { client_id, client_name: client.name, start_date, end_date, total_assets: assets.length, grand_total, is_historical_entry },
  });

  // Auto-assign if requested
  if (auto_assign && !is_historical_entry) {
    try {
      await supabase.functions.invoke('auto-assign-operations', {
        body: { campaign_id: campaign.id, company_id: companyId, assigned_by: ctx.userId },
      });
    } catch (e) {
      console.error('[create-direct-campaign] Auto-assign failed:', e);
    }
  }

  if (!is_historical_entry) {
    try { await supabase.rpc('auto_update_campaign_status'); } catch (_) {}
  }

  return jsonSuccess({
    success: true,
    campaign_id: campaign.id,
    campaign_code,
    total_assets: assets.length,
    grand_total,
    auto_assigned: auto_assign && !is_historical_entry,
    is_historical_entry,
  });
}));

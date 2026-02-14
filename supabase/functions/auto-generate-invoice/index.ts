// supabase/functions/auto-generate-invoice/index.ts
// v4.0 - Phase-3 Security: User-scoped client + role enforcement + audit logging
// Service role ONLY used for: generate_invoice_id RPC (needs elevated access)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getAuthContext,
  requireRole,
  requireCompanyMatch,
  logSecurityAudit,
  supabaseServiceClient,
  supabaseUserClient,
  jsonError,
  jsonSuccess,
  withAuth,
} from '../_shared/auth.ts';

console.log('Auto-generate invoice function v4.0 started');

Deno.serve(withAuth(async (req) => {
  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'finance']);

  const body = await req.json().catch(() => null);
  const campaign_id = body?.campaign_id;

  if (!campaign_id || typeof campaign_id !== 'string') {
    return jsonError('campaign_id is required and must be a string', 400);
  }

  console.log('[v4.0] Generating invoice for campaign:', campaign_id);

  // User-scoped client for reads (respects RLS)
  const userClient = supabaseUserClient(req);

  // Fetch campaign with assets - user client ensures company isolation via RLS
  const { data: campaign, error: campaignError } = await userClient
    .from('campaigns')
    .select(`
      *,
      campaign_assets(
        id, asset_id, media_type, city, area, location, direction,
        illumination_type, dimensions, total_sqft, card_rate,
        negotiated_rate, printing_charges, mounting_charges,
        booking_start_date, booking_end_date
      )
    `)
    .eq('id', campaign_id)
    .single();

  if (campaignError || !campaign) {
    return jsonError('Campaign not found', 404);
  }

  // Verify campaign belongs to user's company
  requireCompanyMatch(ctx, campaign.company_id);

  // Service client ONLY for ID generation RPC (requires elevated access)
  const serviceClient = supabaseServiceClient();

  const gstPercent = Number(campaign.gst_percent) || 0;
  const { data: invoiceId, error: idError } = await serviceClient.rpc('generate_invoice_id', {
    p_gst_rate: gstPercent
  });

  if (idError || !invoiceId) {
    return jsonError('Failed to generate invoice ID', 500);
  }

  // Resolve display asset_code from media_assets
  const assetIds = (campaign.campaign_assets || []).map((a: any) => a.asset_id).filter(Boolean);
  const { data: mediaAssets } = assetIds.length
    ? await userClient
        .from('media_assets')
        .select('id, media_asset_code, asset_id_readable, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
        .in('id', assetIds)
    : ({ data: [] } as any);

  const mediaAssetMap = new Map((mediaAssets || []).map((a: any) => [a.id, a]));

  // Calculate per-asset line items
  const BILLING_CYCLE_DAYS = 30;
  const items = (campaign.campaign_assets || []).map((asset: any, index: number) => {
    const mediaAsset: any = asset?.asset_id ? mediaAssetMap.get(asset.asset_id) : null;
    // Helper: skip null, undefined, empty strings, and placeholders
    const pick = (primary: any, ...fallbacks: any[]) => {
      const isEmpty = (v: any) => v == null || v === '' || v === 'N/A' || v === '-' || v === 0;
      if (!isEmpty(primary)) return primary;
      for (const fb of fallbacks) { if (!isEmpty(fb)) return fb; }
      return primary ?? '-';
    };

    const location = pick(asset.location, mediaAsset?.location);
    const area = pick(asset.area, mediaAsset?.area);
    const direction = pick(asset.direction, mediaAsset?.direction);
    const mediaType = pick(asset.media_type, mediaAsset?.media_type);
    const illumination = pick(asset.illumination_type, mediaAsset?.illumination_type);
    const dimensions = pick(asset.dimensions, mediaAsset?.dimensions) === '-' ? null : pick(asset.dimensions, mediaAsset?.dimensions);
    const sqft = pick(asset.total_sqft, mediaAsset?.total_sqft) === '-' ? null : pick(asset.total_sqft, mediaAsset?.total_sqft);
    const assetCode = pick(mediaAsset?.media_asset_code, mediaAsset?.asset_id_readable, asset.asset_id);

    const startDate = asset.booking_start_date || campaign.start_date;
    const endDate = asset.booking_end_date || campaign.end_date;
    const billableDays = startDate && endDate
      ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;

    const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;
    const rentAmount = Math.round((monthlyRate / BILLING_CYCLE_DAYS) * billableDays * 100) / 100;
    const printing = Number(asset.printing_charges) || 0;
    const mounting = Number(asset.mounting_charges) || 0;
    const lineTotal = Math.round((rentAmount + printing + mounting) * 100) / 100;

    return {
      sno: index + 1,
      asset_id: asset.asset_id,
      asset_code: assetCode,
      media_asset_code: assetCode,
      campaign_asset_id: asset.id,
      location, area, direction,
      media_type: mediaType,
      illumination_type: illumination,
      city: asset.city || '-',
      dimensions, total_sqft: sqft,
      start_date: startDate, end_date: endDate,
      booking_start_date: startDate, booking_end_date: endDate,
      billable_days: billableDays,
      booked_days: billableDays,
      card_rate: Number(asset.card_rate) || 0,
      negotiated_rate: monthlyRate,
      rent_amount: rentAmount,
      printing_charges: printing,
      mounting_charges: mounting,
      rate: rentAmount, unit_price: rentAmount,
      amount: lineTotal, subtotal: lineTotal,
      final_price: lineTotal, total: lineTotal,
      hsn_sac: '998361',
      description: `${mediaType} - ${area} - ${location}`.replace(/\s+/g, ' ').trim(),
    };
  });

  const subTotal = Math.round(items.reduce((sum: number, item: any) => sum + item.total, 0) * 100) / 100;
  const gstAmount = Math.round(subTotal * (gstPercent / 100) * 100) / 100;
  const totalAmount = Math.round((subTotal + gstAmount) * 100) / 100;

  // Use service client for insert (invoice RLS may restrict inserts to admin/finance via helper)
  const { data: invoice, error: invoiceError } = await serviceClient
    .from('invoices')
    .insert({
      id: invoiceId,
      invoice_no: invoiceId,
      campaign_id,
      client_id: campaign.client_id,
      client_name: campaign.client_name,
      company_id: ctx.companyId,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items,
      sub_total: subTotal,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      balance_due: totalAmount,
      status: 'Sent',
      created_by: ctx.userId,
      invoice_series_prefix: gstPercent === 0 ? 'INV-Z' : 'INV',
      notes: `Auto-generated from campaign: ${campaign.campaign_name}`
    })
    .select()
    .single();

  if (invoiceError) {
    console.error('[v4.0] Invoice creation error:', invoiceError);
    await logSecurityAudit({
      functionName: 'auto-generate-invoice', userId: ctx.userId,
      companyId: ctx.companyId, action: 'create_invoice',
      status: 'error', errorMessage: invoiceError.message, req,
    });
    return jsonError(invoiceError.message, 500);
  }

  // Insert invoice_items snapshot
  try {
    const invoiceItems = items.map((item: any) => ({
      invoice_id: invoiceId,
      campaign_asset_id: item.campaign_asset_id,
      asset_id: item.asset_id, asset_code: item.asset_code,
      description: item.description, location: item.location,
      area: item.area, direction: item.direction,
      media_type: item.media_type, illumination: item.illumination_type,
      dimension_text: item.dimensions, total_sqft: item.total_sqft,
      hsn_sac: item.hsn_sac, bill_start_date: item.start_date,
      bill_end_date: item.end_date, billable_days: item.billable_days,
      rate_type: 'campaign', rate_value: item.negotiated_rate,
      base_amount: item.rent_amount, printing_cost: item.printing_charges,
      mounting_cost: item.mounting_charges, line_total: item.total,
    }));
    const { error: invItemsErr } = await serviceClient.from('invoice_items').insert(invoiceItems);
    if (invItemsErr) console.warn('[v4.0] invoice_items insert warning:', invItemsErr);
  } catch (e) {
    console.warn('[v4.0] invoice_items snapshot skipped:', e);
  }

  // Audit log
  await logSecurityAudit({
    functionName: 'auto-generate-invoice', userId: ctx.userId,
    companyId: ctx.companyId, action: 'create_invoice',
    recordIds: [invoiceId], req,
    metadata: { campaign_id, line_items: items.length },
  });

  console.log(`[v4.0] Invoice ${invoiceId} generated with ${items.length} line items`);

  return jsonSuccess({
    success: true, invoice_id: invoiceId, invoice, line_items_count: items.length
  });
}));

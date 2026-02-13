/**
 * convert-plan-to-campaign — Phase-5 hardened
 * v12.0 - Uses getAuthContext for company scoping, service client for cross-table writes
 * Roles: admin, sales (company-scoped)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  withAuth,
  getAuthContext,
  requireRole,
  logSecurityAudit,
  supabaseServiceClient,
  jsonError as authJsonError,
  jsonSuccess,
} from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';

function toDateString(d: string | Date | null | undefined): string {
  if (!d) return '';
  const str = typeof d === 'string' ? d : d.toISOString();
  return str.substring(0, 10);
}

function datesOverlap(es: string, ee: string, ns: string, ne: string): boolean {
  const a = toDateString(es), b = toDateString(ee), c = toDateString(ns), d = toDateString(ne);
  if (!a || !b || !c || !d) return false;
  return a <= d && b >= c;
}

function getEffectivePrice(salesPrice: number | null | undefined, cardRate: number | null | undefined): number {
  if (salesPrice != null && salesPrice > 0) return salesPrice;
  return cardRate || 0;
}

function jsonError(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(withAuth(async (req) => {
  if (req.method !== "POST") return jsonError("Only POST is allowed", 405);

  const ctx = await getAuthContext(req);
  requireRole(ctx, ['admin', 'sales']);

  const body = await req.json().catch(() => null) as { plan_id?: string; planId?: string } | null;
  const planId = body?.plan_id || body?.planId;
  if (!planId || typeof planId !== 'string') return jsonError("Missing required field: plan_id", 400);

  const companyId = ctx.companyId;
  console.log(`[v12.0] Converting plan ${planId} for company ${companyId} by ${ctx.userId}`);

  // Service client for cross-table writes (campaign creation needs to write to multiple tables atomically)
  const supabase = supabaseServiceClient();

  // Atomic lock
  const { data: existingCampaignId, error: lockError } = await supabase
    .rpc("lock_plan_for_conversion", { p_plan_id: planId });

  if (lockError) {
    const msg = lockError.message || '';
    if (msg.includes('not found')) return jsonError("Plan not found", 404);
    if (msg.includes('must be "Approved"')) return jsonError(msg, 400);
    return jsonError(`Failed to lock plan: ${msg}`, 500);
  }

  if (existingCampaignId) {
    const { data: ec } = await supabase.from('campaigns').select('id, status, campaign_name').eq('id', existingCampaignId).maybeSingle();
    return jsonSuccess({ success: true, message: "Plan was already converted", campaign_id: existingCampaignId, plan_id: planId, already_converted: true, status: ec?.status || 'Draft' });
  }

  // Load plan — MUST belong to user's company
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, plan_name, status, company_id, client_id, client_name, start_date, end_date, duration_days, total_amount, gst_percent, gst_amount, grand_total, notes, converted_to_campaign_id")
    .eq("id", planId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (planError || !plan) return jsonError("Plan not found for this company", 404);

  // Load plan items
  const { data: planItems, error: itemsError } = await supabase
    .from("plan_items")
    .select("id, plan_id, asset_id, location, city, area, media_type, dimensions, card_rate, sales_price, printing_charges, printing_rate, printing_cost, mounting_charges, installation_rate, installation_cost, total_with_gst, state, district, latitude, longitude, illumination_type, direction, total_sqft, start_date, end_date, booked_days, billing_mode, daily_rate, rent_amount")
    .eq("plan_id", planId);

  if (itemsError) return jsonError("Could not load plan items", 500);
  if (!planItems || planItems.length === 0) return jsonError("Plan has no items to convert", 400);

  // Check booking conflicts
  const assetIds = planItems.map(i => i.asset_id);
  const assetDateMap = new Map(planItems.map(item => [
    item.asset_id,
    { start_date: toDateString(item.start_date || plan.start_date), end_date: toDateString(item.end_date || plan.end_date) }
  ]));

  const { data: existingBookings } = await supabase
    .from("campaign_assets")
    .select("id, campaign_id, asset_id, booking_start_date, booking_end_date, start_date, end_date, campaigns!inner(id, campaign_name, client_name, status, plan_id)")
    .in("asset_id", assetIds)
    .not("campaigns.status", "in", '("Completed","Cancelled","Archived")');

  const conflicts: any[] = [];
  for (const booking of (existingBookings || [])) {
    const dates = assetDateMap.get(booking.asset_id);
    if (!dates) continue;
    const campaign = booking.campaigns as any;
    if (campaign?.plan_id === planId) continue;
    const es = toDateString(booking.booking_start_date || booking.start_date);
    const ee = toDateString(booking.booking_end_date || booking.end_date);
    if (datesOverlap(es, ee, dates.start_date, dates.end_date)) {
      conflicts.push({ asset_id: booking.asset_id, campaign_id: campaign?.id, campaign_name: campaign?.campaign_name });
    }
  }

  if (conflicts.length > 0) {
    return new Response(JSON.stringify({ success: false, error: `${conflicts.length} asset(s) already booked`, conflicts }), {
      status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Generate campaign ID
  let campaignId = '';
  let campaign: { id: string } | null = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { data: cid, error: cidErr } = await supabase.rpc("generate_campaign_id_v2", { p_user_id: ctx.userId });
    if (cidErr) {
      const now = new Date();
      const period = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
      campaignId = `CAM-${period}-${String(Math.floor(Math.random()*9000)+1000).padStart(4,'0')}`;
    } else {
      campaignId = cid as string;
    }

    const effectiveGstPercent = (plan.gst_percent !== null && plan.gst_percent !== undefined) ? plan.gst_percent : 0;
    const { data: inserted, error: insertErr } = await supabase.from("campaigns").insert({
      id: campaignId, campaign_code: campaignId, plan_id: plan.id, company_id: companyId, client_id: plan.client_id, client_name: plan.client_name,
      campaign_name: plan.plan_name, status: 'Draft', start_date: plan.start_date, end_date: plan.end_date,
      total_assets: planItems.length, total_amount: plan.total_amount, gst_percent: effectiveGstPercent,
      gst_amount: plan.gst_amount || 0, grand_total: plan.grand_total, notes: plan.notes || "", created_by: ctx.userId, created_from: 'plan',
    }).select("id").maybeSingle();

    if (insertErr) {
      if (insertErr.code === '23505' && attempt < 5) { await new Promise(r => setTimeout(r, 100 * attempt)); continue; }
      return jsonError(`Failed to create campaign: ${insertErr.message}`, 500);
    }
    if (!inserted) return jsonError("Campaign insert did not return a record", 500);
    campaign = inserted;
    break;
  }
  if (!campaign) return jsonError("Failed after multiple attempts", 500);

  // Insert campaign_items
  const ciPayload = planItems.map(item => {
    const ep = getEffectivePrice(item.sales_price, item.card_rate);
    return { campaign_id: campaignId, plan_item_id: item.id, asset_id: item.asset_id, start_date: plan.start_date, end_date: plan.end_date, card_rate: item.card_rate||0, negotiated_rate: ep, printing_charge: item.printing_cost||item.printing_charges||0, mounting_charge: item.installation_cost||item.mounting_charges||0, final_price: item.total_with_gst||0, quantity: 1 };
  });
  await supabase.from("campaign_items").insert(ciPayload);

  // Insert campaign_assets
  const caPayload = planItems.map(item => {
    const ep = getEffectivePrice(item.sales_price, item.card_rate);
    const pc = item.printing_cost||item.printing_charges||0;
    const mc = item.installation_cost||item.mounting_charges||0;
    const sd = item.start_date||plan.start_date;
    const ed = item.end_date||plan.end_date;
    const startMs = new Date(sd).setHours(0,0,0,0);
    const endMs = new Date(ed).setHours(0,0,0,0);
    const days = Math.max(1, Math.floor((endMs-startMs)/86400000)+1);
    const bm = item.billing_mode||'PRORATA_30';
    let rent: number, dr: number;
    if (bm==='FULL_MONTH') { rent=ep*Math.ceil(days/30); dr=Math.round((ep/30)*100)/100; }
    else if (bm==='DAILY'&&item.daily_rate&&item.daily_rate>0) { rent=item.daily_rate*days; dr=item.daily_rate; }
    else { const raw=ep/30; rent=Math.round(raw*days*100)/100; dr=Math.round(raw*100)/100; }
    return { campaign_id: campaignId, asset_id: item.asset_id, card_rate: item.card_rate||0, negotiated_rate: ep, printing_charges: pc, mounting_charges: mc, total_price: item.total_with_gst||0, media_type: item.media_type||"Unknown", state: item.state||"", district: item.district||"", city: item.city||"", area: item.area||"", location: item.location||"", direction: item.direction||"", dimensions: item.dimensions||"", total_sqft: item.total_sqft||null, illumination_type: item.illumination_type||"", latitude: item.latitude||null, longitude: item.longitude||null, booking_start_date: sd, booking_end_date: ed, start_date: sd, end_date: ed, booked_days: days, billing_mode: bm, daily_rate: dr, rent_amount: rent, status: "Pending" as const };
  });
  const { error: caErr } = await supabase.from("campaign_assets").insert(caPayload);
  if (caErr) return jsonError(`Failed to create campaign assets: ${caErr.message}`, 500);

  // Update media_assets to Booked
  await supabase.from("media_assets").update({ status: "Booked", booked_from: plan.start_date, booked_to: plan.end_date, current_campaign_id: campaignId }).in("id", assetIds);

  // Update plan to Converted
  await supabase.from("plans").update({ status: "Converted", converted_to_campaign_id: campaignId, converted_at: new Date().toISOString() }).eq("id", planId);

  // Timeline event
  try { await supabase.functions.invoke('add-timeline-event', { body: { campaign_id: campaignId, company_id: companyId, event_type: 'draft_created', event_title: 'Campaign Created from Plan', event_description: `Converted from plan ${plan.plan_name}`, created_by: ctx.userId, metadata: { plan_id: planId } } }); } catch (_) {}

  try { await supabase.rpc('auto_update_campaign_status'); } catch (_) {}

  // Audit
  await logSecurityAudit({
    functionName: 'convert-plan-to-campaign',
    userId: ctx.userId,
    companyId,
    action: 'convert_plan_to_campaign',
    recordIds: [planId, campaignId],
    status: 'success',
    metadata: { plan_name: plan.plan_name, total_items: planItems.length },
    req,
  });

  const { data: created } = await supabase.from('campaigns').select('status').eq('id', campaignId).single();

  return jsonSuccess({ success: true, message: "Plan converted to campaign successfully", campaign_id: campaignId, campaign_code: campaignId, plan_id: plan.id, total_items: planItems.length, status: created?.status || 'Draft' });
}));

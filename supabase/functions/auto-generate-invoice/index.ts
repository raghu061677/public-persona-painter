 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
 import { corsHeaders } from '../_shared/cors.ts';
 
 // Version 3.0 - Asset-level line items with full details
 console.log('Auto-generate invoice function v3.0 started');
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseClient = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     );
 
     const { campaign_id } = await req.json();
 
     if (!campaign_id) {
       return new Response(
         JSON.stringify({ error: 'campaign_id is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('[v3.0] Generating invoice for campaign:', campaign_id);
 
     // Fetch campaign with assets - include negotiated_rate and booking dates
     const { data: campaign, error: campaignError } = await supabaseClient
       .from('campaigns')
       .select(`
         *,
         campaign_assets(
           id,
           asset_id,
           media_type,
           city,
           area,
           location,
           direction,
           illumination_type,
           dimensions,
           total_sqft,
           card_rate,
           negotiated_rate,
           printing_charges,
           mounting_charges,
           booking_start_date,
           booking_end_date
         )
       `)
       .eq('id', campaign_id)
       .single();
 
     if (campaignError || !campaign) {
       return new Response(
         JSON.stringify({ error: 'Campaign not found' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Generate invoice ID
     const { data: invoiceId, error: idError } = await supabaseClient.rpc('generate_invoice_id');
     
     if (idError || !invoiceId) {
       return new Response(
         JSON.stringify({ error: 'Failed to generate invoice ID' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Resolve display asset_code from media_assets if possible
     const assetIds = (campaign.campaign_assets || []).map((a: any) => a.asset_id).filter(Boolean);
     const { data: mediaAssets } = assetIds.length
       ? await supabaseClient
           .from('media_assets')
           .select('id, media_asset_code, asset_id_readable, location, area, direction, media_type, illumination_type, dimensions, total_sqft')
           .in('id', assetIds)
       : ({ data: [] } as any);
 
     const mediaAssetMap = new Map((mediaAssets || []).map((a: any) => [a.id, a]));
 
     // Calculate per-asset line items with full details
     const BILLING_CYCLE_DAYS = 30;
     const items = (campaign.campaign_assets || []).map((asset: any, index: number) => {
       const mediaAsset: any = asset?.asset_id ? mediaAssetMap.get(asset.asset_id) : null;
       
       // Get all asset details
       const location = asset.location ?? mediaAsset?.location ?? '-';
       const area = asset.area ?? mediaAsset?.area ?? '-';
       const direction = asset.direction ?? mediaAsset?.direction ?? '-';
       const mediaType = asset.media_type ?? mediaAsset?.media_type ?? '-';
       const illumination = asset.illumination_type ?? mediaAsset?.illumination_type ?? '-';
       const dimensions = asset.dimensions ?? mediaAsset?.dimensions ?? null;
       const sqft = asset.total_sqft ?? mediaAsset?.total_sqft ?? null;
       const assetCode = mediaAsset?.media_asset_code || mediaAsset?.asset_id_readable || asset.asset_id || '-';
       
       // Calculate dates and duration
       const startDate = asset.booking_start_date || campaign.start_date;
       const endDate = asset.booking_end_date || campaign.end_date;
       const billableDays = startDate && endDate
         ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
         : 0;
       
       // Calculate pro-rata rent
       const monthlyRate = Number(asset.negotiated_rate) || Number(asset.card_rate) || 0;
       const rentAmount = Math.round((monthlyRate / BILLING_CYCLE_DAYS) * billableDays * 100) / 100;
       const printing = Number(asset.printing_charges) || 0;
       const mounting = Number(asset.mounting_charges) || 0;
       const lineTotal = Math.round((rentAmount + printing + mounting) * 100) / 100;
 
       return {
         sno: index + 1,
         // Asset identification
         asset_id: asset.asset_id,
         asset_code: assetCode,
         media_asset_code: assetCode,
         campaign_asset_id: asset.id,
         
         // Location & Description fields
         location,
         area,
         direction,
         media_type: mediaType,
         illumination_type: illumination,
         city: asset.city || '-',
         
         // Size fields
         dimensions,
         total_sqft: sqft,
         
         // Booking fields
         start_date: startDate,
         end_date: endDate,
         billable_days: billableDays,
         
         // Pricing breakdown
         card_rate: Number(asset.card_rate) || 0,
         negotiated_rate: monthlyRate,
         rent_amount: rentAmount,
         printing_charges: printing,
         mounting_charges: mounting,
         
         // Legacy fields for compatibility
         rate: rentAmount,
         unit_price: rentAmount,
         amount: lineTotal,
         subtotal: lineTotal,
         final_price: lineTotal,
         total: lineTotal,
         
         // HSN/SAC
         hsn_sac: '998361',
         
         // Description for legacy display
         description: `${mediaType} - ${area} - ${location}`.replace(/\s+/g, ' ').trim(),
       };
     });
 
     // Calculate totals
     const subTotal = Math.round(items.reduce((sum: number, item: any) => sum + item.total, 0) * 100) / 100;
     const gstPercent = Number(campaign.gst_percent) || 0;
     const gstAmount = Math.round(subTotal * (gstPercent / 100) * 100) / 100;
     const totalAmount = Math.round((subTotal + gstAmount) * 100) / 100;
 
     // Create invoice with per-asset line items
     const { data: invoice, error: invoiceError } = await supabaseClient
       .from('invoices')
       .insert({
         id: invoiceId,
         campaign_id: campaign_id,
         client_id: campaign.client_id,
         client_name: campaign.client_name,
         company_id: campaign.company_id,
         invoice_date: new Date().toISOString().split('T')[0],
         due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
         items: items,
         sub_total: subTotal,
         gst_percent: gstPercent,
         gst_amount: gstAmount,
         total_amount: totalAmount,
         balance_due: totalAmount,
         status: 'Sent',
         created_by: campaign.created_by,
         notes: `Auto-generated from campaign: ${campaign.campaign_name}`
       })
       .select()
       .single();
 
     if (invoiceError) {
       console.error('[v3.0] Invoice creation error:', invoiceError);
       return new Response(
         JSON.stringify({ error: invoiceError.message }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Also create stable snapshot rows in invoice_items table
     try {
       const invoiceItems = items.map((item: any) => ({
         invoice_id: invoiceId,
         campaign_asset_id: item.campaign_asset_id,
         asset_id: item.asset_id,
         asset_code: item.asset_code,
         description: item.description,
         location: item.location,
         area: item.area,
         direction: item.direction,
         media_type: item.media_type,
         illumination: item.illumination_type,
         dimension_text: item.dimensions,
         total_sqft: item.total_sqft,
         hsn_sac: item.hsn_sac,
         bill_start_date: item.start_date,
         bill_end_date: item.end_date,
         billable_days: item.billable_days,
         rate_type: 'campaign',
         rate_value: item.negotiated_rate,
         base_amount: item.rent_amount,
         printing_cost: item.printing_charges,
         mounting_cost: item.mounting_charges,
         line_total: item.total,
       }));
 
       const { error: invItemsErr } = await supabaseClient
         .from('invoice_items')
         .insert(invoiceItems);
       if (invItemsErr) console.warn('[v3.0] invoice_items insert warning:', invItemsErr);
     } catch (e) {
       console.warn('[v3.0] invoice_items snapshot generation skipped:', e);
     }
 
     console.log(`[v3.0] Invoice ${invoiceId} auto-generated with ${items.length} line items for campaign ${campaign_id}`);
 
     return new Response(
       JSON.stringify({ 
         success: true, 
         invoice_id: invoiceId,
         invoice,
         line_items_count: items.length
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('[v3.0] Error:', error);
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });
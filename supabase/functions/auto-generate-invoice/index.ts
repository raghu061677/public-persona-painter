import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Version 2.0 - Fixed to use campaign_id and proper asset descriptions
console.log('Auto-generate invoice function v2.1 started');

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

    console.log('[v2.0] Generating invoice for campaign:', campaign_id);

    // Fetch campaign with assets
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select(`
        *,
        campaign_assets(
          asset_id,
          id,
          media_type,
          city,
          area,
          location,
          direction,
          illumination_type,
          dimensions,
          total_sqft,
          card_rate,
          printing_charges,
          mounting_charges
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

    // Calculate invoice items from campaign assets with full snapshot fields
    const items = (campaign.campaign_assets || []).map((asset: any) => {
      const mediaAsset: any = asset?.asset_id ? mediaAssetMap.get(asset.asset_id) : null;
      const location = asset.location ?? mediaAsset?.location ?? '-';
      const area = asset.area ?? mediaAsset?.area ?? '-';
      const direction = asset.direction ?? mediaAsset?.direction ?? '-';
      const mediaType = asset.media_type ?? mediaAsset?.media_type ?? '-';
      const illumination = asset.illumination_type ?? mediaAsset?.illumination_type ?? '-';
      const dimensions = asset.dimensions ?? mediaAsset?.dimensions ?? null;
      const sqft = asset.total_sqft ?? mediaAsset?.total_sqft ?? null;
      const assetCode = mediaAsset?.media_asset_code || mediaAsset?.asset_id_readable || asset.asset_id || '-';

      const description = `${mediaType || 'Display'} - ${area || ''} - ${location || ''}`.replace(/\s+/g, ' ').trim();

      const rate = asset.card_rate || 0;
      const printing = asset.printing_charges || 0;
      const mounting = asset.mounting_charges || 0;
      const total = rate + printing + mounting;

      return {
        // Existing fields used elsewhere
        description,
        rate,
        printing_charges: printing,
        mounting_charges: mounting,
        total,

        // Snapshot fields for stable PDF line rendering
        asset_id: asset.asset_id,
        asset_code: assetCode,
        location,
        area,
        direction,
        media_type: mediaType,
        illumination,
        dimension_text: dimensions,
        total_sqft: sqft,
        hsn_sac: '998361',
        campaign_asset_id: asset.id,
      };
    });

    const subTotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const gstAmount = subTotal * (campaign.gst_percent / 100);
    const totalAmount = subTotal + gstAmount;

    // Create invoice with campaign_id link
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .insert({
        id: invoiceId,
        campaign_id: campaign_id, // Link to campaign
        client_id: campaign.client_id,
        client_name: campaign.client_name,
        company_id: campaign.company_id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: items,
        sub_total: subTotal,
        gst_percent: campaign.gst_percent,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        balance_due: totalAmount,
        status: 'Sent',
        created_by: campaign.created_by,
        notes: `Auto-generated from campaign: ${campaign.campaign_name}`
      })
      .select()
      .single();
    // Create stable snapshot rows in invoice_items as well
    try {
      const startDate = campaign.start_date;
      const endDate = campaign.end_date;
      const billableDays = startDate && endDate
        ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        : 0;

      const invoiceItems = (campaign.campaign_assets || []).map((asset: any) => {
        const item = items.find((i: any) => i.campaign_asset_id === asset.id) as any;
        return {
          invoice_id: invoiceId,
          campaign_asset_id: asset.id,
          asset_id: asset.asset_id,
          asset_code: item?.asset_code || asset.asset_id || '-',
          description: item?.description || null,
          location: item?.location || null,
          area: item?.area || null,
          direction: item?.direction || null,
          media_type: item?.media_type || null,
          illumination: item?.illumination || null,
          dimension_text: item?.dimension_text || null,
          hsn_sac: item?.hsn_sac || '998361',
          bill_start_date: startDate,
          bill_end_date: endDate,
          billable_days: billableDays,
          rate_type: 'campaign',
          rate_value: item?.rate || 0,
          base_amount: item?.rate || 0,
          printing_cost: item?.printing_charges || 0,
          mounting_cost: item?.mounting_charges || 0,
          line_total: item?.total || 0,
        };
      });

      const { error: invItemsErr } = await supabaseClient
        .from('invoice_items')
        .insert(invoiceItems);
      if (invItemsErr) console.warn('[v2.1] invoice_items insert warning:', invItemsErr);
    } catch (e) {
      console.warn('[v2.1] invoice_items snapshot generation skipped:', e);
    }


    if (invoiceError) {
      console.error('[v2.0] Invoice creation error:', invoiceError);
      return new Response(
        JSON.stringify({ error: invoiceError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[v2.0] Invoice ${invoiceId} auto-generated for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice_id: invoiceId,
        invoice 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[v2.0] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

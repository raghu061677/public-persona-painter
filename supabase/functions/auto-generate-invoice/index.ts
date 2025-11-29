import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Version 2.0 - Fixed to use campaign_id and proper asset descriptions
console.log('Auto-generate invoice function v2.0 started');

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
          media_type,
          city,
          area,
          location,
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

    // Calculate invoice items from campaign assets with proper descriptions
    const items = campaign.campaign_assets.map((asset: any) => {
      const description = `${asset.media_type || 'Display'} - ${asset.area || ''} - ${asset.location || ''}`.replace(/\s+/g, ' ').trim();
      
      return {
        description: description,
        rate: asset.card_rate || 0,
        printing_charges: asset.printing_charges || 0,
        mounting_charges: asset.mounting_charges || 0,
        total: (asset.card_rate || 0) + (asset.printing_charges || 0) + (asset.mounting_charges || 0)
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

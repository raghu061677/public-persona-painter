import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

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

    // Fetch campaign assets
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select('*, campaign_assets(*)')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expenses = [];

    // Create printing expenses (if any)
    for (const asset of campaign.campaign_assets) {
      if (asset.printing_charges && asset.printing_charges > 0) {
        const { data: expenseId } = await supabaseClient.rpc('generate_expense_id');
        
        const printingExpense = {
          id: expenseId,
          campaign_id: campaign_id,
          company_id: campaign.company_id,
          category: 'Printing',
          vendor_name: 'Printing Vendor',
          amount: asset.printing_charges,
          gst_percent: 18,
          gst_amount: asset.printing_charges * 0.18,
          total_amount: asset.printing_charges * 1.18,
          payment_status: 'Pending',
          notes: `Printing for ${asset.location} - ${campaign.campaign_name}`
        };

        const { error } = await supabaseClient
          .from('expenses')
          .insert(printingExpense);

        if (!error) {
          expenses.push(printingExpense);
        }
      }

      // Create mounting expenses (if any)
      if (asset.mounting_charges && asset.mounting_charges > 0) {
        const { data: expenseId } = await supabaseClient.rpc('generate_expense_id');
        
        const mountingExpense = {
          id: expenseId,
          campaign_id: campaign_id,
          company_id: campaign.company_id,
          category: 'Mounting',
          vendor_name: asset.mounter_name || 'Mounting Vendor',
          amount: asset.mounting_charges,
          gst_percent: 18,
          gst_amount: asset.mounting_charges * 0.18,
          total_amount: asset.mounting_charges * 1.18,
          payment_status: 'Pending',
          notes: `Mounting for ${asset.location} - ${campaign.campaign_name}`
        };

        const { error } = await supabaseClient
          .from('expenses')
          .insert(mountingExpense);

        if (!error) {
          expenses.push(mountingExpense);
        }
      }
    }

    console.log(`Created ${expenses.length} expense records for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expenses_created: expenses.length,
        expenses 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
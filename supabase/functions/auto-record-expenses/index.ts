import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Version 2.0 - Fixed to use correct expense categories and company_id
console.log('Auto-record expenses function v2.0 started');

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

    console.log('[v2.0] Recording expenses for campaign:', campaign_id);

    // Fetch campaign with assets
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select(`
        company_id,
        campaign_name,
        campaign_assets(
          asset_id,
          location,
          city,
          area,
          printing_charges,
          mounting_charges,
          mounter_name
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

    const expenses = [];

    // Create expenses for printing and mounting charges
    for (const asset of campaign.campaign_assets) {
      // Printing expense
      if (asset.printing_charges && asset.printing_charges > 0) {
        const { data: expenseId } = await supabaseClient.rpc('generate_expense_id');
        
        const printingExpense = {
          id: expenseId,
          campaign_id: campaign_id,
          company_id: campaign.company_id,
          category: 'Printing', // PascalCase category
          vendor_name: 'Printing Vendor',
          amount: asset.printing_charges,
          gst_percent: 18,
          gst_amount: asset.printing_charges * 0.18,
          total_amount: asset.printing_charges * 1.18,
          payment_status: 'Pending',
          expense_date: new Date().toISOString().split('T')[0],
          notes: `Printing for ${asset.city} - ${asset.area} - ${asset.location || 'N/A'}`
        };

        const { error: printError } = await supabaseClient
          .from('expenses')
          .insert(printingExpense);

        if (!printError) {
          expenses.push(printingExpense);
        } else {
          console.error('[v2.0] Printing expense error:', printError);
        }
      }

      // Mounting expense
      if (asset.mounting_charges && asset.mounting_charges > 0) {
        const { data: expenseId } = await supabaseClient.rpc('generate_expense_id');
        
        const mountingExpense = {
          id: expenseId,
          campaign_id: campaign_id,
          company_id: campaign.company_id,
          category: 'Mounting', // PascalCase category
          vendor_name: asset.mounter_name || 'Mounting Vendor',
          amount: asset.mounting_charges,
          gst_percent: 18,
          gst_amount: asset.mounting_charges * 0.18,
          total_amount: asset.mounting_charges * 1.18,
          payment_status: 'Pending',
          expense_date: new Date().toISOString().split('T')[0],
          notes: `Mounting for ${asset.city} - ${asset.area} - ${asset.location || 'N/A'}`
        };

        const { error: mountError } = await supabaseClient
          .from('expenses')
          .insert(mountingExpense);

        if (!mountError) {
          expenses.push(mountingExpense);
        } else {
          console.error('[v2.0] Mounting expense error:', mountError);
        }
      }
    }

    console.log(`[v2.0] Created ${expenses.length} expense records for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expenses_created: expenses.length,
        expenses 
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

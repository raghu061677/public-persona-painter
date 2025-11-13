import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SharedAsset {
  asset_id: string;
  share_percentage: number;
}

interface BillData {
  id: string;
  asset_id: string;
  bill_amount: number;
  bill_month: string;
  unique_service_number: string;
  shared_with_assets?: SharedAsset[];
  is_primary_bill?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bill_id, action = 'create' } = await req.json();

    if (!bill_id) {
      throw new Error('bill_id is required');
    }

    console.log(`Processing expense split for bill ${bill_id}, action: ${action}`);

    // Fetch the bill details
    const { data: bill, error: billError } = await supabase
      .from('asset_power_bills')
      .select('*')
      .eq('id', bill_id)
      .single();

    if (billError || !bill) {
      throw new Error(`Failed to fetch bill: ${billError?.message || 'Bill not found'}`);
    }

    const billData = bill as BillData;

    // Only process if this is a primary bill with shared assets
    if (!billData.is_primary_bill || !billData.shared_with_assets || !Array.isArray(billData.shared_with_assets)) {
      console.log('Bill is not shared or not primary, skipping expense generation');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Bill is not shared, no expenses generated',
          expenses_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sharedAssets = billData.shared_with_assets as SharedAsset[];
    
    // Validate total percentage
    const totalPercentage = sharedAssets.reduce((sum, asset) => sum + asset.share_percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Invalid share percentages: total is ${totalPercentage}%, must be 100%`);
    }

    // Delete existing expenses for this bill if action is update
    if (action === 'update') {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('bill_id', bill_id);

      if (deleteError) {
        console.error('Error deleting old expenses:', deleteError);
      } else {
        console.log('Deleted old expenses for bill update');
      }
    }

    // Generate expense records for each shared asset
    const expensesToCreate = [];
    const monthName = new Date(billData.bill_month).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    // Add expense for primary asset
    const primarySharePercentage = 100 - totalPercentage;
    if (primarySharePercentage > 0) {
      const primaryAmount = (billData.bill_amount * primarySharePercentage) / 100;
      const primaryGst = primaryAmount * 0.18;
      
      expensesToCreate.push({
        category: 'Electricity',
        amount: primaryAmount,
        gst_percent: 18,
        gst_amount: primaryGst,
        total_amount: primaryAmount + primaryGst,
        vendor_name: 'TGSPDCL',
        bill_id: bill_id,
        bill_month: monthName,
        payment_status: 'Pending',
        notes: `Power bill for ${billData.unique_service_number} - ${monthName} (Primary Asset: ${primarySharePercentage.toFixed(1)}% share)`
      });
    }

    // Add expenses for shared assets
    for (const sharedAsset of sharedAssets) {
      const splitAmount = (billData.bill_amount * sharedAsset.share_percentage) / 100;
      const gstAmount = splitAmount * 0.18;
      const totalAmount = splitAmount + gstAmount;

      expensesToCreate.push({
        category: 'Electricity',
        amount: splitAmount,
        gst_percent: 18,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        vendor_name: 'TGSPDCL',
        bill_id: bill_id,
        bill_month: monthName,
        payment_status: 'Pending',
        notes: `Power bill for ${billData.unique_service_number} - ${monthName} (Shared Asset: ${sharedAsset.asset_id}, ${sharedAsset.share_percentage.toFixed(1)}% share)`
      });
    }

    // Insert all expenses
    const { data: createdExpenses, error: expenseError } = await supabase
      .from('expenses')
      .insert(expensesToCreate)
      .select();

    if (expenseError) {
      throw new Error(`Failed to create expenses: ${expenseError.message}`);
    }

    console.log(`Successfully created ${createdExpenses?.length || 0} expense records`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expenses generated successfully',
        expenses_created: createdExpenses?.length || 0,
        expense_ids: createdExpenses?.map(e => e.id) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in split-power-bill-expenses:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

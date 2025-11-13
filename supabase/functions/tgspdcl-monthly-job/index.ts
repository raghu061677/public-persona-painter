import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillResult {
  assetId: string;
  success: boolean;
  billAmount?: number;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting TGSPDCL monthly bill fetch job...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch all media assets with TGSPDCL service numbers
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, unique_service_number, service_number, consumer_name, ero, section_name')
      .not('unique_service_number', 'is', null);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${assets?.length || 0} assets with service numbers`);

    const results: BillResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // 2. Process each asset
    for (const asset of assets || []) {
      const jobId = crypto.randomUUID();
      
      try {
        // Create job record
        await supabase.from('power_bill_jobs').insert({
          id: jobId,
          asset_id: asset.id,
          job_type: 'monthly_fetch',
          job_status: 'running',
        });

        console.log(`Fetching bill for asset ${asset.id}`);

        // Call the fetch-tgspdcl-bill function
        const { data: billData, error: billError } = await supabase.functions.invoke(
          'fetch-tgspdcl-bill',
          {
            body: {
              uniqueServiceNumber: asset.unique_service_number,
              serviceNumber: asset.service_number,
              assetId: asset.id
            }
          }
        );

        if (billError || !billData?.success) {
          throw new Error(billData?.error || billError?.message || 'Unknown error');
        }

        const bill = billData.data;
        const billMonth = bill.bill_month || new Date().toISOString().split('T')[0];

        // 3. Check if bill already exists for this month
        const { data: existingBill } = await supabase
          .from('asset_power_bills')
          .select('id')
          .eq('asset_id', asset.id)
          .eq('bill_month', billMonth)
          .maybeSingle();

        if (existingBill) {
          console.log(`Bill already exists for asset ${asset.id} for month ${billMonth}`);
          await supabase.from('power_bill_jobs').update({
            job_status: 'completed',
            result: { message: 'Bill already exists' },
          }).eq('id', jobId);
          continue;
        }

        // 4. Insert new bill
        const { data: newBill, error: insertError } = await supabase
          .from('asset_power_bills')
          .insert({
            asset_id: asset.id,
            unique_service_number: bill.unique_service_number,
            consumer_name: bill.consumer_name || asset.consumer_name,
            service_number: bill.service_number || asset.service_number,
            ero_name: bill.ero_name || asset.ero,
            section_name: bill.section_name || asset.section_name,
            consumer_address: bill.consumer_address,
            bill_date: bill.bill_date,
            due_date: bill.due_date,
            bill_month: billMonth,
            bill_amount: bill.bill_amount || 0,
            energy_charges: bill.energy_charges || 0,
            fixed_charges: bill.fixed_charges || 0,
            arrears: bill.arrears || 0,
            total_due: bill.total_due || bill.bill_amount || 0,
            payment_status: 'Pending',
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        console.log(`Bill inserted for asset ${asset.id}`);

        // 5. Auto-create expense entry
        const { data: expenseId } = await supabase.rpc('generate_expense_id');
        
        await supabase.from('expenses').insert({
          id: expenseId,
          bill_id: newBill.id,
          category: 'Power Bill',
          vendor_name: 'TGSPDCL',
          amount: newBill.bill_amount || 0,
          gst_percent: 0,
          gst_amount: 0,
          total_amount: newBill.total_due || 0,
          payment_status: 'Pending',
          notes: `Auto-generated from power bill ${billMonth} for asset ${asset.id}`,
          bill_month: billMonth,
        });

        console.log(`Expense created for asset ${asset.id}`);

        // 6. Update job status
        await supabase.from('power_bill_jobs').update({
          job_status: 'completed',
          result: { billAmount: newBill.bill_amount },
        }).eq('id', jobId);

        results.push({
          assetId: asset.id,
          success: true,
          billAmount: newBill.bill_amount,
        });
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`Error processing asset ${asset.id}:`, errorMessage);
        
        await supabase.from('power_bill_jobs').update({
          job_status: 'failed',
          error_message: errorMessage,
        }).eq('id', jobId);

        results.push({
          assetId: asset.id,
          success: false,
          error: errorMessage,
        });
      }
    }

    console.log(`Job completed: ${successCount} successful, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly bill fetch completed',
        summary: {
          total: assets?.length || 0,
          successful: successCount,
          failed: failureCount,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Critical error in monthly job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

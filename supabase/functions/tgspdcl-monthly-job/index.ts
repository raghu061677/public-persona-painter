// v2.0 - Phase-5: HMAC-protected system endpoint
import { corsHeaders } from '../_shared/cors.ts';
import { withHmac, supabaseServiceClient, logSecurityAudit } from '../_shared/auth.ts';

interface BillResult {
  assetId: string;
  success: boolean;
  billAmount?: number;
  error?: string;
}

Deno.serve(withHmac(async (_req, _rawBody) => {
  try {
    console.log('Starting TGSPDCL monthly bill fetch job...');
    const supabase = supabaseServiceClient();

    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, unique_service_number, service_number, consumer_name, ero, section_name')
      .not('unique_service_number', 'is', null);

    if (assetsError) throw assetsError;

    console.log(`Found ${assets?.length || 0} assets with service numbers`);

    const results: BillResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const asset of assets || []) {
      const jobId = crypto.randomUUID();
      
      try {
        await supabase.from('power_bill_jobs').insert({
          id: jobId, asset_id: asset.id, job_type: 'monthly_fetch', job_status: 'running',
        });

        const { data: billData, error: billError } = await supabase.functions.invoke(
          'fetch-tgspdcl-bill',
          { body: { uniqueServiceNumber: asset.unique_service_number, serviceNumber: asset.service_number, assetId: asset.id } }
        );

        if (billError || !billData?.success) {
          throw new Error(billData?.error || billError?.message || 'Unknown error');
        }

        const bill = billData.data;
        const billMonth = bill.bill_month || new Date().toISOString().split('T')[0];

        const { data: existingBill } = await supabase
          .from('asset_power_bills').select('id').eq('asset_id', asset.id).eq('bill_month', billMonth).maybeSingle();

        if (existingBill) {
          await supabase.from('power_bill_jobs').update({ job_status: 'completed', result: { message: 'Bill already exists' } }).eq('id', jobId);
          continue;
        }

        const { data: newBill, error: insertError } = await supabase
          .from('asset_power_bills')
          .insert({
            asset_id: asset.id, unique_service_number: bill.unique_service_number,
            consumer_name: bill.consumer_name || asset.consumer_name,
            service_number: bill.service_number || asset.service_number,
            ero_name: bill.ero_name || asset.ero, section_name: bill.section_name || asset.section_name,
            consumer_address: bill.consumer_address, bill_date: bill.bill_date, due_date: bill.due_date,
            bill_month: billMonth, bill_amount: bill.bill_amount || 0,
            energy_charges: bill.energy_charges || 0, fixed_charges: bill.fixed_charges || 0,
            arrears: bill.arrears || 0, total_due: bill.total_due || bill.bill_amount || 0,
            payment_status: 'Pending',
          })
          .select().single();

        if (insertError) throw insertError;

        const { data: expenseId } = await supabase.rpc('generate_expense_id');
        await supabase.from('expenses').insert({
          id: expenseId, bill_id: newBill.id, category: 'Power Bill', vendor_name: 'TGSPDCL',
          amount: newBill.bill_amount || 0, gst_percent: 0, gst_amount: 0,
          total_amount: newBill.total_due || 0, payment_status: 'Pending',
          notes: `Auto-generated from power bill ${billMonth} for asset ${asset.id}`, bill_month: billMonth,
        });

        await supabase.from('power_bill_jobs').update({ job_status: 'completed', result: { billAmount: newBill.bill_amount } }).eq('id', jobId);
        results.push({ assetId: asset.id, success: true, billAmount: newBill.bill_amount });
        successCount++;

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await supabase.from('power_bill_jobs').update({ job_status: 'failed', error_message: errorMessage }).eq('id', jobId);
        results.push({ assetId: asset.id, success: false, error: errorMessage });
      }
    }

    console.log(`Job completed: ${successCount} successful, ${failureCount} failed`);

    await logSecurityAudit({
      functionName: 'tgspdcl-monthly-job', action: 'cron_bill_fetch',
      status: 'success', metadata: { total: assets?.length || 0, successCount, failureCount },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Monthly bill fetch completed', summary: { total: assets?.length || 0, successful: successCount, failed: failureCount }, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Critical error in monthly job:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}));

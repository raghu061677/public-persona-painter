// v2.0 - Phase-5: HMAC-protected system endpoint
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';
import { withHmac, supabaseServiceClient, logSecurityAudit } from '../_shared/auth.ts';

Deno.serve(withHmac(async (_req, _rawBody) => {
  try {
    console.log('Starting monthly power bills fetch job...');

    const supabase = supabaseServiceClient();

    // Fetch all media assets with unique service numbers and illumination
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, unique_service_number, service_number, consumer_name, ero, section_name, location, area, city, illumination')
      .not('unique_service_number', 'is', null)
      .not('illumination', 'is', null)
      .neq('illumination', '');

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${assets?.length || 0} illuminated assets with unique service numbers`);

    const results = {
      total: assets?.length || 0,
      success: 0,
      failed: 0,
      skipped: 0,
      newBills: 0,
      anomaliesDetected: 0,
      expensesCreated: 0,
      details: [] as FetchResult[],
    };

    // Process each asset with job tracking and anomaly detection
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

        console.log(`Fetching bill for asset ${asset.id} (${asset.location})`);

        const { data: billData, error: billError } = await supabase.functions.invoke(
          'fetch-tgspdcl-bill',
          {
            body: {
              uniqueServiceNumber: asset.unique_service_number,
              assetId: asset.id
            }
          }
        );

        if (billError || !billData?.success) {
          throw new Error(billData?.error || billError?.message || 'Unknown error');
        }

        const bill = billData.data;
        const billMonth = bill.bill_month || new Date().toISOString().split('T')[0];

        // Check if bill exists
        const { data: existingBill } = await supabase
          .from('asset_power_bills')
          .select('id')
          .eq('asset_id', asset.id)
          .eq('bill_month', billMonth)
          .maybeSingle();

        if (existingBill) {
          results.skipped++;
          await supabase.from('power_bill_jobs').update({
            job_status: 'completed',
            result: { message: 'Bill already exists' },
          }).eq('id', jobId);
          continue;
        }

        // Anomaly detection
        const { data: recentBills } = await supabase
          .from('asset_power_bills')
          .select('bill_amount')
          .eq('asset_id', asset.id)
          .order('bill_month', { ascending: false })
          .limit(6);

        let isAnomaly = false;
        let anomalyType = null;
        let anomalyDetails = {};

        if (recentBills && recentBills.length > 0) {
          const avgAmount = recentBills.reduce((sum, b) => sum + (b.bill_amount || 0), 0) / recentBills.length;
          const currentAmount = bill.bill_amount || bill.total_due || 0;

          if (currentAmount > avgAmount * 1.35) {
            isAnomaly = true;
            anomalyType = 'high_spike';
            anomalyDetails = {
              currentAmount,
              averageAmount: avgAmount,
              percentageIncrease: ((currentAmount - avgAmount) / avgAmount * 100).toFixed(2),
            };
            results.anomaliesDetected++;
          }
        }

        // Insert new bill
        const { data: newBill } = await supabase
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
            is_anomaly: isAnomaly,
            anomaly_type: anomalyType,
            anomaly_details: anomalyDetails,
          })
          .select()
          .single();

        results.newBills++;

        // Auto-create expense
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

        results.expensesCreated++;
        results.success++;

        await supabase.from('power_bill_jobs').update({
          job_status: 'completed',
          result: { billAmount: newBill.bill_amount, isAnomaly },
        }).eq('id', jobId);

        results.details.push({
          assetId: asset.id,
          location: asset.location,
          success: true,
          billAmount: newBill.bill_amount,
        });

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await supabase.from('power_bill_jobs').update({
          job_status: 'failed',
          error_message: errorMessage,
        }).eq('id', jobId);

        results.details.push({
          assetId: asset.id,
          location: asset.location,
          success: false,
          error: errorMessage,
        });
      }
    }

    console.log('Monthly power bills fetch job completed:', results);

    // Trigger reminder emails for pending bills
    if (results.success > 0) {
      try {
        console.log('Triggering power bill reminders...');
        const { error: reminderError } = await supabase.functions.invoke('send-power-bill-reminders');
        if (reminderError) {
          console.error('✗ Failed to send reminders:', reminderError);
        } else {
          console.log('✓ Power bill reminders sent');
        }
      } catch (reminderError) {
        console.error('✗ Error triggering reminders:', reminderError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monthly power bills fetch completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Critical error in monthly power bills job:', error);
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
}));

async function sendJobCompletionEmail(
  supabase: any,
  summary: any,
  results: FetchResult[]
) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email');
    return;
  }

  const { Resend } = await import('https://esm.sh/resend@2.0.0');
  const resend = new Resend(RESEND_API_KEY);

  const successfulBills = results.filter(r => r.success);
  const totalAmount = successfulBills.reduce((sum, r) => sum + (r.billAmount || 0), 0);
  
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const successRows = successfulBills.slice(0, 20).map(r => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${r.assetId}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${r.location}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #10b981;">✓</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatINR(r.billAmount || 0)}</td>
    </tr>
  `).join('');

  const failureRows = results.filter(r => !r.success).slice(0, 10).map(r => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${r.assetId}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${r.location}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;">✗ ${r.error || 'Unknown'}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Monthly Power Bills Fetch - Job Completed</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">⚡ Monthly Power Bills Fetch</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Automated Job Completed</p>
      </div>
      
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <div style="background: ${summary.failureCount === 0 ? '#d1fae5' : '#fef3c7'}; border-left: 4px solid ${summary.failureCount === 0 ? '#10b981' : '#f59e0b'}; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
          <p style="margin: 0; font-weight: 600; color: ${summary.failureCount === 0 ? '#065f46' : '#92400e'};">
            ${summary.failureCount === 0 ? '✓ All bills fetched successfully!' : `⚠️ ${summary.successCount} of ${summary.totalAssets} bills fetched`}
          </p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
          <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">Job Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Total Assets</p>
              <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: 700; color: #1e40af;">${summary.totalAssets}</p>
            </div>
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Successful</p>
              <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: 700; color: #10b981;">${summary.successCount}</p>
            </div>
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Failed</p>
              <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: 700; color: #dc2626;">${summary.failureCount}</p>
            </div>
            <div style="text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Total Amount</p>
              <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 700; color: #1e40af;">${formatINR(totalAmount)}</p>
            </div>
          </div>
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Completion Rate</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 700; color: #1e40af;">${summary.completionRate}</p>
          </div>
        </div>

        ${successfulBills.length > 0 ? `
        <h3 style="color: #1f2937; margin: 0 0 15px 0;">✓ Successfully Fetched Bills</h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Asset ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Location</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Status</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${successRows}
          </tbody>
        </table>
        ` : ''}

        ${summary.failureCount > 0 ? `
        <h3 style="color: #dc2626; margin: 0 0 15px 0;">✗ Failed to Fetch</h3>
        <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px;">
          <thead>
            <tr style="background: #fef2f2;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b; border-bottom: 2px solid #dc2626;">Asset ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b; border-bottom: 2px solid #dc2626;">Location</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #991b1b; border-bottom: 2px solid #dc2626;">Error</th>
            </tr>
          </thead>
          <tbody>
            ${failureRows}
          </tbody>
        </table>
        ` : ''}

        <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
          <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e40af;">📝 Next Steps:</p>
          <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
            <li>Pending payment reminders have been automatically sent</li>
            <li>Review the Power Bills Dashboard for detailed bill information</li>
            <li>Failed fetches may require manual bill entry or retry</li>
            <li>Check asset service numbers for failed assets</li>
          </ul>
        </div>

        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">Automated job completed at: ${new Date(summary.jobRunAt).toLocaleString('en-IN')}</p>
          <p style="margin: 5px 0 0 0;"><strong>Go-Ads 360°</strong> Power Bills Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Fetch admin users dynamically
  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  const adminEmails: string[] = [];
  if (admins && admins.length > 0) {
    for (const admin of admins) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(admin.user_id);
        if (userData?.user?.email) {
          adminEmails.push(userData.user.email);
        }
      } catch (err) {
        console.error('Error fetching admin email:', err);
      }
    }
  }

  // Fallback to default admin email if no admins found
  const toEmails = adminEmails.length > 0 ? adminEmails : ['raghu@go-ads.in'];

  const { data, error } = await resend.emails.send({
    from: 'Go-Ads Power Bills <onboarding@resend.dev>',
    to: toEmails,
    subject: `⚡ Monthly Power Bills Fetched: ${summary.successCount}/${summary.totalAssets} Assets (${summary.completionRate})`,
    html,
  });

  if (error) {
    console.error('Error sending job completion email:', error);
    throw error;
  }

  console.log('Job completion email sent:', data);
}

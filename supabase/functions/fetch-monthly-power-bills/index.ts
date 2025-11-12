import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FetchResult {
  assetId: string;
  location: string;
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
    console.log('Starting monthly power bills fetch job...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all media assets with unique service numbers and illumination
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, unique_service_number, service_number, location, area, city, illumination')
      .not('unique_service_number', 'is', null)
      .eq('illumination', 'Yes');

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${assets?.length || 0} illuminated assets with unique service numbers`);

    let successCount = 0;
    let failureCount = 0;
    const results: FetchResult[] = [];

    // Process each asset
    for (const asset of assets || []) {
      try {
        console.log(`Fetching bill for asset ${asset.id} (${asset.location})`);

        // Call the fetch-tgspdcl-bill function with unique service number
        const { data: billData, error: billError } = await supabase.functions.invoke(
          'fetch-tgspdcl-bill',
          {
            body: {
              uniqueServiceNumber: asset.unique_service_number,
              assetId: asset.id
            }
          }
        );

        if (billError) {
          throw billError;
        }

        if (billData?.success) {
          successCount++;
          results.push({
            assetId: asset.id,
            location: asset.location,
            success: true,
            billAmount: billData.bill?.total_due || 0
          });
          console.log(`✓ Successfully fetched bill for ${asset.id}`);
        } else {
          failureCount++;
          results.push({
            assetId: asset.id,
            location: asset.location,
            success: false,
            error: billData?.error || 'Unknown error'
          });
          console.error(`✗ Failed to fetch bill for ${asset.id}: ${billData?.error}`);
        }

        // Add small delay to avoid overwhelming the TGSPDCL server
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          assetId: asset.id,
          location: asset.location,
          success: false,
          error: errorMessage
        });
        console.error(`✗ Error fetching bill for ${asset.id}:`, errorMessage);
      }
    }

    // Create summary
    const summary = {
      jobRunAt: new Date().toISOString(),
      totalAssets: assets?.length || 0,
      successCount,
      failureCount,
      failures: results.filter(r => !r.success).slice(0, 10),
      completionRate: assets?.length ? ((successCount / assets.length) * 100).toFixed(2) + '%' : '0%'
    };

    console.log('Monthly power bills fetch job completed:', summary);

    // Send email notification with job results
    try {
      await sendJobCompletionEmail(supabase, summary, results);
      console.log('✓ Job completion email sent');
    } catch (emailError) {
      console.error('✗ Failed to send job completion email:', emailError);
    }

    // Trigger reminder emails for pending bills
    if (successCount > 0) {
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
        summary
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
});

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

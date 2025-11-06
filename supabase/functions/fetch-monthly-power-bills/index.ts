import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch all media assets with service numbers
    const { data: assets, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, service_number, location, area, city')
      .not('service_number', 'is', null);

    if (assetsError) {
      console.error('Error fetching assets:', assetsError);
      throw assetsError;
    }

    console.log(`Found ${assets?.length || 0} assets with service numbers`);

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ assetId: string; error: string }> = [];

    // Process each asset
    for (const asset of assets || []) {
      try {
        console.log(`Fetching bill for asset ${asset.id} (${asset.location})`);

        // Call the fetch-tgspdcl-bill function
        const { data: billData, error: billError } = await supabase.functions.invoke(
          'fetch-tgspdcl-bill',
          {
            body: {
              serviceNumber: asset.service_number,
              assetId: asset.id
            }
          }
        );

        if (billError) {
          throw billError;
        }

        if (billData?.success) {
          successCount++;
          console.log(`✓ Successfully fetched bill for ${asset.id}`);
        } else {
          failureCount++;
          failures.push({
            assetId: asset.id,
            error: billData?.error || 'Unknown error'
          });
          console.error(`✗ Failed to fetch bill for ${asset.id}: ${billData?.error}`);
        }

        // Add small delay to avoid overwhelming the TGSPDCL server
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failures.push({
          assetId: asset.id,
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
      failures: failures.slice(0, 10), // Limit to first 10 failures
      completionRate: assets?.length ? ((successCount / assets.length) * 100).toFixed(2) + '%' : '0%'
    };

    console.log('Monthly power bills fetch job completed:', summary);

    // Store job log in database for tracking
    const { error: logError } = await supabase
      .from('email_logs') // Using existing logs table as example - you could create a dedicated jobs log table
      .insert({
        gmail_message_id: `monthly-job-${Date.now()}`,
        sender_email: 'system@scheduler',
        subject: 'Monthly Power Bills Fetch Job',
        body_preview: JSON.stringify(summary),
        parsing_status: successCount === summary.totalAssets ? 'success' : 'partial_failure',
        ai_parsed_data: summary
      });

    if (logError) {
      console.error('Error logging job result:', logError);
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

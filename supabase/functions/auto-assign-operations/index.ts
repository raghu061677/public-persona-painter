import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

interface AssignmentRequest {
  campaign_id: string;
  company_id: string;
  assigned_by: string;
}

interface Mounter {
  id: string;
  name: string;
  zone: string | null;
  sub_zone: string | null;
  area: string | null;
  capacity_per_day: number;
  active: boolean;
}

interface MediaAsset {
  id: string;
  zone: string | null;
  sub_zone: string | null;
  area: string | null;
  city: string;
  location: string;
}

interface CampaignAsset {
  id: string;
  asset_id: string;
  campaign_id: string;
  installation_status: string;
}

interface WorkloadResult {
  mounter_id: string;
  count: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, company_id, assigned_by }: AssignmentRequest = await req.json();

    if (!campaign_id || !company_id || !assigned_by) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: campaign_id, company_id, assigned_by' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Auto-assigning operations for campaign ${campaign_id}`);

    // Check if operations already exist for this campaign (idempotency)
    const { data: existingOps, error: checkError } = await supabase
      .from('operations')
      .select('id')
      .eq('campaign_id', campaign_id)
      .limit(1);

    if (checkError) {
      throw new Error(`Failed to check existing operations: ${checkError.message}`);
    }

    if (existingOps && existingOps.length > 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Operations already assigned for this campaign',
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all active mounters for this company
    const { data: mounters, error: mountersError } = await supabase
      .from('mounters')
      .select('*')
      .eq('company_id', company_id)
      .eq('active', true);

    if (mountersError) {
      throw new Error(`Failed to fetch mounters: ${mountersError.message}`);
    }

    // IMPORTANT: Return 200 so the web client doesn't treat this as a transport failure
    // (Supabase invoke marks any non-2xx as FunctionsHttpError).
    if (!mounters || mounters.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'NO_ACTIVE_MOUNTERS',
          error: 'No active mounters found for this company',
          message: 'Please add at least one active mounter for this company before running auto-assign.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current workload for all mounters
    const { data: workloadData, error: workloadError } = await supabase
      .rpc('get_mounter_workload', { p_company_id: company_id });

    if (workloadError) {
      console.error('Workload fetch error:', workloadError);
    }

    const workloadMap = new Map<string, number>();
    if (workloadData) {
      workloadData.forEach((item: WorkloadResult) => {
        workloadMap.set(item.mounter_id, item.count || 0);
      });
    }

    // Fetch campaign assets
    const { data: campaignAssets, error: assetsError } = await supabase
      .from('campaign_assets')
      .select('id, asset_id, campaign_id, installation_status')
      .eq('campaign_id', campaign_id);

    if (assetsError) {
      throw new Error(`Failed to fetch campaign assets: ${assetsError.message}`);
    }

    if (!campaignAssets || campaignAssets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No assets found for this campaign' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch media asset details (zone, sub_zone, area)
    const assetIds = campaignAssets.map((ca: CampaignAsset) => ca.asset_id);
    const { data: mediaAssets, error: mediaError } = await supabase
      .from('media_assets')
      .select('id, zone, sub_zone, area, city, location')
      .in('id', assetIds);

    if (mediaError) {
      throw new Error(`Failed to fetch media assets: ${mediaError.message}`);
    }

    const mediaAssetsMap = new Map<string, MediaAsset>();
    if (mediaAssets) {
      mediaAssets.forEach((ma: MediaAsset) => {
        mediaAssetsMap.set(ma.id, ma);
      });
    }

    // Status hierarchy - don't regress past these levels
    const statusHierarchy = ['Pending', 'Assigned', 'Installed', 'Proof Uploaded', 'Verified'];
    const assignedIndex = statusHierarchy.indexOf('Assigned');

    // Assign each asset to best mounter
    const operations = [];
    const campaignAssetUpdates = [];

    for (const campaignAsset of campaignAssets) {
      const mediaAsset = mediaAssetsMap.get(campaignAsset.asset_id);
      
      if (!mediaAsset) {
        console.warn(`Media asset not found for campaign asset ${campaignAsset.id}`);
        continue;
      }

      // Find best mounter based on zone/sub_zone/area match and workload
      let bestMounter: Mounter | null = null;
      let bestScore = -1;

      for (const mounter of mounters as Mounter[]) {
        let score = 0;
        const currentWorkload = workloadMap.get(mounter.id) || 0;

        // Prioritize zone match
        if (mounter.zone && mediaAsset.zone && mounter.zone === mediaAsset.zone) {
          score += 100;
        }

        // Sub-zone match
        if (mounter.sub_zone && mediaAsset.sub_zone && mounter.sub_zone === mediaAsset.sub_zone) {
          score += 50;
        }

        // Area match
        if (mounter.area && mediaAsset.area && mounter.area === mediaAsset.area) {
          score += 25;
        }

        // Penalize by workload (fewer tasks = better)
        score -= currentWorkload * 10;

        // Check capacity
        if (currentWorkload >= mounter.capacity_per_day) {
          score -= 1000; // Heavy penalty for over-capacity
        }

        if (score > bestScore) {
          bestScore = score;
          bestMounter = mounter;
        }
      }

      if (!bestMounter) {
        console.warn(`No suitable mounter found for asset ${mediaAsset.id}`);
        continue;
      }

      // Create operation record
      operations.push({
        company_id,
        campaign_id,
        asset_id: mediaAsset.id,
        mounter_id: bestMounter.id,
        assigned_by,
        assigned_at: new Date().toISOString(),
        deadline: null,
        status: 'Assigned',
      });

      // Don't regress status if asset has already progressed past Assigned
      const currentStatus = campaignAsset.installation_status || 'Pending';
      const currentIndex = statusHierarchy.indexOf(currentStatus);
      const shouldUpdateStatus = currentIndex < assignedIndex || currentIndex === -1;

      // Update campaign asset
      campaignAssetUpdates.push({
        id: campaignAsset.id,
        installation_status: shouldUpdateStatus ? 'Assigned' : currentStatus,
        assigned_mounter_id: bestMounter.id,
      });

      // Update workload map
      workloadMap.set(bestMounter.id, (workloadMap.get(bestMounter.id) || 0) + 1);
    }

    // Batch insert operations
    if (operations.length > 0) {
      const { error: insertError } = await supabase
        .from('operations')
        .insert(operations);

      if (insertError) {
        throw new Error(`Failed to insert operations: ${insertError.message}`);
      }

      console.log(`Inserted ${operations.length} operations`);
    }

    // Batch update campaign assets
    if (campaignAssetUpdates.length > 0) {
      for (const update of campaignAssetUpdates) {
        const { error: updateError } = await supabase
          .from('campaign_assets')
          .update({
            installation_status: update.installation_status,
            assigned_mounter_id: update.assigned_mounter_id,
          })
          .eq('id', update.id);

        if (updateError) {
          console.error(`Failed to update campaign asset ${update.id}:`, updateError);
        }
      }

      console.log(`Updated ${campaignAssetUpdates.length} campaign assets`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Operations auto-assigned successfully',
        assigned_count: operations.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-assign error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

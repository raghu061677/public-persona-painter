import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssetItem {
  asset_id: string;
  display_from: string;
  display_to: string;
  sales_price: number;
  printing_cost: number;
  mounting_cost: number;
  negotiated_price?: number;
}

interface RequestBody {
  company_id: string;
  client_id: string;
  campaign_name: string;
  start_date: string;
  end_date: string;
  notes?: string;
  assets: AssetItem[];
  created_by: string;
  auto_assign?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      company_id,
      client_id,
      campaign_name,
      start_date,
      end_date,
      notes,
      assets,
      created_by,
      auto_assign = false,
    } = await req.json() as RequestBody;

    console.log('Creating direct campaign:', campaign_name);

    // Verify user access to company
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id, role')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .single();
    
    if (!companyUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No access to this company' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!campaign_name || !client_id || !start_date || !end_date || !assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client name
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    if (!client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate campaign code
    const { data: codeData, error: codeError } = await supabase.rpc('generate_campaign_code', {
      p_company_id: company_id,
    });

    const campaign_code = codeData || `CAM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    console.log('Generated campaign code:', campaign_code);

    // Calculate totals
    let subtotal = 0;
    let printing_total = 0;
    let mounting_total = 0;
    
    assets.forEach(asset => {
      const effectivePrice = asset.negotiated_price || asset.sales_price;
      subtotal += effectivePrice;
      printing_total += asset.printing_cost;
      mounting_total += asset.mounting_cost;
    });

    const total_amount = subtotal + printing_total + mounting_total;
    const gst_percent = 18;
    const gst_amount = total_amount * (gst_percent / 100);
    const grand_total = total_amount + gst_amount;

    // Insert campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: campaign_code,
        company_id,
        client_id,
        client_name: client.name,
        campaign_name,
        start_date,
        end_date,
        notes,
        status: 'Planned',
        total_assets: assets.length,
        total_amount,
        gst_percent,
        gst_amount,
        grand_total,
        subtotal,
        printing_total,
        mounting_total,
        created_from: 'direct',
        plan_id: null,
        created_by: created_by || user.id,
        public_share_enabled: true,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      throw campaignError;
    }

    console.log('Campaign created:', campaign.id);

    // Fetch full asset details for campaign_assets
    const assetIds = assets.map(a => a.asset_id);
    const { data: assetDetails, error: assetsError } = await supabase
      .from('media_assets')
      .select('id, location, city, area, media_type, latitude, longitude')
      .in('id', assetIds);

    if (assetsError) {
      console.error('Error fetching asset details:', assetsError);
      throw assetsError;
    }

    const assetMap = new Map(assetDetails?.map(a => [a.id, a]) || []);

    // Insert campaign assets
    const campaignAssets = assets.map(asset => {
      const assetDetail = assetMap.get(asset.asset_id);
      if (!assetDetail) {
        throw new Error(`Asset ${asset.asset_id} not found`);
      }

      return {
        campaign_id: campaign.id,
        asset_id: asset.asset_id,
        location: assetDetail.location,
        city: assetDetail.city,
        area: assetDetail.area,
        media_type: assetDetail.media_type,
        card_rate: asset.sales_price,
        printing_charges: asset.printing_cost,
        mounting_charges: asset.mounting_cost,
        latitude: assetDetail.latitude,
        longitude: assetDetail.longitude,
        status: 'Pending',
      };
    });

    const { error: assetsInsertError } = await supabase
      .from('campaign_assets')
      .insert(campaignAssets);

    if (assetsInsertError) {
      console.error('Error inserting campaign assets:', assetsInsertError);
      throw assetsInsertError;
    }

    console.log(`Inserted ${campaignAssets.length} campaign assets`);

    // Auto-assign operations if requested
    if (auto_assign) {
      console.log('Auto-assigning operations...');
      
      const { error: assignError } = await supabase.functions.invoke('auto-assign-operations', {
        body: {
          campaign_id: campaign.id,
          company_id,
          assigned_by: user.id,
        },
      });

      if (assignError) {
        console.error('Error auto-assigning operations:', assignError);
        // Don't fail the whole request if auto-assign fails
      } else {
        console.log('Operations auto-assigned successfully');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: campaign.id,
        campaign_code,
        total_assets: assets.length,
        grand_total,
        auto_assigned: auto_assign,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating direct campaign:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create campaign',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for duplicate media asset codes...");

    // Check for duplicates in media_asset_code
    const { data: duplicateCodes, error: dupsError } = await supabase
      .from('media_assets')
      .select('media_asset_code, id')
      .not('media_asset_code', 'is', null);

    if (dupsError) throw dupsError;

    // Group by code and count
    const codeMap = new Map<string, string[]>();
    (duplicateCodes || []).forEach(asset => {
      const code = asset.media_asset_code;
      if (!codeMap.has(code)) {
        codeMap.set(code, []);
      }
      codeMap.get(code)!.push(asset.id);
    });

    const duplicates = Array.from(codeMap.entries())
      .filter(([_, ids]) => ids.length > 1)
      .map(([code, ids]) => ({ code, count: ids.length, asset_ids: ids }));

    // Check for assets without codes
    const { data: missingCodes, error: missingError } = await supabase
      .from('media_assets')
      .select('id, city, media_type')
      .is('media_asset_code', null);

    if (missingError) throw missingError;

    const summary = {
      total_assets_checked: duplicateCodes?.length || 0,
      duplicates_found: duplicates.length,
      assets_without_code: missingCodes?.length || 0,
      duplicates,
      missing_codes: missingCodes || [],
    };

    console.log("Duplicate check complete:", summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Duplicate check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

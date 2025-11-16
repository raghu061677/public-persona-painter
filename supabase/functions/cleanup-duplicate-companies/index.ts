import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get current user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is platform admin
    const { data: isPlatformAdmin } = await supabaseClient.rpc('is_platform_admin', {
      _user_id: user.id
    });

    if (!isPlatformAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only platform admins can cleanup companies' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find duplicate companies by name
    const { data: companies, error: fetchError } = await supabaseClient
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // Group companies by name
    const companyGroups = new Map<string, any[]>();
    companies?.forEach(company => {
      const name = company.name.toLowerCase().trim();
      if (!companyGroups.has(name)) {
        companyGroups.set(name, []);
      }
      companyGroups.get(name)!.push(company);
    });

    // Find duplicates
    const duplicates: any[] = [];
    const toDelete: string[] = [];
    
    companyGroups.forEach((group, name) => {
      if (group.length > 1) {
        // Keep the first (oldest) company, mark others for deletion
        const [keep, ...remove] = group;
        duplicates.push({
          name,
          kept: keep.id,
          removed: remove.map(c => c.id)
        });
        toDelete.push(...remove.map(c => c.id));
      }
    });

    if (toDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No duplicate companies found',
          duplicates: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete duplicate companies
    const { error: deleteError } = await supabaseClient
      .from('companies')
      .delete()
      .in('id', toDelete);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ 
        message: `Deleted ${toDelete.length} duplicate companies`,
        duplicates,
        deletedCount: toDelete.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


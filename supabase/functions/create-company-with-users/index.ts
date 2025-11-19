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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the requester is a platform admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is platform admin
    const { data: companyUsers } = await supabaseClient
      .from('company_users')
      .select('company_id, companies!inner(type)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    const isPlatformAdmin = companyUsers?.some(
      (cu: any) => cu.companies.type === 'platform_admin'
    );

    if (!isPlatformAdmin) {
      throw new Error('Only platform admins can create companies with users');
    }

    const { companyData, users } = await req.json();

    // Create company
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .insert({
        name: companyData.name,
        legal_name: companyData.legal_name || null,
        type: companyData.type,
        gstin: companyData.gstin || null,
        pan: companyData.pan || null,
        email: companyData.email || null,
        phone: companyData.phone || null,
        address_line1: companyData.address_line1 || null,
        address_line2: companyData.address_line2 || null,
        city: companyData.city || null,
        state: companyData.state || null,
        pincode: companyData.pincode || null,
        website: companyData.website || null,
        status: 'active',
        created_by: user.id,
      })
      .select()
      .single();

    if (companyError) throw companyError;

    const createdUsers = [];

    // Create users if provided
    if (users && users.length > 0) {
      for (const userData of users) {
        // Create auth user
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password || Math.random().toString(36).slice(-12),
          email_confirm: true,
          user_metadata: {
            name: userData.name,
          },
        });

        if (authError) {
          console.error('Error creating user:', authError);
          continue;
        }

        // Create profile
        await supabaseClient
          .from('profiles')
          .insert({
            id: authUser.user.id,
            username: userData.name,
          });

        // Link user to company
        await supabaseClient
          .from('company_users')
          .insert({
            company_id: company.id,
            user_id: authUser.user.id,
            role: userData.role || 'user',
            is_primary: userData.is_primary || false,
            status: 'active',
            invited_by: user.id,
          });

        createdUsers.push({
          email: userData.email,
          name: userData.name,
          role: userData.role,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        company,
        users: createdUsers,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

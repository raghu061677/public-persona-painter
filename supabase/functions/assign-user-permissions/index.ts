import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// All available modules in the system
const ALL_MODULES = [
  'clients',
  'media_assets',
  'plans',
  'campaigns',
  'operations',
  'finance',
  'invoices',
  'expenses',
  'power_bills',
  'reports',
  'settings',
  'users',
  'companies'
];

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

    // Check if user is platform admin or company admin
    const { data: isPlatformAdmin } = await supabaseClient.rpc('is_platform_admin', {
      _user_id: user.id
    });

    const { data: hasAdminRole } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isPlatformAdmin && !hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Only admins can assign permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, role, modules } = await req.json();

    if (!userId || !role) {
      return new Response(
        JSON.stringify({ error: 'userId and role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which modules to assign
    const modulesToAssign = modules === 'all' ? ALL_MODULES : (modules || []);

    // Assign role-based permissions for all modules
    const permissions = modulesToAssign.map((module: string) => {
      let modulePermissions = {
        module_name: module,
        can_view: false,
        can_create: false,
        can_update: false,
        can_delete: false
      };

      // Set permissions based on role
      switch (role) {
        case 'admin':
          modulePermissions = {
            ...modulePermissions,
            can_view: true,
            can_create: true,
            can_update: true,
            can_delete: true
          };
          break;
        
        case 'sales':
          if (['clients', 'media_assets', 'plans', 'campaigns', 'reports'].includes(module)) {
            modulePermissions = {
              ...modulePermissions,
              can_view: true,
              can_create: true,
              can_update: true,
              can_delete: false
            };
          } else if (['operations', 'finance', 'invoices', 'expenses'].includes(module)) {
            modulePermissions = {
              ...modulePermissions,
              can_view: true,
              can_create: false,
              can_update: false,
              can_delete: false
            };
          }
          break;
        
        case 'operations':
          if (['campaigns', 'operations', 'media_assets', 'power_bills'].includes(module)) {
            modulePermissions = {
              ...modulePermissions,
              can_view: true,
              can_create: true,
              can_update: true,
              can_delete: false
            };
          } else if (['clients', 'plans', 'reports'].includes(module)) {
            modulePermissions = {
              ...modulePermissions,
              can_view: true,
              can_create: false,
              can_update: false,
              can_delete: false
            };
          }
          break;
        
        case 'finance':
          if (['finance', 'invoices', 'expenses', 'power_bills', 'clients', 'reports'].includes(module)) {
            modulePermissions = {
              ...modulePermissions,
              can_view: true,
              can_create: true,
              can_update: true,
              can_delete: false
            };
          } else if (['campaigns', 'plans', 'media_assets'].includes(module)) {
            modulePermissions = {
              ...modulePermissions,
              can_view: true,
              can_create: false,
              can_update: false,
              can_delete: false
            };
          }
          break;
        
        default: // user role
          modulePermissions = {
            ...modulePermissions,
            can_view: true,
            can_create: false,
            can_update: false,
            can_delete: false
          };
      }

      return modulePermissions;
    });

    // Insert permissions into role_permissions table
    for (const permission of permissions) {
      await supabaseClient
        .from('role_permissions')
        .upsert({
          role,
          ...permission
        }, {
          onConflict: 'role,module_name'
        });
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully assigned ${permissions.length} module permissions to ${role} role`,
        permissions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error assigning permissions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

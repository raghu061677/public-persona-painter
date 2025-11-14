import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccessRequestNotification {
  userId: string;
  userEmail: string;
  requestedRole: string;
  requestedModule: string;
  currentRoles: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { userId, userEmail, requestedRole, requestedModule, currentRoles }: AccessRequestNotification = await req.json();

    // Get user profile info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const userName = profile?.username || userEmail?.split('@')[0] || 'Unknown User';

    // Get all admin users
    const { data: adminRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ error: 'No administrators found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Get admin email addresses
    const { data: adminUsers } = await supabaseClient.auth.admin.listUsers();
    const adminEmails = adminUsers.users
      .filter(u => adminUserIds.includes(u.id))
      .map(u => u.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.log('No admin email addresses found');
      return new Response(
        JSON.stringify({ error: 'No administrator emails found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Send email to all admins if RESEND_API_KEY is configured
    if (RESEND_API_KEY) {
      const currentRolesText = currentRoles.length > 0 
        ? currentRoles.join(', ') 
        : 'No roles assigned';

      const emailHtml = `
        <h2>New Access Request</h2>
        <p>A user has requested additional permissions in Go-Ads 360°.</p>
        
        <h3>Request Details:</h3>
        <ul>
          <li><strong>User:</strong> ${userName} (${userEmail})</li>
          <li><strong>Current Roles:</strong> ${currentRolesText}</li>
          <li><strong>Requested Role:</strong> ${requestedRole}</li>
          <li><strong>Requested Module:</strong> ${requestedModule}</li>
          <li><strong>Request Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>

        <h3>Action Required:</h3>
        <p>Please log in to the Go-Ads 360° admin panel to review and approve or deny this request.</p>
        
        <p>Go to Settings → User Management to manage this request.</p>
        
        <hr />
        <p style="color: #666; font-size: 12px;">
          This is an automated notification from Go-Ads 360°. Please do not reply to this email.
        </p>
      `;

      for (const adminEmail of adminEmails) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'Go-Ads 360° <noreply@updates.lovable.app>',
            to: [adminEmail],
            subject: `Access Request: ${userName} requests ${requestedRole} role`,
            html: emailHtml,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          console.error('Resend API error:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification sent to ${adminEmails.length} administrator(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

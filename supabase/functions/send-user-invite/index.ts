import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: string;
  inviterName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, role, inviterName }: InviteRequest = await req.json();

    if (!email || !role) {
      throw new Error("Email and role are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create temporary password
    const tempPassword = crypto.randomUUID();

    // Create user via admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: { role },
    });

    if (userError) throw userError;

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (resetError) throw resetError;

    // Send invitation email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
    .info-box { background: white; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Welcome to Go-Ads 360°</h1>
      <p style="margin: 10px 0 0; opacity: 0.9;">Your OOH Media Management Platform</p>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>Go-Ads 360°</strong> as a <strong style="text-transform: capitalize;">${role}</strong>.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #1e40af;">Your Account Details</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Role:</strong> <span style="text-transform: capitalize;">${role}</span></p>
      </div>

      <p>To get started, click the button below to set up your password and access your account:</p>
      
      <div style="text-align: center;">
        <a href="${resetData.properties.action_link}" class="button">Set Up Your Account</a>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #10b981;">What You Can Do</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${role === 'admin' ? `
            <li>Full system access and user management</li>
            <li>Configure settings and permissions</li>
            <li>Manage all clients, plans, and campaigns</li>
          ` : role === 'sales' ? `
            <li>Manage clients and leads</li>
            <li>Create and edit media plans</li>
            <li>Generate quotations and proposals</li>
          ` : role === 'operations' ? `
            <li>Manage campaigns and mounting tasks</li>
            <li>Track inventory and assets</li>
            <li>Upload proof of performance</li>
          ` : role === 'finance' ? `
            <li>Manage invoices and expenses</li>
            <li>Track payments and financial reports</li>
            <li>Generate financial analytics</li>
          ` : ''}
        </ul>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
        This invitation link will expire in 24 hours. If you have any questions, please contact your administrator.
      </p>
    </div>
    <div class="footer">
      <p>© 2025 Go-Ads 360°. All rights reserved.</p>
      <p>OOH Media Management Platform</p>
    </div>
  </div>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Go-Ads 360° <noreply@go-ads.com>",
        to: [email],
        subject: `You've been invited to Go-Ads 360°`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

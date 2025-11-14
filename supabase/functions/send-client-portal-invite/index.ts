import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  clientId: string;
  email: string;
  expiresInHours?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { clientId, email, expiresInHours = 72 }: InviteRequest = await req.json();

    // Generate secure token
    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Get auth header
    const authHeader = req.headers.get("authorization");
    const jwt = authHeader?.replace("Bearer ", "");

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt || "");
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name, company")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      throw new Error("Client not found");
    }

    // Create portal access record
    const { error: insertError } = await supabase
      .from("client_portal_access")
      .insert({
        client_id: clientId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        is_active: true,
      });

    if (insertError) {
      throw insertError;
    }

    // Generate magic link
    const portalUrl = `${req.headers.get("origin") || SUPABASE_URL}/portal/auth?token=${token}`;

    // Send email using Resend
    if (RESEND_API_KEY) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Go-Ads 360° <noreply@go-ads.in>",
          to: [email],
          subject: "Access Your Campaign Portal - Go-Ads 360°",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #1e40af 0%, #10b981 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 14px; }
                .info-box { background: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎯 Portal Access Invitation</h1>
                </div>
                <div class="content">
                  <p>Hello ${client.name || 'Valued Client'},</p>
                  
                  <p>You've been invited to access your dedicated campaign portal for <strong>${client.company || 'your organization'}</strong>.</p>
                  
                  <div class="info-box">
                    <h3>📊 What You Can Do:</h3>
                    <ul>
                      <li>View real-time campaign progress</li>
                      <li>Access proof of performance photos</li>
                      <li>Download invoices and reports</li>
                      <li>Track installation status</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="${portalUrl}" class="button">Access Your Portal</a>
                  </div>
                  
                  <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                    ⏰ This link will expire in ${expiresInHours} hours for security purposes.
                  </p>
                  
                  <p style="color: #64748b; font-size: 14px;">
                    If you didn't expect this invitation, you can safely ignore this email.
                  </p>
                </div>
                <div class="footer">
                  <p>© 2025 Go-Ads 360°. All rights reserved.</p>
                  <p>Powered by Lovable Cloud</p>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Failed to send email:", await emailResponse.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Portal invite sent successfully",
        magicLink: portalUrl,
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending portal invite:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

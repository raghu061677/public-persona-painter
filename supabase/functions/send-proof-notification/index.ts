import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  campaignId: string;
  assetId: string;
  photoCount: number;
  notificationType: "upload" | "verification";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, assetId, photoCount, notificationType }: NotificationRequest = await req.json();

    console.log(`Processing ${notificationType} notification for campaign ${campaignId}, asset ${assetId}`);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("campaign_name, client_id, client_name, notification_settings")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Check if notifications are enabled
    const settings = campaign.notification_settings || {};
    if (!settings.email_notifications) {
      console.log("Email notifications disabled for this campaign");
      return new Response(
        JSON.stringify({ message: "Email notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (notificationType === "upload" && !settings.notify_on_upload) {
      console.log("Upload notifications disabled");
      return new Response(
        JSON.stringify({ message: "Upload notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (notificationType === "verification" && !settings.notify_on_verification) {
      console.log("Verification notifications disabled");
      return new Response(
        JSON.stringify({ message: "Verification notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fetch asset details
    const { data: asset, error: assetError } = await supabase
      .from("campaign_assets")
      .select("location, city, area")
      .eq("campaign_id", campaignId)
      .eq("asset_id", assetId)
      .single();

    if (assetError || !asset) {
      throw new Error(`Asset not found: ${assetError?.message}`);
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("email, contact_person, name")
      .eq("id", campaign.client_id)
      .single();

    if (clientError || !client || !client.email) {
      throw new Error(`Client email not found: ${clientError?.message}`);
    }

    // Fetch organization settings for branding
    const { data: orgSettings } = await supabase
      .from("organization_settings")
      .select("organization_name")
      .single();

    const organizationName = orgSettings?.organization_name || "Go-Ads 360°";

    // Create simple HTML email
    const uploadDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .detail { margin: 15px 0; padding: 10px; background: white; border-radius: 4px; }
            .label { font-weight: bold; color: #4b5563; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📸 Proof Photos ${notificationType === "upload" ? "Uploaded" : "Verified"}</h1>
            </div>
            <div class="content">
              <p>Dear ${client.contact_person || client.name},</p>
              <p>${photoCount} proof photo${photoCount > 1 ? 's have' : ' has'} been ${notificationType === "upload" ? "uploaded" : "verified"} for your campaign.</p>
              <div class="detail">
                <div><span class="label">Campaign:</span> ${campaign.campaign_name}</div>
                <div><span class="label">Location:</span> ${asset.location}, ${asset.area}, ${asset.city}</div>
                <div><span class="label">Date:</span> ${uploadDate}</div>
              </div>
              <p>You can view all proof photos in your campaign dashboard.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const subject = notificationType === "upload" 
      ? `📸 Proof Photos Uploaded - ${campaign.campaign_name}`
      : `✓ Proof Photos Verified - ${campaign.campaign_name}`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `${organizationName} <onboarding@resend.dev>`,
      to: [client.email],
      subject,
      html,
    });

    if (emailError) {
      console.error("Email sending failed:", emailError);
      
      // Log failed notification
      await supabase.from("operations_notifications").insert({
        campaign_id: campaignId,
        asset_id: assetId,
        notification_type: "email",
        recipient: client.email,
        status: "failed",
        subject,
        error_message: emailError.message,
        metadata: { photoCount, notificationType },
      });

      throw emailError;
    }

    console.log("Email sent successfully:", emailData);

    // Log successful notification
    await supabase.from("operations_notifications").insert({
      campaign_id: campaignId,
      asset_id: assetId,
      notification_type: "email",
      recipient: client.email,
      status: "sent",
      subject,
      message: `${photoCount} proof photos ${notificationType === "upload" ? "uploaded" : "verified"}`,
      sent_at: new Date().toISOString(),
      metadata: { photoCount, notificationType, emailId: emailData.id },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData.id,
        recipient: client.email 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in send-proof-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

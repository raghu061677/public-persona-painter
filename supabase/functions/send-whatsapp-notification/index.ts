import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// WhatsApp Cloud API credentials (to be configured by user)
const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const whatsappPhoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

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

    console.log(`Processing WhatsApp ${notificationType} notification for campaign ${campaignId}, asset ${assetId}`);

    // Check if WhatsApp is configured
    if (!whatsappToken || !whatsappPhoneNumberId) {
      console.log("WhatsApp not configured - skipping");
      return new Response(
        JSON.stringify({ 
          message: "WhatsApp not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

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

    // Check if WhatsApp notifications are enabled
    const settings = campaign.notification_settings || {};
    if (!settings.whatsapp_notifications) {
      console.log("WhatsApp notifications disabled for this campaign");
      return new Response(
        JSON.stringify({ message: "WhatsApp notifications disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("phone, contact_person, name")
      .eq("id", campaign.client_id)
      .single();

    if (clientError || !client || !client.phone) {
      throw new Error(`Client phone not found: ${clientError?.message}`);
    }

    // Fetch asset details
    const { data: asset } = await supabase
      .from("campaign_assets")
      .select("location, city")
      .eq("campaign_id", campaignId)
      .eq("asset_id", assetId)
      .single();

    // Format phone number (remove any non-digits and ensure country code)
    let phoneNumber = client.phone.replace(/\D/g, "");
    if (!phoneNumber.startsWith("91")) {
      phoneNumber = "91" + phoneNumber; // Add India country code
    }

    // Prepare WhatsApp message
    const messageText = notificationType === "upload"
      ? `📸 *Proof Photos Uploaded*\n\nHello ${client.contact_person || client.name},\n\nWe've uploaded ${photoCount} proof photo${photoCount > 1 ? 's' : ''} for your campaign "${campaign.campaign_name}".\n\n*Location:* ${asset?.location}, ${asset?.city}\n\nThe photos are awaiting verification. You'll receive another notification once verified.\n\nThank you!`
      : `✓ *Proof Photos Verified*\n\nHello ${client.contact_person || client.name},\n\n${photoCount} proof photo${photoCount > 1 ? 's' : ''} for "${campaign.campaign_name}" at ${asset?.location}, ${asset?.city} ${photoCount > 1 ? 'have' : 'has'} been verified.\n\nYou can now view them in your client portal.\n\nThank you!`;

    // Send WhatsApp message via WhatsApp Cloud API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: {
            body: messageText,
          },
        }),
      }
    );

    const whatsappData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error("WhatsApp API error:", whatsappData);
      
      // Log failed notification
      await supabase.from("operations_notifications").insert({
        campaign_id: campaignId,
        asset_id: assetId,
        notification_type: "whatsapp",
        recipient: phoneNumber,
        status: "failed",
        message: messageText,
        error_message: JSON.stringify(whatsappData),
        metadata: { photoCount, notificationType },
      });

      throw new Error(`WhatsApp API error: ${JSON.stringify(whatsappData)}`);
    }

    console.log("WhatsApp message sent:", whatsappData);

    // Log successful notification
    await supabase.from("operations_notifications").insert({
      campaign_id: campaignId,
      asset_id: assetId,
      notification_type: "whatsapp",
      recipient: phoneNumber,
      status: "sent",
      message: messageText,
      sent_at: new Date().toISOString(),
      metadata: { 
        photoCount, 
        notificationType, 
        messageId: whatsappData.messages?.[0]?.id 
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: whatsappData.messages?.[0]?.id,
        recipient: phoneNumber 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in send-whatsapp-notification function:", error);
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

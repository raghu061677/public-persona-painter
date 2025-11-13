import { supabase } from "@/integrations/supabase/client";
import { generateProofOfDisplayPPT } from "./generateProofPPT";

/**
 * Check if all campaign assets have verified proofs and auto-generate PPT if enabled
 */
export async function checkAndAutoGeneratePPT(campaignId: string): Promise<boolean> {
  try {
    // Check organization settings
    const { data: settings } = await supabase
      .from("organization_settings")
      .select("auto_generate_ppt_on_completion, notify_manager_on_ppt_generation")
      .limit(1)
      .single();

    if (!settings?.auto_generate_ppt_on_completion) {
      return false; // Auto-generation is disabled
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, campaign_name, assigned_to")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error("Failed to fetch campaign:", campaignError);
      return false;
    }

    // Get all campaign assets
    const { data: assets, error: assetsError } = await supabase
      .from("campaign_assets")
      .select("id, asset_id, status")
      .eq("campaign_id", campaignId);

    if (assetsError || !assets || assets.length === 0) {
      return false; // No assets to check
    }

    // Check if all assets are verified
    const allVerified = assets.every((asset) => asset.status === "Verified");

    if (!allVerified) {
      return false; // Not all assets are verified yet
    }

    // Check if PPT was already generated
    const { data: existingPPT } = await supabase
      .from("operations_notifications")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("notification_type", "ppt_auto_generated")
      .limit(1);

    if (existingPPT && existingPPT.length > 0) {
      return false; // PPT already generated
    }

    // Generate PPT
    await generateProofOfDisplayPPT(campaignId);

    // Send notification if enabled
    if (settings.notify_manager_on_ppt_generation && campaign.assigned_to) {
      await sendPPTGenerationNotification(campaignId, campaign.assigned_to);
    }

    // Log the auto-generation event
    await supabase.from("operations_notifications").insert([{
      asset_id: "",
      campaign_id: campaignId,
      notification_type: "ppt_auto_generated",
      recipient: campaign.assigned_to || "system",
      subject: "Proof of Display PPT Auto-Generated",
      message: `PPT for campaign ${campaign.campaign_name} has been automatically generated as all proofs are verified.`,
      status: "sent",
      sent_at: new Date().toISOString(),
    }]);

    return true;
  } catch (error) {
    console.error("Error in auto-generate PPT:", error);
    return false;
  }
}

/**
 * Send notification to campaign manager about PPT generation
 */
async function sendPPTGenerationNotification(
  campaignId: string,
  managerId: string
): Promise<void> {
  try {
    // Get manager's email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", managerId)
      .single();

    // Get user email from auth
    const { data: authUser } = await supabase.auth.admin.getUserById(managerId);

    if (!authUser?.user?.email) {
      console.warn("Manager email not found, skipping notification");
      return;
    }

    // Get campaign name
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("campaign_name")
      .eq("id", campaignId)
      .single();

    // Insert notification record
    await supabase.from("operations_notifications").insert([{
      asset_id: "",
      campaign_id: campaignId,
      notification_type: "email",
      recipient: authUser.user.email,
      subject: `Proof of Display PPT Ready - ${campaign?.campaign_name || campaignId}`,
      message: `All campaign proofs have been verified and the Proof of Display PowerPoint presentation has been automatically generated. You can now download it from the campaign details page.`,
      status: "pending",
    }]);

    console.log(`PPT generation notification sent to ${authUser.user.email}`);
  } catch (error) {
    console.error("Error sending PPT notification:", error);
    // Don't throw - notification failure shouldn't block the process
  }
}

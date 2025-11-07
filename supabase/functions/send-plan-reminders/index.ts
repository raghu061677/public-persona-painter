import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Running plan reminders check...");

    // Get active reminder settings
    const { data: reminderSettings, error: settingsError } = await supabase
      .from("reminder_settings")
      .select("*")
      .eq("is_active", true);

    if (settingsError) throw settingsError;

    for (const setting of reminderSettings || []) {
      if (setting.reminder_type === 'pending_approval') {
        await sendPendingApprovalReminders(supabase, setting);
      } else if (setting.reminder_type === 'expiring_quotation') {
        await sendExpiringQuotationReminders(supabase, setting);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Reminders processed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error processing reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

async function sendPendingApprovalReminders(supabase: any, setting: any) {
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - setting.days_before);

  // Find pending approvals older than specified days
  const { data: pendingApprovals, error } = await supabase
    .from("plan_approvals")
    .select("*, plans(*)")
    .eq("status", "pending")
    .lt("created_at", daysAgo.toISOString());

  if (error) {
    console.error("Error fetching pending approvals:", error);
    return;
  }

  for (const approval of pendingApprovals || []) {
    // Get users with the required role
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", approval.required_role);

    for (const userRole of userRoles || []) {
      const { data: userData } = await supabase.auth.admin.getUserById(userRole.user_id);
      if (userData?.user?.email) {
        const emailContent = setting.email_template
          .replace('{{plan_name}}', approval.plans.plan_name)
          .replace('{{plan_id}}', approval.plans.id)
          .replace('{{client_name}}', approval.plans.client_name);

        try {
          await resend.emails.send({
            from: "Go-Ads 360° <notifications@resend.dev>",
            to: userData.user.email,
            subject: "Reminder: Pending Plan Approval",
            html: `<p>${emailContent}</p>`,
          });
          console.log(`Reminder sent to ${userData.user.email} for plan ${approval.plans.id}`);
        } catch (emailError) {
          console.error("Error sending reminder email:", emailError);
        }
      }
    }
  }
}

async function sendExpiringQuotationReminders(supabase: any, setting: any) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + setting.days_before);

  // Find quotations expiring soon
  const { data: expiringPlans, error } = await supabase
    .from("plans")
    .select("*")
    .eq("plan_type", "Quotation")
    .eq("status", "Sent")
    .lte("end_date", futureDate.toISOString())
    .gte("end_date", new Date().toISOString());

  if (error) {
    console.error("Error fetching expiring quotations:", error);
    return;
  }

  for (const plan of expiringPlans || []) {
    // Get plan creator
    const { data: userData } = await supabase.auth.admin.getUserById(plan.created_by);
    
    if (userData?.user?.email) {
      const daysRemaining = Math.ceil(
        (new Date(plan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      const emailContent = setting.email_template
        .replace('{{plan_id}}', plan.id)
        .replace('{{client_name}}', plan.client_name)
        .replace('{{days}}', daysRemaining.toString());

      try {
        await resend.emails.send({
          from: "Go-Ads 360° <notifications@resend.dev>",
          to: userData.user.email,
          subject: "Reminder: Quotation Expiring Soon",
          html: `<p>${emailContent}</p>`,
        });
        console.log(`Expiring quotation reminder sent for plan ${plan.id}`);
      } catch (emailError) {
        console.error("Error sending expiring quotation email:", emailError);
      }
    }
  }
}

serve(handler);

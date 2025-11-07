import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  planId: string;
  approvalLevel: string;
  requiredRole: string;
  notificationType: 'approval_request' | 'approval_completed' | 'approval_rejected';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { planId, approvalLevel, requiredRole, notificationType }: ApprovalNotificationRequest = await req.json();

    console.log("Sending approval notification:", { planId, approvalLevel, requiredRole, notificationType });

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*, clients(*)")
      .eq("id", planId)
      .single();

    if (planError) throw planError;

    // Get users with the required role
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, profiles(*)")
      .eq("role", requiredRole);

    if (rolesError) throw rolesError;

    // Get user emails from auth.users
    const emails: string[] = [];
    for (const userRole of userRoles || []) {
      const { data: userData } = await supabase.auth.admin.getUserById(userRole.user_id);
      if (userData?.user?.email) {
        emails.push(userData.user.email);
      }
    }

    if (emails.length === 0) {
      console.log("No approvers found for role:", requiredRole);
      return new Response(
        JSON.stringify({ message: "No approvers found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine email content based on notification type
    let subject = "";
    let htmlContent = "";

    if (notificationType === 'approval_request') {
      subject = `Approval Required: ${plan.plan_name}`;
      htmlContent = `
        <h1>Plan Approval Required</h1>
        <p>A new plan requires your approval:</p>
        <ul>
          <li><strong>Plan ID:</strong> ${plan.id}</li>
          <li><strong>Plan Name:</strong> ${plan.plan_name}</li>
          <li><strong>Client:</strong> ${plan.client_name}</li>
          <li><strong>Amount:</strong> ₹${plan.grand_total?.toLocaleString('en-IN')}</li>
          <li><strong>Approval Level:</strong> ${approvalLevel}</li>
        </ul>
        <p>Please log in to review and approve this plan.</p>
      `;
    } else if (notificationType === 'approval_completed') {
      subject = `Plan Approved: ${plan.plan_name}`;
      htmlContent = `
        <h1>Plan Approved</h1>
        <p>The following plan has been fully approved:</p>
        <ul>
          <li><strong>Plan ID:</strong> ${plan.id}</li>
          <li><strong>Plan Name:</strong> ${plan.plan_name}</li>
          <li><strong>Client:</strong> ${plan.client_name}</li>
          <li><strong>Amount:</strong> ₹${plan.grand_total?.toLocaleString('en-IN')}</li>
        </ul>
        <p>You can now proceed to convert this plan to a campaign.</p>
      `;
    } else {
      subject = `Plan Rejected: ${plan.plan_name}`;
      htmlContent = `
        <h1>Plan Rejected</h1>
        <p>The following plan has been rejected:</p>
        <ul>
          <li><strong>Plan ID:</strong> ${plan.id}</li>
          <li><strong>Plan Name:</strong> ${plan.plan_name}</li>
          <li><strong>Client:</strong> ${plan.client_name}</li>
          <li><strong>Amount:</strong> ₹${plan.grand_total?.toLocaleString('en-IN')}</li>
        </ul>
        <p>Please review the rejection comments and make necessary changes.</p>
      `;
    }

    // Send email to all approvers
    const emailResponse = await resend.emails.send({
      from: "Go-Ads 360° <notifications@resend.dev>",
      to: emails,
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending approval notification:", error);
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

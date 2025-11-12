import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  username: string;
  role: string;
}

const roleResources: Record<string, { title: string; resources: string[] }> = {
  admin: {
    title: 'Administrator',
    resources: [
      'User Management & Permissions',
      'System Settings & Configuration',
      'Analytics & Reporting',
      'Data Export & Import',
    ],
  },
  sales: {
    title: 'Sales',
    resources: [
      'Client Management',
      'Plan Builder & Quotations',
      'Lead Tracking',
      'Revenue Reporting',
    ],
  },
  operations: {
    title: 'Operations',
    resources: [
      'Campaign Management',
      'Mounting Assignments',
      'Proof Upload (Mobile)',
      'Asset Status Tracking',
    ],
  },
  finance: {
    title: 'Finance',
    resources: [
      'Invoice Management',
      'Expense Tracking',
      'Payment Reconciliation',
      'Financial Reports',
    ],
  },
};

const generateWelcomeEmailHTML = (username: string, email: string, role: string, appUrl: string): string => {
  const roleInfo = roleResources[role] || roleResources.sales;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Go-Ads 360°</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 48px;">
          <h1 style="color: #1e40af; font-size: 28px; font-weight: bold; margin: 0 0 32px 0;">
            Welcome to Go-Ads 360°!
          </h1>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Hi ${username},
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 26px; margin: 16px 0;">
            Welcome to Go-Ads 360°, your comprehensive Out-of-Home media management platform. 
            Your account has been created with the role of <strong>${roleInfo.title}</strong>.
          </p>

          <div style="background-color: #f8fafc; padding: 24px; border-radius: 8px; margin: 24px 0;">
            <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">
              Your Account Details
            </h2>
            <p style="color: #333; font-size: 16px; line-height: 26px; margin: 8px 0;">
              <strong>Email:</strong> ${email}<br/>
              <strong>Role:</strong> ${roleInfo.title}
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;"/>

          <div style="margin: 24px 0;">
            <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">
              Key Features You Can Access
            </h2>
            <ul style="margin: 0; padding: 0 0 0 20px;">
              ${roleInfo.resources.map(resource => 
                `<li style="color: #333; font-size: 16px; line-height: 28px; margin-bottom: 8px;">${resource}</li>`
              ).join('')}
            </ul>
          </div>

          <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;"/>

          <div style="margin: 24px 0;">
            <h2 style="color: #333; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">
              Getting Started
            </h2>
            <p style="color: #333; font-size: 16px; line-height: 26px; margin: 8px 0;">
              1. <strong>Login:</strong> Use your email (${email}) and the password you set<br/>
              2. <strong>Dashboard Tour:</strong> Take the guided tour when you first login<br/>
              3. <strong>Explore:</strong> Familiarize yourself with the features available to your role<br/>
              4. <strong>Support:</strong> Contact your administrator if you need any help
            </p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}" 
               style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; 
                      padding: 12px 32px; border-radius: 5px; font-size: 16px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 32px 0;"/>

          <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 12px 0;">
            This is an automated message from Go-Ads 360°. If you have any questions, 
            please contact your system administrator.
          </p>

          <p style="color: #8898aa; font-size: 12px; line-height: 16px; margin: 12px 0;">
            © ${new Date().getFullYear()} Go-Ads 360°. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, username, role }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email, "Role:", role);

    // Get app URL from environment
    const appUrl = "https://yourapp.lovable.app"; // Update this in production

    // Generate HTML email
    const html = generateWelcomeEmailHTML(username, email, role, appUrl);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Go-Ads 360° <onboarding@resend.dev>",
      to: [email],
      subject: `Welcome to Go-Ads 360° - ${role.charAt(0).toUpperCase() + role.slice(1)} Access`,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the onboarding activity
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("user_activity_logs").insert({
      user_id: userId,
      activity_type: "onboarding",
      activity_description: "Welcome email sent",
      metadata: {
        role,
        email_id: emailResponse.data?.id,
      },
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

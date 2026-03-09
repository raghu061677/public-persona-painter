import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_ROLES = ["admin"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    // 1. Auth - get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized – missing token" }),
        { status: 401, headers: respHeaders }
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized – invalid token" }),
        { status: 401, headers: respHeaders }
      );
    }

    // 2. Check role
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: cu } = await svc
      .from("company_users")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single();

    if (!cu || !ALLOWED_ROLES.includes(cu.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden – admin role required" }),
        { status: 403, headers: respHeaders }
      );
    }

    const companyId = cu.company_id;

    // 3. Load alert settings
    const { data: settings } = await svc
      .from("alert_digest_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    const recipients = settings?.recipients_to ?? [];
    if (!recipients.length) {
      return new Response(
        JSON.stringify({ error: "No recipients configured in alert settings" }),
        { status: 400, headers: respHeaders }
      );
    }

    // 4. Load template
    const { data: tpl } = await svc
      .from("alert_email_templates")
      .select("*")
      .eq("template_key", "daily_digest")
      .eq("enabled", true)
      .maybeSingle();

    const dateStr = new Date().toLocaleDateString("en-IN");
    const subject = `[TEST] ${(tpl?.subject_template ?? "GO-ADS | Test Alert – {{date}}").replace(/\{\{date\}\}/g, dateStr)}`;
    const body = (tpl?.body_template ?? "<h1>Test Alert</h1><p>This is a test alert email.</p>")
      .replace(/\{\{date\}\}/g, dateStr)
      .replace(/\{\{digest_html\}\}/g, "<p><em>This is a test – no live data included.</em></p>");

    // 5. Send via Resend REST API
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "Email provider (Resend) API key not configured" }),
        { status: 500, headers: respHeaders }
      );
    }

    const fromName = settings?.sender_name ?? "GO-ADS Alerts";
    const emailPayload: Record<string, unknown> = {
      from: `${fromName} <alerts@go-ads.in>`,
      to: recipients,
      subject,
      html: body,
    };
    if (settings?.recipients_cc?.length) {
      emailPayload.cc = settings.recipients_cc;
    }

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      console.error("[send-alert-test-email] Resend error:", sendData);
      return new Response(
        JSON.stringify({ error: `Email send failed: ${sendData?.message ?? sendData?.error ?? "Unknown error"}` }),
        { status: 502, headers: respHeaders }
      );
    }

    console.log("[send-alert-test-email] Sent:", sendData?.id);
    return new Response(
      JSON.stringify({ success: true, messageId: sendData?.id, recipients }),
      { status: 200, headers: respHeaders }
    );
  } catch (error) {
    console.error("[send-alert-test-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: respHeaders }
    );
  }
});

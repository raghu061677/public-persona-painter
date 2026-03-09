import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4";
import {
  getAuthContext,
  requireRole,
  AuthError,
  getCorsHeaders,
  supabaseServiceClient,
} from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const respHeaders = { ...getCorsHeaders(req), "Content-Type": "application/json" };

  try {
    // 1. Authenticate & authorize – admin roles only
    const ctx = await getAuthContext(req);
    requireRole(ctx, ["admin"]);

    // 2. Load alert digest settings
    const svc = supabaseServiceClient();
    const { data: settings } = await svc
      .from("alert_digest_settings")
      .select("*")
      .eq("company_id", ctx.companyId)
      .maybeSingle();

    const recipients = settings?.recipients_to ?? [];
    if (!recipients.length) {
      return new Response(
        JSON.stringify({ error: "No recipients configured in alert settings" }),
        { status: 400, headers: respHeaders }
      );
    }

    // 3. Load template
    const { data: tpl } = await svc
      .from("alert_email_templates")
      .select("*")
      .eq("template_key", "daily_digest")
      .eq("enabled", true)
      .maybeSingle();

    const subject = (tpl?.subject_template ?? "GO-ADS | Test Alert – {{date}}")
      .replace("{{date}}", new Date().toLocaleDateString("en-IN"));
    const body = (tpl?.body_template ?? "<h1>Test Alert</h1><p>This is a test alert email from GO-ADS.</p>")
      .replace("{{date}}", new Date().toLocaleDateString("en-IN"))
      .replace("{{digest_html}}", "<p><em>This is a test – no live data included.</em></p>");

    // 4. Get email provider
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: "Email provider (Resend) API key not configured" }),
        { status: 500, headers: respHeaders }
      );
    }

    const resend = new Resend(resendKey);
    const fromName = settings?.sender_name ?? "GO-ADS Alerts";
    const fromEmail = "alerts@go-ads.in";

    // 5. Send test email
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      cc: settings?.recipients_cc?.length ? settings.recipients_cc : undefined,
      subject: `[TEST] ${subject}`,
      html: body,
    });

    if (sendError) {
      console.error("[send-alert-test-email] Send failed:", sendError);
      return new Response(
        JSON.stringify({ error: `Email send failed: ${sendError.message}` }),
        { status: 502, headers: respHeaders }
      );
    }

    console.log("[send-alert-test-email] Sent successfully:", sendResult?.id);
    return new Response(
      JSON.stringify({ success: true, messageId: sendResult?.id, recipients }),
      { status: 200, headers: respHeaders }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.statusCode, headers: respHeaders }
      );
    }
    console.error("[send-alert-test-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: respHeaders }
    );
  }
});

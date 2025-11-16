import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user context
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's company
    const { data: companyUser } = await supabaseClient
      .from("company_users")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    const companyId = companyUser?.company_id;

    // Build context-aware system prompt
    let systemPrompt = `You are Go-Ads AI Assistant, an expert in OOH (Out-of-Home) advertising management.
You help users with:
- Finding vacant media assets
- Campaign planning and optimization
- Client management and insights
- Financial reporting and analysis
- Operations tracking

Current user: ${user.email}
Company ID: ${companyId || "N/A"}

Provide clear, actionable responses. When showing data, format it clearly.`;

    // Handle specific actions
    if (action === "vacant_media") {
      const { data: vacantAssets } = await supabaseClient
        .from("media_assets")
        .select("id, location, city, area, media_type, status, card_rate")
        .eq("company_id", companyId)
        .eq("status", "Available")
        .limit(20);

      systemPrompt += `\n\nVacant Media Assets (${vacantAssets?.length || 0}):
${JSON.stringify(vacantAssets, null, 2)}`;
    } else if (action === "campaign_summary") {
      const { data: campaigns } = await supabaseClient
        .from("campaigns")
        .select("id, campaign_name, client_name, status, start_date, end_date, grand_total")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      systemPrompt += `\n\nRecent Campaigns (${campaigns?.length || 0}):
${JSON.stringify(campaigns, null, 2)}`;
    } else if (action === "client_insights") {
      const { data: clients } = await supabaseClient
        .from("clients")
        .select("id, name, company, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(20);

      systemPrompt += `\n\nClients (${clients?.length || 0}):
${JSON.stringify(clients, null, 2)}`;
    } else if (action === "financial_summary") {
      const { data: invoices } = await supabaseClient
        .from("invoices")
        .select("id, client_name, total_amount, status, invoice_date, due_date")
        .eq("company_id", companyId)
        .order("invoice_date", { ascending: false })
        .limit(15);

      systemPrompt += `\n\nRecent Invoices (${invoices?.length || 0}):
${JSON.stringify(invoices, null, 2)}`;
    }

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log AI usage
    await supabaseClient.from("ai_assistant_logs").insert({
      user_id: user.id,
      company_id: companyId,
      query_text: messages[messages.length - 1]?.content || "",
      intent: action || "general",
    });

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

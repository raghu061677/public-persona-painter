import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, companyId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Detect intent using AI
    const startTime = Date.now();
    const intentResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a business intelligence assistant. Analyze the user's question and determine the intent.
Available intents:
- vacant_media: Questions about available/vacant media assets
- pending_invoices: Questions about unpaid or pending invoices
- client_summary: Questions about specific clients or client lists
- campaign_analytics: Questions about campaign performance or stats
- power_bills: Questions about electricity bills and payments
- general: General questions

Respond with ONLY a JSON object: {"intent": "<intent>", "filters": {}}
Extract any filters from the query (city, client_name, date_range, status, etc.)`
          },
          { role: "user", content: message }
        ],
        temperature: 0.3,
      }),
    });

    if (!intentResponse.ok) {
      if (intentResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (intentResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${intentResponse.status}`);
    }

    const intentData = await intentResponse.json();
    const aiResponse = intentData.choices[0].message.content;
    
    let parsedIntent;
    try {
      parsedIntent = JSON.parse(aiResponse);
    } catch {
      parsedIntent = { intent: "general", filters: {} };
    }

    const responseTime = Date.now() - startTime;

    console.log("Detected intent:", parsedIntent);

    // Execute queries based on intent
    let queryResult;
    let responseType = "text";

    switch (parsedIntent.intent) {
      case "vacant_media": {
        let query = supabase
          .from('media_assets')
          .select('id, city, area, location, media_type, dimension, card_rate, status')
          .eq('company_id', companyId)
          .eq('status', 'Available');

        if (parsedIntent.filters.city) {
          query = query.ilike('city', `%${parsedIntent.filters.city}%`);
        }
        if (parsedIntent.filters.media_type) {
          query = query.ilike('media_type', `%${parsedIntent.filters.media_type}%`);
        }

        const { data, error } = await query.limit(20);
        if (error) throw error;

        queryResult = {
          type: "table",
          columns: ["ID", "City", "Area", "Location", "Type", "Size", "Rate"],
          data: data?.map(item => [
            item.id,
            item.city,
            item.area,
            item.location,
            item.media_type,
            item.dimension,
            `₹${item.card_rate?.toLocaleString()}`
          ]) || [],
          summary: `Found ${data?.length || 0} vacant media assets${parsedIntent.filters.city ? ` in ${parsedIntent.filters.city}` : ''}.`
        };
        responseType = "table";
        break;
      }

      case "pending_invoices": {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, client_name, invoice_date, total_amount, balance_due, status')
          .eq('company_id', companyId)
          .in('status', ['Pending', 'Partial'])
          .order('invoice_date', { ascending: false })
          .limit(20);

        if (error) throw error;

        const totalPending = data?.reduce((sum, inv) => sum + (inv.balance_due || 0), 0) || 0;

        queryResult = {
          type: "cards",
          cards: [
            { label: "Total Pending", value: `₹${totalPending.toLocaleString()}`, variant: "warning" },
            { label: "Invoices Count", value: data?.length.toString() || "0", variant: "info" }
          ],
          table: {
            columns: ["Invoice ID", "Client", "Date", "Total", "Balance Due", "Status"],
            data: data?.map(inv => [
              inv.id,
              inv.client_name,
              new Date(inv.invoice_date).toLocaleDateString(),
              `₹${inv.total_amount?.toLocaleString()}`,
              `₹${inv.balance_due?.toLocaleString()}`,
              inv.status
            ]) || []
          },
          summary: `You have ${data?.length || 0} pending invoices totaling ₹${totalPending.toLocaleString()}.`
        };
        responseType = "cards";
        break;
      }

      case "client_summary": {
        const { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('id, name, company, city, created_at')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (clientError) throw clientError;

        const { count: campaignCount } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId);

        const { data: revenue } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('company_id', companyId);

        const totalRevenue = revenue?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

        queryResult = {
          type: "cards",
          cards: [
            { label: "Total Clients", value: clients?.length.toString() || "0", variant: "success" },
            { label: "Active Campaigns", value: campaignCount?.toString() || "0", variant: "info" },
            { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}`, variant: "success" }
          ],
          table: {
            columns: ["Client ID", "Name", "Company", "City", "Registered"],
            data: clients?.map(c => [
              c.id,
              c.name,
              c.company || "—",
              c.city || "—",
              new Date(c.created_at).toLocaleDateString()
            ]) || []
          },
          summary: `You have ${clients?.length || 0} clients with ${campaignCount || 0} active campaigns.`
        };
        responseType = "cards";
        break;
      }

      case "campaign_analytics": {
        const { data, error } = await supabase
          .from('campaigns')
          .select('id, campaign_name, status, total_assets, grand_total, start_date, end_date')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        const statusCounts = data?.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const totalRevenue = data?.reduce((sum, c) => sum + (c.grand_total || 0), 0) || 0;

        queryResult = {
          type: "cards",
          cards: [
            { label: "Total Campaigns", value: data?.length.toString() || "0", variant: "info" },
            { label: "Running", value: statusCounts['Running']?.toString() || "0", variant: "success" },
            { label: "Total Value", value: `₹${totalRevenue.toLocaleString()}`, variant: "success" }
          ],
          table: {
            columns: ["Campaign", "Status", "Assets", "Value", "Period"],
            data: data?.map(c => [
              c.campaign_name,
              c.status,
              c.total_assets?.toString() || "0",
              `₹${c.grand_total?.toLocaleString()}`,
              `${new Date(c.start_date).toLocaleDateString()} - ${new Date(c.end_date).toLocaleDateString()}`
            ]) || []
          },
          summary: `${data?.length || 0} campaigns with total value of ₹${totalRevenue.toLocaleString()}.`
        };
        responseType = "cards";
        break;
      }

      case "power_bills": {
        const { data, error } = await supabase
          .from('asset_power_bills')
          .select('asset_id, bill_month, total_due, paid, payment_status')
          .order('bill_month', { ascending: false })
          .limit(20);

        if (error) throw error;

        const unpaidBills = data?.filter(b => !b.paid) || [];
        const totalUnpaid = unpaidBills.reduce((sum, b) => sum + (b.total_due || 0), 0);

        queryResult = {
          type: "cards",
          cards: [
            { label: "Unpaid Bills", value: unpaidBills.length.toString(), variant: "warning" },
            { label: "Total Unpaid", value: `₹${totalUnpaid.toLocaleString()}`, variant: "warning" }
          ],
          table: {
            columns: ["Asset ID", "Bill Month", "Amount", "Status"],
            data: data?.slice(0, 10).map(b => [
              b.asset_id,
              new Date(b.bill_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              `₹${b.total_due?.toLocaleString()}`,
              b.paid ? "Paid" : "Unpaid"
            ]) || []
          },
          summary: `${unpaidBills.length} unpaid bills totaling ₹${totalUnpaid.toLocaleString()}.`
        };
        responseType = "cards";
        break;
      }

      default: {
        // General query - use AI to answer
        const generalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: "You are a helpful business assistant for an OOH media management platform called Go-Ads 360°. Provide clear, concise answers."
              },
              { role: "user", content: message }
            ],
          }),
        });

        const generalData = await generalResponse.json();
        queryResult = {
          type: "text",
          text: generalData.choices[0].message.content,
          summary: ""
        };
        responseType = "text";
      }
    }

    // Log the query
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('ai_assistant_logs').insert({
        user_id: userData.user.id,
        company_id: companyId,
        query_text: message,
        intent: parsedIntent.intent,
        response_type: responseType,
        response_time_ms: responseTime
      });
    }

    return new Response(
      JSON.stringify({ 
        responseType,
        data: queryResult,
        intent: parsedIntent.intent
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in business-ai-assistant:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

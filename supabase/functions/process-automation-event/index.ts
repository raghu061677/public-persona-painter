import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

interface AutomationEvent {
  trigger_event: string;
  entity_type: string;
  entity_id: string;
  entity_data?: Record<string, unknown>;
  company_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event: AutomationEvent = await req.json();
    const { trigger_event, entity_type, entity_id, entity_data, company_id } = event;

    if (!trigger_event || !entity_type || !entity_id || !company_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find matching active rules
    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("company_id", company_id)
      .eq("trigger_event", trigger_event)
      .eq("is_active", true);

    if (rulesError) {
      console.error("Error fetching rules:", rulesError);
      return new Response(JSON.stringify({ error: "Failed to fetch rules" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ rule_id: string; status: string; error?: string }> = [];

    for (const rule of rules || []) {
      const startTime = Date.now();
      let status = "success";
      let errorMessage: string | null = null;

      try {
        // Evaluate conditions
        const conditions = rule.conditions as Record<string, unknown>;
        if (conditions && Object.keys(conditions).length > 0) {
          const conditionsMet = evaluateConditions(conditions, entity_data || {});
          if (!conditionsMet) {
            status = "skipped";
            continue;
          }
        }

        // Execute actions
        const actions = (rule.actions as Array<{ type: string; config: Record<string, unknown> }>) || [];
        for (const action of actions) {
          await executeAction(supabase, action, {
            entity_type,
            entity_id,
            entity_data: entity_data || {},
            company_id,
            rule_name: rule.rule_name,
          });
        }
      } catch (err) {
        status = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Rule ${rule.id} failed:`, err);
      }

      const executionTime = Date.now() - startTime;

      // Log execution
      await supabase.from("automation_logs").insert({
        rule_id: rule.id,
        entity_type,
        entity_id,
        status,
        execution_time: executionTime,
        error_message: errorMessage,
      });

      results.push({ rule_id: rule.id, status, error: errorMessage || undefined });
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Automation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function evaluateConditions(
  conditions: Record<string, unknown>,
  entityData: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (typeof value === "object" && value !== null) {
      const op = value as Record<string, unknown>;
      if ("equals" in op && entityData[key] !== op.equals) return false;
      if ("not_equals" in op && entityData[key] === op.not_equals) return false;
      if ("greater_than" in op && Number(entityData[key]) <= Number(op.greater_than)) return false;
      if ("less_than" in op && Number(entityData[key]) >= Number(op.less_than)) return false;
      if ("contains" in op && !String(entityData[key]).includes(String(op.contains))) return false;
    } else {
      if (entityData[key] !== value) return false;
    }
  }
  return true;
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  action: { type: string; config: Record<string, unknown> },
  context: {
    entity_type: string;
    entity_id: string;
    entity_data: Record<string, unknown>;
    company_id: string;
    rule_name: string;
  }
) {
  switch (action.type) {
    case "send_email": {
      // Use existing send-tenant-email function
      const { config } = action;
      const templateKey = config.template_key as string;
      
      if (templateKey) {
        // Fetch template
        const { data: template } = await supabase
          .from("email_templates")
          .select("*")
          .eq("company_id", context.company_id)
          .eq("template_key", templateKey)
          .eq("is_active", true)
          .single();

        if (template) {
          console.log(`Would send email using template: ${templateKey}`);
        }
      }
      break;
    }

    case "notify_user": {
      const { config } = action;
      await supabase.from("notifications").insert({
        user_id: config.user_id || null,
        type: "automation",
        title: replaceVars(String(config.title || context.rule_name), context.entity_data),
        message: replaceVars(String(config.message || ""), context.entity_data),
        resource_type: context.entity_type,
        resource_id: context.entity_id,
      });
      break;
    }

    case "create_task": {
      const { config } = action;
      await supabase.from("notifications").insert({
        user_id: config.assignee as string,
        type: "task",
        title: replaceVars(String(config.title || ""), context.entity_data),
        message: replaceVars(String(config.message || ""), context.entity_data),
        resource_type: context.entity_type,
        resource_id: context.entity_id,
      });
      break;
    }

    case "send_client_notification": {
      console.log(`Client notification for ${context.entity_type}/${context.entity_id}`);
      break;
    }

    default:
      console.warn(`Unknown action type: ${action.type}`);
  }
}

function replaceVars(text: string, data: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] || key));
}

/**
 * Seeds default email templates for a company if they don't exist yet.
 */
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEMPLATES } from "./defaultTemplates";

export async function seedDefaultTemplates(companyId: string): Promise<{ seeded: number; existing: number }> {
  // Get existing template keys for this company
  const { data: existing } = await supabase
    .from("email_templates" as any)
    .select("template_key")
    .eq("company_id", companyId);

  const existingKeys = new Set((existing || []).map((t: any) => t.template_key));
  
  const toInsert = DEFAULT_TEMPLATES
    .filter(t => !existingKeys.has(t.template_key))
    .map(t => ({
      company_id: companyId,
      template_key: t.template_key,
      template_name: t.template_name,
      category: t.category,
      audience: t.audience,
      trigger_event: t.trigger_event,
      send_mode: t.send_mode,
      description: t.description,
      subject_template: t.subject_template,
      html_template: t.html_template,
      text_template: null,
      is_active: true,
      is_system: true,
      channel: 'email',
      version: 1,
      variables_json: null,
    }));

  if (toInsert.length > 0) {
    await supabase.from("email_templates" as any).insert(toInsert as any);
  }

  return { seeded: toInsert.length, existing: existingKeys.size };
}

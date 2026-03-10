import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SettingsCard, SectionHeader, InfoAlert, SettingsContentWrapper } from "@/components/settings/zoho-style";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Eye, Pencil, Plus, FileText } from "lucide-react";
import { useSettingsReadOnly } from "@/components/rbac/SettingsPageWrapper";

const DEFAULT_TEMPLATES = [
  { key: "portal_invite", name: "Portal Invite", subject: "You've been invited to {{company_name}} Portal", variables: ["client_name", "company_name", "portal_link"] },
  { key: "campaign_created", name: "Campaign Created", subject: "New Campaign: {{campaign_name}}", variables: ["client_name", "campaign_name", "start_date", "end_date"] },
  { key: "campaign_ending_alert", name: "Campaign Ending Alert", subject: "Campaign {{campaign_name}} ending soon", variables: ["client_name", "campaign_name", "end_date"] },
  { key: "plan_approval_request", name: "Plan Approval Request", subject: "Plan {{plan_name}} requires approval", variables: ["approver_name", "plan_name", "amount_due", "portal_link"] },
  { key: "plan_approved", name: "Plan Approved", subject: "Plan {{plan_name}} has been approved", variables: ["client_name", "plan_name", "amount_due"] },
  { key: "plan_converted_campaign", name: "Plan Converted to Campaign", subject: "Campaign created from {{plan_name}}", variables: ["client_name", "plan_name", "campaign_name", "start_date"] },
  { key: "payment_reminder", name: "Payment Reminder", subject: "Payment Reminder - Invoice {{invoice_number}}", variables: ["client_name", "invoice_number", "amount_due", "portal_link"] },
  { key: "campaign_proof_uploaded", name: "Campaign Proof Uploaded", subject: "New proof photos for {{campaign_name}}", variables: ["client_name", "campaign_name", "proof_link"] },
  { key: "campaign_completed", name: "Campaign Completed", subject: "Campaign {{campaign_name}} completed", variables: ["client_name", "campaign_name", "start_date", "end_date", "portal_link"] },
];

interface TemplateData {
  id?: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_body: string;
  text_body: string;
  variables: string[];
  is_active: boolean;
}

export default function EmailTemplateEditor() {
  const { company } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    loadTemplates();
  }, [company]);

  const loadTemplates = async () => {
    if (!company) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates" as any)
        .select("*")
        .eq("company_id", company.id);

      if (error) throw error;

      const savedTemplates = (data as any[] || []).map((t: any) => ({
        id: t.id,
        template_key: t.template_key,
        template_name: t.template_name,
        subject: t.subject,
        html_body: t.html_body || "",
        text_body: t.text_body || "",
        variables: t.variables || [],
        is_active: t.is_active,
      }));

      // Merge with defaults - show defaults that aren't yet saved
      const merged = DEFAULT_TEMPLATES.map(def => {
        const saved = savedTemplates.find((s: any) => s.template_key === def.key);
        if (saved) return saved;
        return {
          template_key: def.key,
          template_name: def.name,
          subject: def.subject,
          html_body: generateDefaultHtml(def.key, def.subject),
          text_body: "",
          variables: def.variables,
          is_active: true,
        };
      });

      setTemplates(merged);
    } catch (err: any) {
      toast({ title: "Failed to load templates", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultHtml = (key: string, subject: string) => {
    return `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: #1e40af; padding: 30px; text-align: center; color: white;">
      <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
    </div>
    <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
      <p>Hi {{client_name}},</p>
      <p>Your email content goes here.</p>
    </div>
    <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
      © ${new Date().getFullYear()} {{company_name}}. All rights reserved.
    </div>
  </div>
</body>
</html>`;
  };

  const handleSaveTemplate = async () => {
    if (!company || !editingTemplate) return;
    setSaving(true);
    try {
      const payload = {
        company_id: company.id,
        template_key: editingTemplate.template_key,
        template_name: editingTemplate.template_name,
        subject: editingTemplate.subject,
        html_body: editingTemplate.html_body,
        text_body: editingTemplate.text_body,
        variables: editingTemplate.variables,
        is_active: editingTemplate.is_active,
        updated_at: new Date().toISOString(),
      };

      if (editingTemplate.id) {
        const { error } = await supabase
          .from("email_templates" as any)
          .update(payload as any)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("email_templates" as any)
          .insert(payload as any);
        if (error) throw error;
      }

      toast({ title: "Template Saved" });
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderPreview = (html: string) => {
    let preview = html;
    preview = preview.replace(/\{\{client_name\}\}/g, "John Doe");
    preview = preview.replace(/\{\{company_name\}\}/g, company?.name || "Go-Ads 360°");
    preview = preview.replace(/\{\{campaign_name\}\}/g, "Summer Campaign 2026");
    preview = preview.replace(/\{\{invoice_number\}\}/g, "INV-2026-0042");
    preview = preview.replace(/\{\{amount_due\}\}/g, "₹1,50,000");
    preview = preview.replace(/\{\{portal_link\}\}/g, "#");
    preview = preview.replace(/\{\{proof_link\}\}/g, "#");
    preview = preview.replace(/\{\{plan_name\}\}/g, "Q1 Media Plan");
    preview = preview.replace(/\{\{start_date\}\}/g, "01/04/2026");
    preview = preview.replace(/\{\{end_date\}\}/g, "30/06/2026");
    preview = preview.replace(/\{\{approver_name\}\}/g, "Admin User");
    return preview;
  };

  if (loading) {
    return (
      <SettingsContentWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsContentWrapper>
    );
  }

  return (
    <SettingsContentWrapper>
      <div>
        <h1 className="text-2xl font-semibold mb-1">Email Templates</h1>
        <p className="text-sm text-muted-foreground">
          Customize the email templates sent for various events. Use {"{{variable_name}}"} syntax for dynamic content.
        </p>
      </div>

      <InfoAlert>
        <strong>Template Variables:</strong> Use variables like {"{{client_name}}"}, {"{{campaign_name}}"}, {"{{invoice_number}}"}, {"{{amount_due}}"}, {"{{portal_link}}"}, {"{{start_date}}"}, {"{{end_date}}"} in your templates. They will be replaced with actual values when emails are sent.
      </InfoAlert>

      <SettingsCard>
        <SectionHeader title="Email Templates" description="Manage templates for automated notifications" />

        <div className="space-y-3">
          {templates.map(template => (
            <div
              key={template.template_key}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">{template.template_name}</h3>
                  {template.id ? (
                    <Badge variant="default" className="text-xs">Customized</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{template.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={template.is_active}
                  onCheckedChange={async (checked) => {
                    if (template.id && company) {
                      await supabase
                        .from("email_templates" as any)
                        .update({ is_active: checked } as any)
                        .eq("id", template.id);
                      loadTemplates();
                    }
                  }}
                />
                <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(template)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditingTemplate({ ...template })}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editingTemplate?.template_name}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>Available Variables</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {editingTemplate.variables.map(v => (
                    <Badge key={v} variant="outline" className="cursor-pointer text-xs"
                      onClick={() => {
                        setEditingTemplate({
                          ...editingTemplate,
                          html_body: editingTemplate.html_body + `{{${v}}}`,
                        });
                      }}
                    >
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label>HTML Body</Label>
                <Textarea
                  value={editingTemplate.html_body}
                  onChange={e => setEditingTemplate({ ...editingTemplate, html_body: e.target.value })}
                  rows={16}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <Label>Plain Text Body (optional fallback)</Label>
                <Textarea
                  value={editingTemplate.text_body}
                  onChange={e => setEditingTemplate({ ...editingTemplate, text_body: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.template_name}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="border rounded-lg overflow-hidden">
              <div
                className="p-0"
                dangerouslySetInnerHTML={{ __html: renderPreview(previewTemplate.html_body) }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SettingsContentWrapper>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Edit, Eye, RotateCcw, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsContentWrapper, SectionHeader } from "@/components/settings/zoho-style";
import { ScrollArea } from "@/components/ui/scroll-area";

const TEMPLATE_VARIABLES = [
  "{{company_name}}", "{{client_name}}", "{{campaign_name}}", "{{campaign_id}}",
  "{{plan_id}}", "{{invoice_number}}", "{{amount_due}}", "{{due_date}}",
  "{{portal_link}}", "{{proof_link}}", "{{start_date}}", "{{end_date}}",
  "{{asset_count}}", "{{support_email}}",
];

interface Template {
  id: string;
  template_key: string;
  template_name: string;
  subject_template: string;
  html_template: string;
  text_template: string | null;
  variables_json: any;
  is_system: boolean;
  is_active: boolean;
  version: number;
  channel: string;
}

export default function EmailTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("template_key");
    if (data) setTemplates(data as Template[]);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        template_name: editTemplate.template_name,
        subject_template: editTemplate.subject_template,
        html_template: editTemplate.html_template,
        text_template: editTemplate.text_template,
        is_active: editTemplate.is_active,
        version: editTemplate.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editTemplate.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Template updated" });
      setEditTemplate(null);
      fetchTemplates();
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("email_templates").update({ is_active: active }).eq("id", id);
    fetchTemplates();
  };

  const insertVariable = (variable: string) => {
    if (!editTemplate) return;
    setEditTemplate({ ...editTemplate, html_template: editTemplate.html_template + variable });
  };

  const renderPreview = (html: string) => {
    let preview = html;
    const sampleData: Record<string, string> = {
      "{{company_name}}": "Matrix Network Solutions",
      "{{client_name}}": "ABC Outdoor Ads",
      "{{campaign_name}}": "Summer Campaign 2026",
      "{{campaign_id}}": "CMP-202603-001",
      "{{plan_id}}": "PLAN-202603-001",
      "{{invoice_number}}": "INV-2025-26-0042",
      "{{amount_due}}": "₹1,50,000",
      "{{due_date}}": "2026-04-15",
      "{{portal_link}}": "#",
      "{{proof_link}}": "#",
      "{{start_date}}": "2026-03-01",
      "{{end_date}}": "2026-05-31",
      "{{asset_count}}": "12",
      "{{support_email}}": "support@go-ads.in",
    };
    Object.entries(sampleData).forEach(([k, v]) => {
      preview = preview.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
    });
    return preview;
  };

  return (
    <SettingsContentWrapper>
      <SectionHeader title="Email Templates" description="Manage email templates used across the platform. Use variables like {{client_name}} for dynamic content." />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.template_name}</p>
                    <p className="text-xs text-muted-foreground">{t.template_key} · v{t.version}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                    <Switch checked={t.is_active} onCheckedChange={(v) => toggleActive(t.id, v)} />
                    <Button variant="ghost" size="sm" onClick={() => { setPreviewHtml(renderPreview(t.html_template)); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditTemplate(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Template: {editTemplate?.template_key}</DialogTitle></DialogHeader>
          {editTemplate && (
            <Tabs defaultValue="edit">
              <TabsList><TabsTrigger value="edit">Edit</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="vars">Variables</TabsTrigger></TabsList>
              <TabsContent value="edit" className="space-y-3 mt-3">
                <div><Label>Template Name</Label><Input value={editTemplate.template_name} onChange={e => setEditTemplate({ ...editTemplate, template_name: e.target.value })} /></div>
                <div><Label>Subject</Label><Input value={editTemplate.subject_template} onChange={e => setEditTemplate({ ...editTemplate, subject_template: e.target.value })} /></div>
                <div><Label>HTML Body</Label><Textarea rows={12} value={editTemplate.html_template} onChange={e => setEditTemplate({ ...editTemplate, html_template: e.target.value })} className="font-mono text-xs" /></div>
                <div><Label>Plain Text (fallback)</Label><Textarea rows={4} value={editTemplate.text_template || ""} onChange={e => setEditTemplate({ ...editTemplate, text_template: e.target.value })} /></div>
                <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Template</Button>
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <Card><CardContent className="p-4">
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(editTemplate.html_template) }} />
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="vars" className="mt-3">
                <p className="text-sm text-muted-foreground mb-3">Click to insert into the HTML body:</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATE_VARIABLES.map(v => (
                    <Button key={v} variant="outline" size="sm" onClick={() => insertVariable(v)}>
                      <Copy className="h-3 w-3 mr-1" />{v}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Template Preview</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div dangerouslySetInnerHTML={{ __html: previewHtml || "" }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </SettingsContentWrapper>
  );
}

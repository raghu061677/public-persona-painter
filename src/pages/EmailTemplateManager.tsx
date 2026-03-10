import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Edit, Eye, Copy, Search, Filter, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsContentWrapper, SectionHeader, SettingsCard } from "@/components/settings/zoho-style";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TEMPLATE_VARIABLES, getSamplePayload, replaceVariables } from "@/services/notifications/emailRenderer";
import { CATEGORY_LABELS, AUDIENCE_LABELS, SEND_MODE_LABELS } from "@/services/notifications/emailEvents";
import { seedDefaultTemplates } from "@/services/notifications/seedTemplates";
import { format } from "date-fns";

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
  category: string | null;
  audience: string | null;
  trigger_event: string | null;
  send_mode: string | null;
  description: string | null;
  updated_at: string | null;
}

const categoryColor = (c: string | null) => {
  const map: Record<string, string> = {
    plan: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    campaign: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    operations: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    finance: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    system: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return map[c || ''] || 'bg-muted text-muted-foreground';
};

const sendModeColor = (m: string | null) => {
  const map: Record<string, string> = {
    auto: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    confirm: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };
  return map[m || ''] || 'bg-muted text-muted-foreground';
};

export default function EmailTemplateManager() {
  const { toast } = useToast();
  const { company } = useCompany();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAudience, setFilterAudience] = useState("all");
  const [filterSendMode, setFilterSendMode] = useState("all");
  const [filterEnabled, setFilterEnabled] = useState("all");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("email_templates" as any)
      .select("*") as any)
      .order("category", { ascending: true })
      .order("template_key");
    if (data) setTemplates(data as Template[]);
    setLoading(false);
  };

  const handleSeedTemplates = async () => {
    if (!company?.id) return;
    setSeeding(true);
    try {
      const result = await seedDefaultTemplates(company.id);
      toast({ title: `${result.seeded} templates seeded`, description: `${result.existing} already existed` });
      fetchTemplates();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Seed failed", description: err.message });
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!editTemplate) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates" as any)
      .update({
        template_name: editTemplate.template_name,
        subject_template: editTemplate.subject_template,
        html_template: editTemplate.html_template,
        text_template: editTemplate.text_template,
        is_active: editTemplate.is_active,
        send_mode: editTemplate.send_mode,
        description: editTemplate.description,
        version: (editTemplate.version || 0) + 1,
        updated_at: new Date().toISOString(),
      } as any)
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
    await supabase.from("email_templates" as any).update({ is_active: active } as any).eq("id", id);
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, is_active: active } : t));
  };

  const renderPreview = (html: string) => replaceVariables(html, getSamplePayload());

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (search && !t.template_name.toLowerCase().includes(search.toLowerCase()) && !t.template_key.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterAudience !== "all" && t.audience !== filterAudience) return false;
      if (filterSendMode !== "all" && t.send_mode !== filterSendMode) return false;
      if (filterEnabled === "enabled" && !t.is_active) return false;
      if (filterEnabled === "disabled" && t.is_active) return false;
      return true;
    });
  }, [templates, search, filterCategory, filterAudience, filterSendMode, filterEnabled]);

  // Group variables by category for the variable helper
  const variableGroups = useMemo(() => {
    const groups: Record<string, typeof TEMPLATE_VARIABLES> = {};
    TEMPLATE_VARIABLES.forEach(v => {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push(v);
    });
    return groups;
  }, []);

  return (
    <SettingsContentWrapper>
      <div className="flex items-center justify-between">
        <SectionHeader title="Email Templates" description="Manage notification templates for all business events. Use {{variable}} syntax for dynamic content." />
        <Button onClick={handleSeedTemplates} disabled={seeding} variant="outline" size="sm">
          {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Seed Default Templates
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAudience} onValueChange={setFilterAudience}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Audience" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSendMode} onValueChange={setFilterSendMode}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Send Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            {Object.entries(SEND_MODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEnabled} onValueChange={setFilterEnabled}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <SettingsCard title="No Templates Found" description="No templates match your filters. Try adjusting the filters or seed default templates." />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Send Mode</TableHead>
                <TableHead className="text-center">Enabled</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{t.template_name}</p>
                      <p className="text-xs text-muted-foreground">{t.template_key}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className={categoryColor(t.category)}>{CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS] || t.category || '—'}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{AUDIENCE_LABELS[t.audience as keyof typeof AUDIENCE_LABELS] || t.audience || '—'}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className={sendModeColor(t.send_mode)}>{SEND_MODE_LABELS[t.send_mode as keyof typeof SEND_MODE_LABELS] || t.send_mode || '—'}</Badge></TableCell>
                  <TableCell className="text-center">
                    <Switch checked={t.is_active} onCheckedChange={v => toggleActive(t.id, v)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {t.updated_at ? format(new Date(t.updated_at), "dd MMM yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(renderPreview(t.html_template))}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditTemplate(t)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">{filtered.length} of {templates.length} templates shown</p>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={() => setEditTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Template: {editTemplate?.template_name}</DialogTitle></DialogHeader>
          {editTemplate && (
            <Tabs defaultValue="edit">
              <TabsList><TabsTrigger value="edit">Edit</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="vars">Variables</TabsTrigger></TabsList>
              <TabsContent value="edit" className="space-y-4 mt-3">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Template Name</Label><Input value={editTemplate.template_name} onChange={e => setEditTemplate({ ...editTemplate, template_name: e.target.value })} /></div>
                  <div>
                    <Label>Send Mode</Label>
                    <Select value={editTemplate.send_mode || 'auto'} onValueChange={v => setEditTemplate({ ...editTemplate, send_mode: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SEND_MODE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Input value={editTemplate.description || ''} onChange={e => setEditTemplate({ ...editTemplate, description: e.target.value })} /></div>
                <div><Label>Subject</Label><Input value={editTemplate.subject_template} onChange={e => setEditTemplate({ ...editTemplate, subject_template: e.target.value })} /></div>
                <div><Label>HTML Body</Label><Textarea rows={14} value={editTemplate.html_template} onChange={e => setEditTemplate({ ...editTemplate, html_template: e.target.value })} className="font-mono text-xs" /></div>
                <div><Label>Plain Text (fallback)</Label><Textarea rows={3} value={editTemplate.text_template || ""} onChange={e => setEditTemplate({ ...editTemplate, text_template: e.target.value })} /></div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={editTemplate.is_active} onCheckedChange={v => setEditTemplate({ ...editTemplate, is_active: v })} />
                    <Label>Enabled</Label>
                  </div>
                  <div className="flex-1" />
                  <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Template</Button>
                </div>
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="bg-muted/50 rounded-lg p-3 mb-3">
                  <Label className="text-xs text-muted-foreground">Subject Preview</Label>
                  <p className="text-sm font-medium mt-1">{replaceVariables(editTemplate.subject_template, getSamplePayload())}</p>
                </div>
                <div className="border rounded-lg overflow-hidden bg-white max-h-[50vh] overflow-y-auto">
                  <div className="p-4" dangerouslySetInnerHTML={{ __html: renderPreview(editTemplate.html_template) }} />
                </div>
              </TabsContent>
              <TabsContent value="vars" className="mt-3">
                <p className="text-sm text-muted-foreground mb-4">Click a variable to copy it. Use <code className="bg-muted px-1 rounded">{"{{variable_name}}"}</code> in subject or body.</p>
                <ScrollArea className="h-[50vh]">
                  {Object.entries(variableGroups).map(([cat, vars]) => (
                    <div key={cat} className="mb-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{cat}</h4>
                      <div className="flex flex-wrap gap-2">
                        {vars.map(v => (
                          <Button key={v.key} variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(`{{${v.key}}}`);
                            toast({ title: "Copied", description: `{{${v.key}}}` });
                          }}>
                            <Copy className="h-3 w-3 mr-1" />{`{{${v.key}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>Template Preview (Sample Data)</DialogTitle></DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div dangerouslySetInnerHTML={{ __html: previewHtml || "" }} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </SettingsContentWrapper>
  );
}

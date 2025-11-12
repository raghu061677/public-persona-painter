import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, ExternalLink } from "lucide-react";
import { formatDate } from "@/utils/plans";

interface CampaignTemplatesDialogProps {
  onSelectTemplate?: (template: any) => void;
}

export function CampaignTemplatesDialog({ onSelectTemplate }: CampaignTemplatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // New template form
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [clientType, setClientType] = useState("");

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaign_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("campaign_templates")
        .insert({
          template_name: templateName,
          description,
          duration_days: durationDays,
          client_type: clientType,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });

      // Reset form
      setTemplateName("");
      setDescription("");
      setDurationDays(30);
      setClientType("");
      
      // Refresh templates
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from("campaign_templates")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      fetchTemplates();
    }
  };

  const handleUseTemplate = async (template: any) => {
    // Increment usage count
    await supabase
      .from("campaign_templates")
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq("id", template.id);

    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Campaign Templates</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="browse" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse Templates</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 overflow-auto space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground font-medium mb-2">No templates yet</p>
                <p className="text-sm text-muted-foreground">Create your first template to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{template.template_name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {template.description || "No description"}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{template.duration_days || 30} days</Badge>
                          {template.client_type && (
                            <Badge variant="secondary">{template.client_type}</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Used {template.usage_count || 0} times</span>
                          <span>{formatDate(template.created_at)}</span>
                        </div>

                        <Button
                          onClick={() => handleUseTemplate(template)}
                          className="w-full"
                          size="sm"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., 30-Day Standard Campaign"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this template"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Input
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value)}
                    placeholder="e.g., Corporate, Retail"
                  />
                </div>
              </div>

              <Button onClick={handleSaveTemplate} disabled={saving} className="w-full">
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

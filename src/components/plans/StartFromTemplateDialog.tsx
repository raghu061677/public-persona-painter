import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Play, TrendingUp, Loader2 } from "lucide-react";

interface Template {
  id: string;
  template_name: string;
  description: string | null;
  plan_type: string | null;
  duration_days: number | null;
  gst_percent: number | null;
  default_client_id: string | null;
  tags: string[] | null;
  is_active: boolean;
  usage_count?: number;
}

interface StartFromTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: any, items: any[]) => void;
}

export function StartFromTemplateDialog({
  open,
  onOpenChange,
  onSelectTemplate,
}: StartFromTemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: templatesData, error } = await supabase
        .from("plan_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch usage counts
      const templateIds = templatesData?.map(t => t.id) || [];
      if (templateIds.length > 0) {
        const { data: usageData } = await supabase
          .from("plan_template_usage")
          .select("template_id")
          .in("template_id", templateIds);

        const usageCounts = usageData?.reduce((acc: Record<string, number>, curr: any) => {
          acc[curr.template_id] = (acc[curr.template_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const enrichedTemplates = templatesData?.map(t => ({
          ...t,
          usage_count: usageCounts?.[t.id] || 0,
        }));

        setTemplates(enrichedTemplates || []);
      } else {
        setTemplates(templatesData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      setLoading(true);

      // Fetch template items with asset details
      const { data: items, error } = await supabase
        .from("plan_template_items")
        .select(`
          *,
          media_assets (*)
        `)
        .eq("template_id", template.id)
        .order("position_index");

      if (error) throw error;

      // Track usage
      const { data: { user } } = await supabase.auth.getUser();
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .single();

      if (companyUser) {
        await supabase.from("plan_template_usage").insert({
          company_id: companyUser.company_id,
          template_id: template.id,
          used_by: user?.id,
        });
      }

      onSelectTemplate(template, items || []);
      onOpenChange(false);

      toast({
        title: "Template Loaded",
        description: `Template "${template.template_name}" loaded successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Start from Template</DialogTitle>
          <DialogDescription>
            Select a template to quickly create a new plan with pre-configured assets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates found
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{template.template_name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {template.description || "No description"}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {template.plan_type && (
                            <Badge variant="outline" className="text-xs">
                              {template.plan_type}
                            </Badge>
                          )}
                          {template.duration_days && (
                            <Badge variant="secondary" className="text-xs">
                              {template.duration_days} days
                            </Badge>
                          )}
                          {template.gst_percent && (
                            <Badge variant="secondary" className="text-xs">
                              GST {template.gst_percent}%
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>{template.usage_count || 0} uses</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        size="sm"
                        disabled={loading}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

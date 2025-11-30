import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, MoreVertical, Eye, Edit, Archive, Play, TrendingUp } from "lucide-react";

interface Template {
  id: string;
  template_name: string;
  description: string | null;
  tags: string[] | null;
  is_active: boolean;
  default_client_id: string | null;
  created_at: string;
  usage_count?: number;
}

export default function PlanTemplatesListNew() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: templatesData, error } = await supabase
        .from("plan_templates")
        .select("*")
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

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("plan_templates")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Template ${!currentActive ? "activated" : "archived"}`,
      });

      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      // Fetch template items
      const { data: items, error } = await supabase
        .from("plan_template_items")
        .select("*")
        .eq("template_id", template.id)
        .order("position_index");

      if (error) throw error;

      // Store in session storage for PlanNew to pick up
      sessionStorage.setItem("planTemplateNew", JSON.stringify({
        template_id: template.id,
        template_name: template.template_name,
        default_client_id: template.default_client_id,
        template_items: items,
      }));

      // Navigate to new plan page
      navigate("/admin/plans/new");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);
  const mostUsed = templates.reduce((max, t) =>
    (t.usage_count || 0) > (max?.usage_count || 0) ? t : max
  , templates[0]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Plan Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage reusable plan templates
            </p>
          </div>
          <Button onClick={() => navigate("/admin/plan-templates/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Templates</CardDescription>
              <CardTitle className="text-3xl">{templates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Uses</CardDescription>
              <CardTitle className="text-3xl">{totalUsage}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Most Used</CardDescription>
              <CardTitle className="text-lg truncate">
                {mostUsed?.template_name || "N/A"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

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

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No templates found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.template_name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {template.description || "No description"}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleUseTemplate(template)}>
                          <Play className="mr-2 h-4 w-4" />
                          Use in New Plan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/admin/plan-templates/${template.id}/preview`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/admin/plan-templates/${template.id}`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(template.id, template.is_active)}>
                          <Archive className="mr-2 h-4 w-4" />
                          {template.is_active ? "Archive" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Tags */}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Status & Usage */}
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant={template.is_active ? "default" : "outline"}>
                        {template.is_active ? "Active" : "Archived"}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>{template.usage_count || 0} uses</span>
                      </div>
                    </div>

                    {/* Use Template Button */}
                    <Button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full"
                      variant="outline"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
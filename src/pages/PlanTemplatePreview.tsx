import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Play } from "lucide-react";

interface TemplateWithItems {
  id: string;
  template_name: string;
  description: string | null;
  tags: string[] | null;
  is_active: boolean;
  default_client_id: string | null;
  items: Array<{
    asset_id: string;
    default_base_rent: number;
    default_printing_charges: number;
    default_mounting_charges: number;
    media_assets: any;
  }>;
  clients: any;
}

export default function PlanTemplatePreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [template, setTemplate] = useState<TemplateWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("plan_templates")
        .select(`
          *,
          clients (
            id,
            name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Fetch items with asset details
      const { data: items, error: itemsError } = await supabase
        .from("plan_template_items")
        .select(`
          *,
          media_assets (
            id,
            asset_code,
            city,
            area,
            location,
            dimensions,
            illumination_type,
            media_type
          )
        `)
        .eq("template_id", id)
        .order("position_index");

      if (itemsError) throw itemsError;

      setTemplate({ ...data, items: (items as any) || [] });
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

  const handleUseTemplate = () => {
    if (!template) return;

    // Store in session storage for PlanNew to pick up
    sessionStorage.setItem("planTemplate", JSON.stringify({
      template_id: template.id,
      template_name: template.template_name,
      default_client_id: template.default_client_id,
      template_items: template.items,
    }));

    navigate("/admin/plans/new");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">Loading template...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="text-center py-12">Template not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-7xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/plan-templates")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{template.template_name}</h1>
            <p className="text-muted-foreground mt-1">
              {template.description || "No description"}
            </p>
          </div>
          <Button onClick={handleUseTemplate}>
            <Play className="mr-2 h-4 w-4" />
            Use in New Plan
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {template.clients && (
              <div>
                <p className="text-sm text-muted-foreground">Default Client</p>
                <p className="font-medium">{template.clients.name}</p>
              </div>
            )}

            {template.tags && template.tags.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={template.is_active ? "default" : "outline"}>
                {template.is_active ? "Active" : "Archived"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Included Assets ({template.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {template.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {item.media_assets?.asset_code || item.asset_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.media_assets?.city} - {item.media_assets?.area} - {item.media_assets?.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.media_assets?.dimensions} | {item.media_assets?.illumination_type} | {item.media_assets?.media_type}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Base: ₹{item.default_base_rent?.toLocaleString()}</p>
                    <p className="text-muted-foreground">
                      Printing: ₹{item.default_printing_charges?.toLocaleString()}
                    </p>
                    <p className="text-muted-foreground">
                      Mounting: ₹{item.default_mounting_charges?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
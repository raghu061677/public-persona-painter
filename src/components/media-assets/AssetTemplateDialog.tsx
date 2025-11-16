import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AssetTemplate {
  id: string;
  name: string;
  media_type: string;
  category: string;
  dimension: string;
  card_rate: number;
  printing_charges: number;
  mounting_charges: number;
  created_at: string;
}

interface AssetTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Partial<AssetTemplate>) => void;
}

export function AssetTemplateDialog({ open, onOpenChange, onSelectTemplate }: AssetTemplateDialogProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AssetTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    media_type: "",
    category: "standard",
    dimension: "",
    card_rate: 0,
    printing_charges: 0,
    mounting_charges: 0,
  });

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // For now, use local storage. In production, store in database
      const stored = localStorage.getItem('asset_templates');
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name || !newTemplate.media_type) {
      toast({
        title: "Missing fields",
        description: "Please provide template name and media type",
        variant: "destructive",
      });
      return;
    }

    try {
      const template: AssetTemplate = {
        id: crypto.randomUUID(),
        ...newTemplate,
        created_at: new Date().toISOString(),
      };

      const updated = [...templates, template];
      localStorage.setItem('asset_templates', JSON.stringify(updated));
      setTemplates(updated);

      toast({
        title: "Template saved",
        description: "Asset template has been created",
      });

      setNewTemplate({
        name: "",
        media_type: "",
        category: "standard",
        dimension: "",
        card_rate: 0,
        printing_charges: 0,
        mounting_charges: 0,
      });
    } catch (error: any) {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    localStorage.setItem('asset_templates', JSON.stringify(updated));
    setTemplates(updated);
    
    toast({
      title: "Template deleted",
    });
  };

  const selectTemplate = (template: AssetTemplate) => {
    onSelectTemplate({
      media_type: template.media_type,
      category: template.category,
      dimension: template.dimension,
      card_rate: template.card_rate,
      printing_charges: template.printing_charges,
      mounting_charges: template.mounting_charges,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asset Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create New Template */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold mb-4">Create New Template</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Standard Bus Shelter"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Media Type *</Label>
                  <Input
                    placeholder="e.g., Bus Shelter"
                    value={newTemplate.media_type}
                    onChange={(e) => setNewTemplate({ ...newTemplate, media_type: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Dimension</Label>
                  <Input
                    placeholder="e.g., 10x5 ft"
                    value={newTemplate.dimension}
                    onChange={(e) => setNewTemplate({ ...newTemplate, dimension: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Card Rate (₹)</Label>
                  <Input
                    type="number"
                    value={newTemplate.card_rate}
                    onChange={(e) => setNewTemplate({ ...newTemplate, card_rate: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Printing Charges (₹)</Label>
                  <Input
                    type="number"
                    value={newTemplate.printing_charges}
                    onChange={(e) => setNewTemplate({ ...newTemplate, printing_charges: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Mounting Charges (₹)</Label>
                  <Input
                    type="number"
                    value={newTemplate.mounting_charges}
                    onChange={(e) => setNewTemplate({ ...newTemplate, mounting_charges: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button onClick={saveTemplate} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </CardContent>
          </Card>

          {/* Existing Templates */}
          <div className="space-y-3">
            <h3 className="font-semibold">Saved Templates ({templates.length})</h3>
            
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-muted-foreground p-8">
                No templates saved yet
              </p>
            ) : (
              <div className="grid gap-3">
                {templates.map(template => (
                  <Card key={template.id} className="hover:bg-accent/50 cursor-pointer transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1" onClick={() => selectTemplate(template)}>
                          <p className="font-medium">{template.name}</p>
                          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{template.media_type}</span>
                            <span>{template.dimension}</span>
                            <span>₹{template.card_rate.toLocaleString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

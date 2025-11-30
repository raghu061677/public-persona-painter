import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planType: string;
  durationDays: number;
  gstPercent: number;
  notes?: string;
  planItems: any[];
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  planId,
  planType,
  durationDays,
  gstPercent,
  notes,
  planItems,
}: SaveAsTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare template items (remove plan-specific fields)
      const templateItems = planItems.map(item => ({
        asset_id: item.asset_id,
        location: item.location,
        city: item.city,
        area: item.area,
        media_type: item.media_type,
        dimensions: item.dimensions,
        card_rate: item.card_rate,
        base_rate: item.base_rent,  // plan_items.base_rent is correct (stores base cost)
        sales_price: item.sales_price,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        printing_charges: item.printing_charges,
        mounting_charges: item.mounting_charges,
      }));

      const { error } = await supabase
        .from('plan_templates')
        .insert({
          template_name: templateName.trim(),
          description: description.trim() || null,
          plan_type: planType as any,
          duration_days: durationDays,
          gst_percent: gstPercent,
          notes: notes || null,
          template_items: templateItems as any,
          created_by: user.id,
        } as any);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template saved successfully",
      });

      onOpenChange(false);
      setTemplateName("");
      setDescription("");
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save as Template
          </DialogTitle>
          <DialogDescription>
            Create a reusable template from this plan configuration. You can use it to quickly create similar plans in the future.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Standard City Campaign"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Template will include:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{planItems.length} selected assets with pricing</li>
              <li>Plan type: {planType}</li>
              <li>Duration: {durationDays} days</li>
              <li>GST: {gstPercent}%</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
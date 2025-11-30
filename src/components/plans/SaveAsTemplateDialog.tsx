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

      // Get current company ID
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!companyUser?.company_id) {
        throw new Error("No active company association found");
      }

      // Insert template
      const { data: template, error: templateError } = await supabase
        .from('plan_templates')
        .insert({
          company_id: companyUser.company_id,
          template_name: templateName.trim(),
          description: description.trim() || null,
          plan_type: planType,
          duration_days: durationDays,
          gst_percent: gstPercent,
          notes: notes || null,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Insert template items
      if (template && planItems && planItems.length > 0) {
        const itemsPayload = planItems.map((item, index) => ({
          company_id: companyUser.company_id,
          template_id: template.id,
          asset_id: item.asset_id,
          position_index: index,
          default_base_rent: item.base_rent || item.sales_price || 0,
          default_printing_charges: item.printing_charges || 0,
          default_mounting_charges: item.mounting_charges || 0,
        }));

        const { error: itemsError } = await supabase
          .from("plan_template_items")
          .insert(itemsPayload);

        if (itemsError) {
          console.error("Error saving template items:", itemsError);
          // Continue anyway - template was saved
        }
      }

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
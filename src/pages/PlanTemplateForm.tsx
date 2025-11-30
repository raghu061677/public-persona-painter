import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X } from "lucide-react";
import { AssetSelectionTable } from "@/components/plans/AssetSelectionTable";

export default function PlanTemplateForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [assetPricing, setAssetPricing] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    template_name: "",
    description: "",
    default_client_id: "",
    plan_type: "Quotation",
    duration_days: 30,
    gst_percent: 18,
    notes: "",
    tags: [] as string[],
    is_active: true,
  });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    fetchClients();
    fetchAvailableAssets();
    if (isEditMode) {
      fetchTemplate();
    }
  }, [id]);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data || []);
  };

  const fetchAvailableAssets = async () => {
    const { data } = await supabase
      .from("media_assets")
      .select("*")
      .order("city", { ascending: true });
    setAvailableAssets(data || []);
  };

  const fetchTemplate = async () => {
    if (!id) return;

    try {
      const { data: template, error: templateError } = await supabase
        .from("plan_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (templateError) throw templateError;

      setFormData({
        template_name: (template as any).template_name,
        description: (template as any).description || "",
        default_client_id: (template as any).default_client_id || "",
        plan_type: (template as any).plan_type || "Quotation",
        duration_days: (template as any).duration_days || 30,
        gst_percent: (template as any).gst_percent || 18,
        notes: (template as any).notes || "",
        tags: (template as any).tags || [],
        is_active: (template as any).is_active,
      });

      // Fetch template items
      const { data: items, error: itemsError } = await supabase
        .from("plan_template_items")
        .select("*")
        .eq("template_id", id);

      if (itemsError) throw itemsError;

      const assetIds = new Set((items as any[] || []).map((item: any) => item.asset_id));
      setSelectedAssets(assetIds);

      const pricing: Record<string, any> = {};
      (items as any[] || []).forEach((item: any) => {
        pricing[item.asset_id] = {
          default_base_rent: item.default_base_rent || 0,
          default_printing_charges: item.default_printing_charges || 0,
          default_mounting_charges: item.default_mounting_charges || 0,
        };
      });
      setAssetPricing(pricing);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleAssetSelection = (assetId: string, asset: any) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
      const newPricing = { ...assetPricing };
      delete newPricing[assetId];
      setAssetPricing(newPricing);
    } else {
      newSelected.add(assetId);
      setAssetPricing(prev => ({
        ...prev,
        [assetId]: {
          default_base_rent: asset.card_rate || 0,
          default_printing_charges: asset.printing_charges || 0,
          default_mounting_charges: asset.mounting_charges || 0,
        },
      }));
    }
    setSelectedAssets(newSelected);
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.template_name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssets.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!companyUser?.company_id) {
        throw new Error("No active company association found");
      }

      let templateId = id;

      if (isEditMode) {
        // Update existing template
        const { error: updateError } = await supabase
          .from("plan_templates")
          .update({
            template_name: formData.template_name,
            description: formData.description || null,
            default_client_id: formData.default_client_id || null,
            plan_type: formData.plan_type,
            duration_days: formData.duration_days,
            gst_percent: formData.gst_percent,
            notes: formData.notes || null,
            tags: formData.tags,
            is_active: formData.is_active,
          })
          .eq("id", id);

        if (updateError) throw updateError;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from("plan_template_items")
          .delete()
          .eq("template_id", id);

        if (deleteError) throw deleteError;
      } else {
        // Create new template
        const { data: newTemplate, error: insertError } = await supabase
          .from("plan_templates")
          .insert({
            company_id: companyUser.company_id,
            template_name: formData.template_name,
            description: formData.description || null,
            default_client_id: formData.default_client_id || null,
            plan_type: formData.plan_type,
            duration_days: formData.duration_days,
            gst_percent: formData.gst_percent,
            notes: formData.notes || null,
            tags: formData.tags,
            is_active: formData.is_active,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        templateId = newTemplate.id;
      }

      // Insert template items
      const items = Array.from(selectedAssets).map((assetId, index) => {
        const pricing = assetPricing[assetId];
        return {
          company_id: companyUser.company_id,
          template_id: templateId,
          asset_id: assetId,
          position_index: index,
          default_base_rent: pricing?.default_base_rent || 0,
          default_printing_charges: pricing?.default_printing_charges || 0,
          default_mounting_charges: pricing?.default_mounting_charges || 0,
        };
      });

      const { error: itemsError } = await supabase
        .from("plan_template_items")
        .insert(items as any);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: `Template ${isEditMode ? "updated" : "created"} successfully`,
      });

      navigate("/admin/plan-templates");
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

        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Edit Template" : "Create New Template"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? "Update template details and assets" : "Define a reusable plan template"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
                  placeholder="e.g., Standard Hyderabad Package"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this template..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Default Client (Optional)</Label>
                <Select
                  value={formData.default_client_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, default_client_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Plan Type</Label>
                  <Select
                    value={formData.plan_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, plan_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quotation">Quotation</SelectItem>
                      <SelectItem value="Proposal">Proposal</SelectItem>
                      <SelectItem value="Estimate">Estimate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 30 }))}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>GST %</Label>
                  <Input
                    type="number"
                    value={formData.gst_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, gst_percent: parseFloat(e.target.value) || 18 }))}
                    step="0.01"
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or instructions..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag..."
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.tags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(index)}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetSelectionTable
                assets={availableAssets}
                selectedIds={selectedAssets}
                onSelect={toggleAssetSelection}
              />
              {selectedAssets.size > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  {selectedAssets.size} asset{selectedAssets.size > 1 ? "s" : ""} selected
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/plan-templates")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditMode ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}